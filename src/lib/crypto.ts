/**
 * Web Crypto API primitives for Zero-Knowledge End-to-End Encryption
 * Uses AES-GCM (256-bit) with fresh 96-bit (12-byte) IVs for each encryption operation.
 * Keys are passed strictly via URL hash fragment (#key=...) and NEVER sent to the server.
 */

import { EncryptedPayload } from '../types';

// Convert Uint8Array to base64url string
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert base64url string to Uint8Array
export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a new cryptographically secure 256-bit AES-GCM key
 */
export async function generateRoomKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export CryptoKey to base64url format for URL hash storage
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64Url(exported);
}

/**
 * Import a base64url string back to a CryptoKey
 */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const keyData = base64UrlToBuffer(base64Key);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-GCM-256 with a random 12-byte IV
 */
export async function encryptText(
  text: string,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);
  
  // 12 bytes = 96 bits recommended IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedText
  );

  return {
    iv: bufferToBase64Url(iv),
    ciphertext: bufferToBase64Url(encryptedBuffer),
  };
}

/**
 * Decrypt ciphertext back into a plaintext string
 */
export async function decryptText(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const iv = base64UrlToBuffer(payload.iv);
  const ciphertext = base64UrlToBuffer(payload.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypt binary data (e.g., file / image / video buffer)
 */
export async function encryptBinary(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ iv: string; encryptedData: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return {
    iv: bufferToBase64Url(iv),
    encryptedData: encryptedBuffer,
  };
}

/**
 * Decrypt binary data back into original ArrayBuffer
 */
export async function decryptBinary(
  encryptedData: ArrayBuffer,
  ivBase64: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = base64UrlToBuffer(ivBase64);

  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encryptedData
  );
}

/**
 * Generate a 6-digit visual security fingerprint (Safety Code / Emoji verification)
 * Allows participants to verify out-of-band that they have the identical encryption key.
 */
export async function generateKeyFingerprint(key: CryptoKey): Promise<{ code: string; emojis: string[] }> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKey);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Format as 4 groups of 4 hexadecimal numbers
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const formattedCode = `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)} ${hex.slice(12, 16)}`.toUpperCase();

  const emojiPool = ['🛡️', '⚡', '🔒', '🔑', '💎', '🌟', '🌙', '🔥', '🌊', '🌲', '🦊', '🦅', '🍀', '🛰️', '🪐', '⚓'];
  const emojis = [
    emojiPool[hashArray[0] % emojiPool.length],
    emojiPool[hashArray[1] % emojiPool.length],
    emojiPool[hashArray[2] % emojiPool.length],
    emojiPool[hashArray[3] % emojiPool.length],
  ];

  return { code: formattedCode, emojis };
}

/**
 * Hash a room PIN with salt using SHA-256 for server-side verification
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToBase64Url(hashBuffer);
}

/**
 * Generate random cryptographic salt
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64Url(salt);
}
