import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button, Box, Container, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const Camera: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
  };

  const videoConstraints = {
    width: 720,
    height: 1280,
    facingMode: { exact: "environment" }
  };

  return (
    <Container maxWidth="sm">
      <StyledPaper elevation={3}>
        {imgSrc ? (
          <Box>
            <img src={imgSrc} alt="captured" style={{ width: '100%' }} />
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" color="primary" onClick={retake}>
                撮り直す
              </Button>
              <Button variant="contained" color="success">
                保存
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
              <Button variant="contained" onClick={capture}>
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