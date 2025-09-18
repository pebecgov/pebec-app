// Message encryption utilities
import CryptoJS from 'crypto-js';

// Get the secret key from environment variables
const SECRET_KEY = process.env.MESSAGE_ENCRYPTION_SECRET!

/**
 * Encrypt a message using AES encryption
 * @param message - The message to encrypt
 * @returns Encrypted message string
 */
export function encryptMessage(message: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message using AES decryption
 * @param encryptedMessage - The encrypted message to decrypt
 * @returns Decrypted message string
 */
export function decryptMessage(encryptedMessage: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
    const message = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!message) {
      throw new Error('Failed to decrypt message - invalid key or corrupted data');
    }
    
    return message;
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Hash a message using SHA-256 (one-way hash, cannot be decrypted)
 * @param message - The message to hash
 * @returns Hashed message string
 */
export function hashMessage(message: string): string {
  try {
    return CryptoJS.SHA256(message).toString();
  } catch (error) {
    console.error('Error hashing message:', error);
    throw new Error('Failed to hash message');
  }
}
