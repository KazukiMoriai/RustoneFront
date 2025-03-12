import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { MetaMaskProvider } from '@metamask/sdk-react';
import Camera from './components/Camera';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  return (
    <MetaMaskProvider
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: 'RustoneFront',
          url: window.location.href,
        }
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Camera />
      </ThemeProvider>
    </MetaMaskProvider>
  );
}

export default App; 