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
  const { account, isConnecting, error: web3Error, connect, disconnect, signMessage } = useWeb3();
  const [isSigning, setIsSigning] = useState(false);

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      capture(imageSrc);
    }
  };

  const handleSaveWithSignature = async () => {
    if (!imgSrc || !account) return;
  
    setIsSigning(true);
    try {
      // 画像をハッシュ化
      const imageHash = await hashImage(imgSrc);
  
      // TODO: サーバーからチャレンジを取得する実装に置き換え
      const challenge = "temporary_challenge";
  
      // 署名用メッセージを作成
      const message = createSignMessage(imageHash, challenge);
  
      // メッセージに署名
      const signature = await signMessage(message);
  
      // 署名付きで画像を保存
      await savePhoto({
        signature,
        imageHash,
        challenge,
        timestamp: Math.floor(Date.now() / 1000),
        wallet_address: account 
      });
      console.log("署名データ作成時:", {
        account, 
        imageHash,
        hasAccount: !!account,
        signatureLength: signature?.length
      });
      
    } catch (err) {
      console.error('Error during signing:', err);
    } finally {
      setIsSigning(false);
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

  return (
    <Container maxWidth="sm">
      <StyledPaper elevation={3}>
        {(photoError || web3Error) && (
          <Alert severity="error" onClose={() => null}>
            {photoError || web3Error}
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
                disabled={isSaving || isSigning}
              >
                撮り直す
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveWithSignature}
                disabled={isSaving || isSigning || !account}
                startIcon={(isSaving || isSigning) ? <CircularProgress size={20} /> : null}
              >
                {isSaving ? '保存中...' : isSigning ? '署名中...' : '署名して保存'}
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