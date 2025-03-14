import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button, Box, Container, Paper, CircularProgress, Alert, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { useWeb3 } from '../hooks/useWeb3';
import { hashImage, createSignMessage } from '../utils/crypto';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const WalletAddress = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
}));

const Camera: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const { imgSrc, isSaving, error: photoError, capture, retake, savePhoto } = usePhotoCapture();
  const { 
    account, 
    isConnecting, 
    error: web3Error, 
    connect, 
    disconnect, 
    signMessage,
    storeImageData 
  } = useWeb3();
  
  const [isSigning, setIsSigning] = useState(false);
  const [isBlockchainSaving, setIsBlockchainSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      capture(imageSrc);
    }
  };

  const handleSaveWithSignature = async () => {
    if (!imgSrc || !account) {
      console.error("前提条件エラー:", { hasImage: !!imgSrc, hasAccount: !!account, account });
      setErrorInfo("画像またはウォレット接続がありません");
      return;
    }
  
    setIsSigning(true);
    setErrorInfo(null);
    
    try {
      console.log("処理開始 - アカウント情報:", { account, accountType: typeof account });
      
      // 画像をハッシュ化
      const imageHash = await hashImage(imgSrc);
      console.log("画像ハッシュ化完了:", { imageHash });
  
      // タイムスタンプ
      const timestamp = Math.floor(Date.now() / 1000);
      
      // 署名用メッセージを作成
      const message = createSignMessage(imageHash, timestamp.toString());
      console.log("署名メッセージ作成:", { message });
  
      // メッセージに署名
      const signature = await signMessage(message);
      console.log("署名取得成功:", { signatureLength: signature?.length });
      
      // 署名データの作成
      const signatureData = {
        signature,
        imageHash,
        challenge: "temporary_challenge", // 互換性のため残す
        timestamp,
        wallet_address: account
      };
      
      console.log("署名データ作成完了:", {
        hasSignature: !!signatureData.signature,
        hasImageHash: !!signatureData.imageHash,
        hasWalletAddress: !!signatureData.wallet_address,
        wallet_address: signatureData.wallet_address,
        walletAddressType: typeof signatureData.wallet_address
      });
      
      // 署名付きで画像をLaravelサーバーに保存し、結果を受け取る
      const uploadResult = await savePhoto(signatureData);
      console.log("サーバー保存完了:", uploadResult);
      
      // ブロックチェーンにも保存
      setIsBlockchainSaving(true);
      console.log("ブロックチェーンに保存開始");
      
      // file_pathからURLを構築
      const storagePath = uploadResult.photo.file_path;
      const imageUrl = `https://moriai.sakura.ne.jp/rustoneback/storage/${storagePath}`;
      console.log("生成した画像URL:", imageUrl);
      
      // 生成したURLを使ってブロックチェーンに保存
      const txResult = await storeImageData(imageUrl, imageHash, timestamp, signature);
      console.log("ブロックチェーン保存完了:", txResult);
      
      console.log("保存処理完了", { success: true, signatureData });
      
    } catch (err) {
      console.error('署名・保存処理エラー:', err);
      setErrorInfo(err instanceof Error ? err.message : "エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsSigning(false);
      setIsBlockchainSaving(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const videoConstraints = {
    width: 720,
    height: 720,
    facingMode: "user"
  };

  const isProcessing = isSaving || isSigning || isBlockchainSaving;
  const processingText = 
    isBlockchainSaving ? 'ブロックチェーンに保存中...' : 
    isSigning ? '署名中...' : 
    isSaving ? '保存中...' : '署名して保存';

  return (
    <Container maxWidth="sm">
      <StyledPaper elevation={3}>
        {(photoError || web3Error || errorInfo) && (
          <Alert 
            severity="error" 
            onClose={() => errorInfo ? setErrorInfo(null) : null}
          >
            {photoError || web3Error || errorInfo}
          </Alert>
        )}

        {account ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalletAddress>
              接続中: {formatAddress(account)}
            </WalletAddress>
            <Button
              variant="outlined"
              size="small"
              onClick={disconnect}
            >
              切断
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            onClick={connect}
            disabled={isConnecting}
            startIcon={isConnecting ? <CircularProgress size={20} /> : null}
          >
            {isConnecting ? '接続中...' : 'MetaMaskに接続'}
          </Button>
        )}
        
        {imgSrc ? (
          <Box>
            <img src={imgSrc} alt="captured" style={{ width: '100%' }} />
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={retake}
                disabled={isProcessing}
              >
                撮り直す
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveWithSignature}
                disabled={isProcessing || !account}
                startIcon={isProcessing ? <CircularProgress size={20} /> : null}
              >
                {processingText}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              style={{ width: '100%' }}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleCapture}
                disabled={!account}
              >
                撮影
              </Button>
            </Box>
          </Box>
        )}
      </StyledPaper>
    </Container>
  );
};

export default Camera;