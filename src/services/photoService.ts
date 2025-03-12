const API_BASE_URL = 'https://moriai.sakura.ne.jp/rustoneback/api';

// サーバー連携のためのインターフェース
export interface PhotoMetadata {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

// 署名データのインターフェース
export interface SignatureData {
  signature: string;
  imageHash: string;  // サーバー側では image_hash となる
  challenge: string;
  timestamp: number;
  wallet_address: string;  // 必須フィールド
}

export const photoService = {
  async savePhotoLocally(photoData: string): Promise<string> {
    try {
      // Base64文字列からデータURLであることを確認
      const isDataUrl = photoData.startsWith('data:');
      
      // Blobに変換
      let blob;
      if (isDataUrl) {
        // data:image/jpeg;base64,... 形式の場合、直接Blobに変換
        const byteString = atob(photoData.split(',')[1]);
        const mimeType = photoData.split(',')[0].split(':')[1].split(';')[0];
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        
        blob = new Blob([arrayBuffer], { type: mimeType });
      } else {
        // 既にURLの場合は、そのURLからBlobを取得
        const response = await fetch(photoData);
        blob = await response.blob();
      }
      
      // Blobからダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // タイムスタンプを含むファイル名を生成
      const fileName = `photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      link.download = fileName;
      
      // リンクをクリックしてダウンロードを開始
      document.body.appendChild(link);
      link.click();
      
      // クリーンアップ
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return fileName; // 成功時にファイル名を返す
    } catch (error) {
      console.error('Error saving photo locally:', error);
      throw error;
    }
    
  },


  async uploadPhoto(photoData: string, signatureData?: SignatureData): Promise<PhotoMetadata> {
    // デバッグ出力を追加
    console.log('uploadPhoto called with:', { 
      photoDataExists: !!photoData,
      signatureDataExists: !!signatureData 
    });
    
    if (signatureData) {
      console.log('SignatureData details:', {
        signature: signatureData.signature ? `${signatureData.signature.slice(0, 10)}...` : 'missing',
        imageHash: signatureData.imageHash ? `${signatureData.imageHash.slice(0, 10)}...` : 'missing',
        challenge: signatureData.challenge ? signatureData.challenge : 'missing',
        timestamp: signatureData.timestamp ? signatureData.timestamp : 'missing',
        wallet_address: signatureData.wallet_address ? `${signatureData.wallet_address.slice(0, 10)}...` : 'missing'
      });
    }
    
    try {
      // Base64データからBlobを作成
      const base64Data = photoData.split(',')[1];
      const mimeType = photoData.split(',')[0].split(':')[1].split(';')[0];
      
      // Base64データのバリデーション
      if (!base64Data || !mimeType) {
        console.error('Base64 validation failed:', { base64Exists: !!base64Data, mimeType });
        throw new Error('無効な画像データです');
      }

      // 画像タイプの確認
      if (!mimeType.startsWith('image/')) {
        console.error('Invalid mime type:', { mimeType });
        throw new Error('アップロードできるのは画像ファイルのみです');
      }

      const blob = await fetch(photoData).then(res => res.blob());
      console.log('Blob created:', { 
        size: `${(blob.size / 1024).toFixed(2)} KB`, 
        type: blob.type 
      });
      
      // ファイルサイズチェック（10MB制限）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (blob.size > maxSize) {
        console.error('File size too large:', { size: blob.size, maxSize });
        throw new Error('画像サイズが大きすぎます（上限：10MB）');
      }
      
      // ファイル名を生成
      const fileName = `photo_${Date.now()}.${mimeType.split('/')[1]}`;
      console.log('Generated filename:', fileName);
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('photo', blob, fileName);

      // 署名データがある場合は追加
      if (signatureData) {
        // 署名関連の必須フィールドを確認
        if (!signatureData.signature) {
          console.error('Missing signature in signatureData');
          throw new Error('署名データが必要です');
        }
        
        if (!signatureData.imageHash) {
          console.error('Missing imageHash in signatureData');
          throw new Error('画像ハッシュが必要です');
        }
        
        if (!signatureData.wallet_address) {
          console.error('Missing wallet_address in signatureData');
          throw new Error('ウォレットアドレスが必要です');
        }
        
        formData.append('signature', signatureData.signature);
        formData.append('imageHash', signatureData.imageHash);
        formData.append('challenge', signatureData.challenge);
        formData.append('timestamp', signatureData.timestamp.toString());
        formData.append('wallet_address', signatureData.wallet_address);
      }

      // リクエストのURLとデータをログ出力
      console.log('Uploading to:', `${API_BASE_URL}/photos`);
      console.log('Form data keys:', [...formData.keys()]);

      // タイムアウト付きのfetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        console.log('Starting fetch request...');
        const response = await fetch(`${API_BASE_URL}/photos`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
          },
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeout); // タイムアウトをクリア
        console.log('Fetch response received:', { 
          status: response.status, 
          statusText: response.statusText, 
          ok: response.ok 
        });

        if (!response.ok) {
          let errorMessage = 'アップロードに失敗しました。';
          
          try {
            const errorData = await response.json();
            console.error('Server error response:', errorData);
            if (errorData?.message) {
              errorMessage = errorData.message;
            } else {
              // HTTPステータスコードに基づくエラーメッセージ
              switch (response.status) {
                case 400:
                  errorMessage = '無効なリクエストです。画像データを確認してください。';
                  break;
                case 401:
                  errorMessage = '認証エラーが発生しました。再度ログインしてください。';
                  break;
                case 403:
                  errorMessage = 'アクセスが拒否されました。';
                  break;
                case 404:
                  errorMessage = 'APIエンドポイントが見つかりません。サーバー設定を確認してください。';
                  break;
                case 413:
                  errorMessage = '画像サイズが大きすぎます。より小さいサイズの画像を使用してください。';
                  break;
                case 415:
                  errorMessage = '対応していない画像形式です。';
                  break;
                case 500:
                  errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。';
                  break;
                case 503:
                  errorMessage = 'サービスが一時的に利用できません。しばらく待ってから再度お試しください。';
                  break;
                default:
                  errorMessage = `エラーが発生しました（${response.status}）。しばらく待ってから再度お試しください。`;
              }
            }
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (!data) {
          console.error('Empty response from server');
          throw new Error('サーバーからの応答が不正です');
        }

        console.log('Upload successful with response:', data);
        return data;
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('リクエストがタイムアウトしました。ネットワーク状態を確認して、再度お試しください。');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      
      // ネットワークエラーの処理
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      }
      
      // その他のエラー
      if (error instanceof Error) {
        throw new Error(`写真のアップロードに失敗しました：${error.message}`);
      }
      
      throw new Error('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  },

  async getPhotos(): Promise<PhotoMetadata[]> {
    console.log('getPhotos called');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト
      
      try {
        console.log('Fetching photos from:', `${API_BASE_URL}/photos`);
        const response = await fetch(`${API_BASE_URL}/photos`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        console.log('Photos response received:', { 
          status: response.status, 
          ok: response.ok 
        });
        
        if (!response.ok) {
          throw new Error(`写真の取得に失敗しました（${response.status}）`);
        }
        
        const data = await response.json();
        console.log(`Received ${data?.length || 0} photos`);
        return data;
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw new Error('リクエストがタイムアウトしました。ネットワーク状態を確認してください。');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
  },

  async deletePhoto(id: number): Promise<void> {
    console.log('deletePhoto called for ID:', id);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト
      
      try {
        console.log('Deleting photo at:', `${API_BASE_URL}/photos/${id}`);
        const response = await fetch(`${API_BASE_URL}/photos/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        console.log('Delete response received:', { 
          status: response.status, 
          ok: response.ok 
        });
        
        if (!response.ok) {
          throw new Error(`写真の削除に失敗しました（${response.status}）`);
        }
        console.log('Photo deleted successfully');
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw new Error('リクエストがタイムアウトしました。ネットワーク状態を確認してください。');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  },
  
  // 診断用のテスト関数
  testUpload: async (photoData: string, account?: string): Promise<void> => {
    try {
      console.log('======= TEST UPLOAD FUNCTION =======');
      console.log('ウォレット状態:', { connected: !!account, address: account || 'not connected' });
      
      // 署名なしアップロードをテスト
      console.log('1. 署名なしアップロードをテスト...');
      try {
        await photoService.uploadPhoto(photoData);
        console.log('✅ 署名なしアップロード成功');
      } catch (error) {
        console.error('❌ 署名なしアップロード失敗:', error);
      }
      
      // ウォレット接続確認
      if (!account) {
        console.log('⚠️ 署名付きアップロードにはウォレット接続が必要です');
        console.log('======= TEST COMPLETED WITH WARNINGS =======');
        return;
      }
      
      // 署名付きアップロードをテスト
      console.log('2. 署名付きアップロードをテスト...');
      try {
        await photoService.uploadPhoto(photoData, {
          wallet_address: account,
          signature: 'test_signature',
          imageHash: 'test_hash',
          challenge: 'test_challenge',
          timestamp: Date.now()
        });
        console.log('✅ 署名付きアップロード成功');
      } catch (error) {
        console.error('❌ 署名付きアップロード失敗:', error);
      }
      
      console.log('======= TEST COMPLETED =======');
    } catch (error) {
      console.error('テスト全体でのエラー:', error);
      console.log('======= TEST FAILED =======');
    }
  }
};