/**
 * Types and Interfaces for Private Temporary Messaging Platform
 */

export type ExpirationOption = '5m' | '15m' | '1h' | '6h' | '24h' | '3d' | '7d';

export interface RoomSecuritySettings {
  hasPin: boolean;
  pinSalt?: string;
  pinHash?: string; // SHA-256/PBKDF2 hash for validation
  allowFileUploads: boolean;
  allowViewOnce: boolean;
  maxFileSizeMb: number;
}

export interface RoomMetadata {
  id: string;
  title: string;
  createdAt: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms
  creatorId: string;
  security: RoomSecuritySettings;
  status: 'active' | 'expired' | 'destroyed';
  destructionReason?: string;
  encryptionVersion: string;
  memberCount: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'system';

export interface EncryptedPayload {
  iv: string; // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext + tag
}

export interface MediaMetadata {
  fileId: string;
  fileName: string; // Encrypted in ciphertext or safe placeholder
  fileSize: number;
  mimeType: string;
  isViewOnce: boolean;
  viewedBy?: string[];
  burnedAt?: number;
  thumbnail?: string; // Optional blurred low-res base64
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string; // Can be encrypted or plain anonymous handle
  senderColor: string;
  type: MessageType;
  encryptedContent: EncryptedPayload;
  media?: MediaMetadata;
  createdAt: number;
  expiresAt: number;
  isViewOnce?: boolean;
  isBurned?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  // Decrypted client-side fields (never transmitted to server)
  decryptedText?: string;
  decryptedMediaUrl?: string;
}

export interface RoomMember {
  id: string;
  displayName: string;
  avatarColor: string;
  joinedAt: number;
  lastSeenAt: number;
  isTyping?: boolean;
  isCreator?: boolean;
}

export interface WsClientMessage {
  type: 'join' | 'message' | 'typing' | 'burn_media' | 'destroy_room' | 'ping' | 'leave';
  roomId: string;
  memberId: string;
  displayName?: string;
  avatarColor?: string;
  payload?: any;
}

export interface WsServerMessage {
  type: 'room_state' | 'member_joined' | 'member_left' | 'message' | 'typing_update' | 'media_burned' | 'room_destroyed' | 'room_expired' | 'error' | 'pong';
  roomId: string;
  payload?: any;
}
