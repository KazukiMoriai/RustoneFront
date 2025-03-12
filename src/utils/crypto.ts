import { ethers } from 'ethers';

export const hashImage = async (imageData: string): Promise<string> => {
  try {
    // Base64データからバイナリデータを取得
    const base64Data = imageData.split(',')[1];
    const binaryData = atob(base64Data);
    
    // バイナリデータをUint8Arrayに変換
    const uint8Array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i);
    }

    // SHA-256ハッシュを計算
    const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `0x${hashHex}`;
  } catch (error) {
    console.error('Error hashing image:', error);
    throw new Error('画像のハッシュ化に失敗しました。');
  }
};

export const createSignMessage = (imageHash: string, challenge: string): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  return ethers.solidityPackedKeccak256(
    ['bytes32', 'string', 'uint256'],
    [imageHash, challenge, timestamp]
  );
}; 