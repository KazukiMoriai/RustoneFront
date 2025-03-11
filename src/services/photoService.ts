import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// 将来的なサーバー連携のためのインターフェースは残しておく
export interface PhotoMetadata {
  id: number;
  filename: string;
  filepath: string;
  size: number;
  created_at: string;
  updated_at: string;
  description?: string;
  category?: string;
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

  async uploadPhoto(photoData: string, metadata?: { description?: string; category?: string }): Promise<PhotoMetadata> {
    try {
      // Base64データからBlobを作成
      const base64Data = photoData.split(',')[1];
      const blob = await fetch(photoData).then(res => res.blob());
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('image', blob, `photo_${Date.now()}.jpg`);
      
      // メタデータがあれば追加
      if (metadata?.description) {
        formData.append('description', metadata.description);
      }
      if (metadata?.category) {
        formData.append('category', metadata.category);
      }
      
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
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