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

  async uploadPhoto(photoData: string): Promise<PhotoMetadata> {
    try {
      // Base64データからBlobを作成
      const base64Data = photoData.split(',')[1];
      const mimeType = photoData.split(',')[0].split(':')[1].split(';')[0];
      
      // Base64データのバリデーション
      if (!base64Data || !mimeType) {
        throw new Error('無効な画像データです');
      }

      // 画像タイプの確認
      if (!mimeType.startsWith('image/')) {
        throw new Error('アップロードできるのは画像ファイルのみです');
      }

      const blob = await fetch(photoData).then(res => res.blob());
      
      // ファイルサイズチェック（10MB制限）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (blob.size > maxSize) {
        throw new Error('画像サイズが大きすぎます（上限：10MB）');
      }
      
      // ファイル名を生成
      const fileName = `photo_${Date.now()}.${mimeType.split('/')[1]}`;
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('photo', blob, fileName);

      // タイムアウト付きのfetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30秒でタイムアウト

      try {
        const response = await fetch(`${API_BASE_URL}/photos`, {
          method: 'POST',
          // CORSエラーの可能性を排除するため、必要ない場合はcredentialsを省略
          // credentials: 'include',
          headers: {
            'Accept': 'application/json',
            // 必要に応じて認証ヘッダーを追加
            // 'Authorization': `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeout); // タイムアウトをクリア

        if (!response.ok) {
          let errorMessage = 'アップロードに失敗しました';
          
          try {
            const errorData = await response.json();
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
          throw new Error('サーバーからの応答が不正です');
        }

        return data;
      } catch (fetchError) {
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
    try {
      // axiosからfetchに変更
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト
      
      try {
        const response = await fetch(`${API_BASE_URL}/photos`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            // 必要に応じて認証ヘッダーを追加
            // 'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`写真の取得に失敗しました（${response.status}）`);
        }
        
        return await response.json();
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
    try {
      // axiosからfetchに変更
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト
      
      try {
        const response = await fetch(`${API_BASE_URL}/photos/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            // 必要に応じて認証ヘッダーを追加
            // 'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`写真の削除に失敗しました（${response.status}）`);
        }
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
  }
};