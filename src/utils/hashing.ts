import { sha256 } from 'js-sha256';

/**
 * Computes the SHA-256 hash of a string.
 * @param text - The input string.
 * @returns The hex-encoded SHA-256 hash.
 */
export const hashString = (text: string): string => {
  return sha256(text);
};

/**
 * Computes the SHA-256 hash of a File or Blob.
 * @param file - The File or Blob object.
 * @returns Promise resolving to the hex-encoded SHA-256 hash.
 */
export const hashFile = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const buffer = event.target.result as ArrayBuffer;
        crypto.subtle.digest('SHA-256', buffer)
          .then(hashBuffer => {
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            resolve(hashHex);
          })
          .catch(reject);
      } else {
        reject(new Error('Failed to read file content.'));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
}; 