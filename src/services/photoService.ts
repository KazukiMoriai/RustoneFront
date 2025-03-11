import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface PhotoMetadata {
  id: number;
  filename: string;
  filepath: string;
  size: number;
  created_at: string;
  updated_at: string;
}

export const photoService = {
  savePhotoLocally(photoData: string): void {
    try {
      // Base64データからBlobを作成
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: 'image/jpeg' });
      
      // ダウンロードリンクを作成
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
    } catch (error) {
      console.error('Error saving photo locally:', error);
      throw error;
    }
  },

  async savePhoto(photoData: string): Promise<PhotoMetadata> {
    try {
      // Base64データからBlobを作成
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      const blob = await fetch(photoData).then(res => res.blob());
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      
      const response = await axios.post(`${API_BASE_URL}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error saving photo:', error);
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