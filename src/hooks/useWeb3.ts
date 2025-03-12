import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useSDK } from '@metamask/sdk-react';

interface UseWeb3Return {
  account: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
}

export const useWeb3 = (): UseWeb3Return => {
  const { sdk } = useSDK();
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // アカウント変更を監視
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // MetaMaskへの接続
  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMaskがインストールされていません。');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await sdk?.connect();
      if (accounts?.[0]) {
        setAccount(accounts[0]);
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError('MetaMaskへの接続に失敗しました。');
    } finally {
      setIsConnecting(false);
    }
  }, [sdk]);

  // 切断
  const disconnect = useCallback(() => {
    setAccount(null);
  }, []);

  // メッセージの署名
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!account) {
      throw new Error('ウォレットが接続されていません。');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return await signer.signMessage(message);
    } catch (err) {
      console.error('Signing error:', err);
      throw new Error('メッセージの署名に失敗しました。');
    }
  }, [account]);

  return {
    account,
    isConnecting,
    error,
    connect,
    disconnect,
    signMessage
  };
}; 