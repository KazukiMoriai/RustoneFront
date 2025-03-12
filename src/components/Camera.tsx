import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Button, Box, Container, Paper, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const Camera: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const { imgSrc, isSaving, error, capture, retake, savePhoto } = usePhotoCapture();

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      capture(imageSrc);
    }
  };

  const videoConstraints = {
    width: 720,
    height: 720,
    facingMode: "user"
  };

  return (
    <Container maxWidth="sm">
      <StyledPaper elevation={3}>
        {error && (
          <Alert severity="error" onClose={() => null}>
            {error}
          </Alert>
        )}
        
        {imgSrc ? (
          <Box>
            <img src={imgSrc} alt="captured" style={{ width: '100%' }} />
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={retake}
                disabled={isSaving}
              >
                撮り直す
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={savePhoto}
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={20} /> : null}
              >
                {isSaving ? '保存中...' : '保存'}
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
              <Button variant="contained" onClick={handleCapture}>
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