import axios from 'axios';

// 将来的なサーバー連携のためのインターフェースは残しておく
export interface PhotoMetadata {
  id: number;
  filename: string;
  filepath: string;
  size: number;
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
  }
};