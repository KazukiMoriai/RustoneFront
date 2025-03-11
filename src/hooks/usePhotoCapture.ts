import { useState, useCallback } from 'react';
import { photoService } from '../services/photoService';

interface UsePhotoCaptureReturn {
  imgSrc: string | null;
  isSaving: boolean;
  error: string | null;
  capture: (imageSrc: string) => void;
  retake: () => void;
  savePhoto: () => Promise<void>;
}

export const usePhotoCapture = (): UsePhotoCaptureReturn => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback((imageSrc: string) => {
    setImgSrc(imageSrc);
    setError(null);
  }, []);

  const retake = useCallback(() => {
    setImgSrc(null);
    setError(null);
  }, []);

  const savePhoto = async () => {
    if (!imgSrc) return;

    setIsSaving(true);
    setError(null);

    try {
      await Promise.resolve(photoService.savePhotoLocally(imgSrc));
      setImgSrc(null);
    } catch (err) {
      setError('写真の保存中にエラーが発生しました。もう一度お試しください。');
      console.error('Error saving photo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    imgSrc,
    isSaving,
    error,
    capture,
    retake,
    savePhoto
  };
}; 