import { useState, useCallback } from 'react';
import { photoService } from '../services/photoService';

interface SignatureData {
  signature: string;
  imageHash: string;
  challenge: string;
  timestamp: number;
}

interface UsePhotoCaptureReturn {
  imgSrc: string | null;
  isSaving: boolean;
  error: string | null;
  capture: (imageSrc: string) => void;
  retake: () => void;
  savePhoto: (signatureData?: SignatureData) => Promise<void>;
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

  const savePhoto = async (signatureData?: SignatureData) => {
    if (!imgSrc) return;

    setIsSaving(true);
    setError(null);

    try {
      await photoService.uploadPhoto(imgSrc, signatureData);
      setImgSrc(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('写真のアップロード中にエラーが発生しました。もう一度お試しください。');
      }
      console.error('Error uploading photo:', err);
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