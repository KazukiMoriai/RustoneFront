import axios from 'axios';

const API_BASE_URL = 'https://moriai.sakura.ne.jp/api';

// 将来的なサーバー連携のためのインターフェースは残しておく
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
      const blob = await fetch(photoData).then(res => res.blob());
      
      // ファイル名を生成
      const fileName = `photo_${Date.now()}.${mimeType.split('/')[1]}`;
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('image', blob, fileName);
      formData.append('mime_type', mimeType);
      formData.append('file_size', blob.size.toString());
      
      const response = await axios.post(`${API_BASE_URL}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 10000,
        withCredentials: true,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      if (!response.data) {
        throw new Error('サーバーからの応答が空です');
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: error.config
        });

        if (error.code === 'ECONNABORTED') {
          throw new Error('接続がタイムアウトしました。ネットワーク状態を確認してください。');
        }
        if (error.response) {
          // サーバーからのエラーレスポンス
          const status = error.response.status;
          const errorData = error.response.data;
          
          console.error('Server Error Response:', errorData);
          
          switch (status) {
            case 400:
              throw new Error(`無効なリクエストです：${errorData?.message || '画像データを確認してください。'}`);
            case 401:
              throw new Error('認証エラーが発生しました。');
            case 413:
              throw new Error('画像サイズが大きすぎます。');
            case 500:
              throw new Error(`サーバーエラーが発生しました：${errorData?.message || 'しばらく待ってから再度お試しください。'}`);
            default:
              throw new Error(`エラーが発生しました（${status}）：${errorData?.message || 'しばらく待ってから再度お試しください。'}`);
          }
        } else if (error.request) {
          // リクエストは送信されたがレスポンスがない
          console.error('Request made but no response received:', {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          });
          throw new Error('サーバーに接続できません。ネットワーク状態を確認してください。');
        }
      }
      // その他のエラー
      console.error('Unexpected Error:', error);
      throw new Error('予期せぬエラーが発生しました。もう一度お試しください。');
    }
  },

  async getPhotos(): Promise<PhotoMetadata[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/photos`);
      return response.data;
    } catch (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
  },

  async deletePhoto(id: number): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/photos/${id}`);
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
};