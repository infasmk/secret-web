/**
 * Core Real-Time Chat Room Controller with Zero-Knowledge E2EE, Media Vault, and Ephemeral State
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { MediaViewer } from './MediaViewer';
import { RoomShareModal } from './RoomShareModal';
import { ChatSocketClient } from '../lib/socketClient';
import {
  importKeyFromBase64,
  encryptText,
  decryptText,
  encryptBinary,
  decryptBinary,
  bufferToBase64Url,
} from '../lib/crypto';
import { generateAnonymousIdentity } from '../lib/anonymousNames';
import { parseResponseJson } from '../lib/api';
import { ChatMessage, RoomMember, RoomMetadata, WsServerMessage } from '../types';
import { Shield, Lock, AlertCircle, ArrowLeft, RefreshCw, Trash2, Clock, Sparkles } from 'lucide-react';

interface ChatRoomProps {
  roomId: string;
  rawKeyBase64?: string;
  pinHash?: string;
  onExit: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  rawKeyBase64: initialKeyBase64,
  pinHash: initialPinHash,
  onExit,
}) => {
  // Ephemeral identity (saved in React state only for this session)
  const [identity] = useState(() => generateAnonymousIdentity());
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [avatarColor, setAvatarColor] = useState(identity.avatarColor);

  // Key & Cryptography state
  const [rawKeyBase64, setRawKeyBase64] = useState<string | null>(initialKeyBase64 || null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [keyInputVal, setKeyInputVal] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Room Metadata state
  const [roomMeta, setRoomMeta] = useState<RoomMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [destroyedReason, setDestroyedReason] = useState<string>('');

  // Real-time Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modals & Viewers
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeMediaView, setActiveMediaView] = useState<{
    mediaUrl: string;
    fileName: string;
    mimeType: string;
    isViewOnce: boolean;
    fileId: string;
  } | null>(null);

  const socketRef = useRef<ChatSocketClient | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const decryptedBlobUrlsRef = useRef<Map<string, string>>(new Map());

  // 1. Parse Key from URL Hash if not passed via props
  useEffect(() => {
    if (!rawKeyBase64 && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('key=')) {
        const extracted = hash.split('key=')[1]?.split('&')[0]?.trim();
        if (extracted) setRawKeyBase64(extracted);
      }
    }
  }, [rawKeyBase64]);

  // 2. Initialize CryptoKey from rawKeyBase64
  useEffect(() => {
    if (rawKeyBase64) {
      importKeyFromBase64(rawKeyBase64)
        .then(key => {
          setCryptoKey(key);
          setKeyError(null);
        })
        .catch(err => {
          console.error('Invalid key base64:', err);
          setKeyError('Invalid or corrupted cryptographic key');
        });
    }
  }, [rawKeyBase64]);

  // 3. Fetch Room Metadata from Server
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setRoomError(null);

    fetch(`/api/rooms/${encodeURIComponent(roomId)}`)
      .then(res => parseResponseJson<RoomMetadata>(res))
      .then(meta => {
        if (isMounted) {
          setRoomMeta(meta);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setRoomError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // 4. Initialize WebSocket Connection & Handlers
  useEffect(() => {
    if (!roomMeta || roomMeta.status !== 'active' || isDestroyed) return;

    const socket = new ChatSocketClient(roomId, identity.id, displayName, avatarColor);
    socketRef.current = socket;
    socket.connect();

    const unsubscribe = socket.subscribe(async (msg: WsServerMessage) => {
      if (msg.type === 'room_state') {
        const { members: activeMembers, messages: rawMessages } = msg.payload;
        setMembers(activeMembers || []);

        // Decrypt historical messages if key is ready
        if (cryptoKey && rawMessages) {
          const decryptedList = await Promise.all(
            rawMessages.map(async (m: ChatMessage) => {
              try {
                if (m.type === 'text' && m.encryptedContent) {
                  const text = await decryptText(m.encryptedContent, cryptoKey);
                  return { ...m, decryptedText: text };
                }
              } catch (e) {
                return { ...m, decryptedText: '[Decryption Error: Key mismatch]' };
              }
              return m;
            })
          );
          setMessages(decryptedList);
        } else {
          setMessages(rawMessages || []);
        }
      } else if (msg.type === 'message') {
        const newMsg: ChatMessage = msg.payload;
        if (cryptoKey && newMsg.type === 'text' && newMsg.encryptedContent) {
          try {
            const text = await decryptText(newMsg.encryptedContent, cryptoKey);
            newMsg.decryptedText = text;
          } catch (e) {
            newMsg.decryptedText = '[Decryption Error]';
          }
        }
        setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
      } else if (msg.type === 'member_joined' || msg.type === 'member_left') {
        if (msg.payload?.members) {
          setMembers(msg.payload.members);
        }
      } else if (msg.type === 'typing_update') {
        const { memberId, displayName: typingName, isTyping } = msg.payload;
        setTypingUsers(prev => {
          const next = new Map(prev);
          if (isTyping && memberId !== identity.id) {
            next.set(memberId, typingName);
          } else {
            next.delete(memberId);
          }
          return next;
        });
      } else if (msg.type === 'media_burned') {
        const { fileId, messageId } = msg.payload;
        setMessages(prev =>
          prev.map(m => {
            if (m.id === messageId || m.media?.fileId === fileId) {
              return { ...m, isBurned: true, decryptedMediaUrl: undefined };
            }
            return m;
          })
        );
        // Revoke local object URL
        if (decryptedBlobUrlsRef.current.has(fileId)) {
          URL.revokeObjectURL(decryptedBlobUrlsRef.current.get(fileId)!);
          decryptedBlobUrlsRef.current.delete(fileId);
        }
        if (activeMediaView?.fileId === fileId) {
          setActiveMediaView(null);
        }
      } else if (msg.type === 'room_destroyed' || msg.type === 'room_expired') {
        setIsDestroyed(true);
        setDestroyedReason(msg.payload?.reason || 'Room terminated');
        socket.disconnect();
      }
    });

    return () => {
      unsubscribe();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, roomMeta?.id, isDestroyed, cryptoKey]);

  // 5. Decrypt text messages whenever cryptoKey updates
  useEffect(() => {
    if (!cryptoKey || messages.length === 0) return;

    let needsUpdate = false;
    Promise.all(
      messages.map(async m => {
        if (m.type === 'text' && m.encryptedContent && m.decryptedText === undefined) {
          needsUpdate = true;
          try {
            const text = await decryptText(m.encryptedContent, cryptoKey);
            return { ...m, decryptedText: text };
          } catch (e) {
            return { ...m, decryptedText: '[Decryption Error]' };
          }
        }
        return m;
      })
    ).then(updated => {
      if (needsUpdate) setMessages(updated);
    });
  }, [cryptoKey]);

  // 6. Scroll to bottom when messages update
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle Manual Key Input if joined without URL hash
  const handleManualKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInputVal.trim()) {
      setRawKeyBase64(keyInputVal.trim());
      // update hash in URL seamlessly without reload
      window.location.hash = `key=${keyInputVal.trim()}`;
    }
  };

  // Profile Update
  const handleUpdateProfile = (name: string, color: string) => {
    setDisplayName(name);
    setAvatarColor(color);
    socketRef.current?.updateProfile(name, color);
  };

  // Send Encrypted Text Message
  const handleSendMessage = async (text: string, isViewOnce: boolean) => {
    if (!cryptoKey) throw new Error('Encryption key not loaded');

    // Encrypt client-side
    const encryptedContent = await encryptText(text, cryptoKey);

    const msgPayload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'text',
      encryptedContent,
      isViewOnce,
    };

    // Optimistic local render
    const localMsg: ChatMessage = {
      id: msgPayload.id,
      roomId,
      senderId: identity.id,
      senderName: displayName,
      senderColor: avatarColor,
      type: 'text',
      encryptedContent,
      decryptedText: text,
      createdAt: Date.now(),
      expiresAt: roomMeta?.expiresAt || Date.now() + 86400000,
      isViewOnce,
      isBurned: false,
      status: 'sending',
    };

    setMessages(prev => [...prev, localMsg]);

    socketRef.current?.send({
      type: 'message',
      roomId,
      memberId: identity.id,
      displayName,
      avatarColor,
      payload: msgPayload,
    });
  };

  // Encrypt and Send Media / File
  const handleSendMedia = async (file: File, isViewOnce: boolean) => {
    if (!cryptoKey) throw new Error('Encryption key not loaded');

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const fileId = `vault_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const fileBuffer = await file.arrayBuffer();
      setUploadProgress(35);

      // Encrypt file binary client-side
      const { iv, encryptedData } = await encryptBinary(fileBuffer, cryptoKey);
      setUploadProgress(60);

      // Convert encrypted ArrayBuffer to Base64 for HTTP upload
      const base64Encrypted = bufferToBase64Url(encryptedData);

      // Upload encrypted blob to server ephemeral vault
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          iv,
          encryptedData: base64Encrypted,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name,
          isViewOnce,
        }),
      });

      await parseResponseJson<any>(res);

      setUploadProgress(90);

      // Encrypt file name for message payload
      const encryptedFileName = await encryptText(file.name, cryptoKey);

      let msgType: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';

      const msgPayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: msgType,
        encryptedContent: encryptedFileName,
        media: {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          isViewOnce,
        },
        isViewOnce,
      };

      socketRef.current?.send({
        type: 'message',
        roomId,
        memberId: identity.id,
        displayName,
        avatarColor,
        payload: msgPayload,
      });

      setUploadProgress(100);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Download & Decrypt Media on Demand
  const handleDecryptMedia = async (fileId: string, mimeType: string, fileName: string): Promise<string | null> => {
    if (!cryptoKey) throw new Error('Key missing');

    // Check memory cache
    if (decryptedBlobUrlsRef.current.has(fileId)) {
      return decryptedBlobUrlsRef.current.get(fileId)!;
    }

    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/media/${encodeURIComponent(fileId)}`);
    const { iv, data } = await parseResponseJson<{ iv: string; data: string }>(res);
    const binaryEncrypted = Uint8Array.from(atob(data), c => c.charCodeAt(0)).buffer;

    // Decrypt binary in browser memory
    const decryptedBuffer = await decryptBinary(binaryEncrypted, iv, cryptoKey);
    const blob = new Blob([decryptedBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);

    decryptedBlobUrlsRef.current.set(fileId, url);
    return url;
  };

  // Burn Media Trigger
  const handleBurnMedia = async (fileId: string) => {
    socketRef.current?.send({
      type: 'burn_media',
      roomId,
      memberId: identity.id,
      payload: { fileId },
    });

    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/media/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
    } catch (_) {}
  };

  // Destroy Room Killswitch
  const handleDestroyRoom = async () => {
    socketRef.current?.send({
      type: 'destroy_room',
      roomId,
      memberId: identity.id,
    });

    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/destroy`, {
        method: 'POST',
      });
    } catch (_) {}

    setIsDestroyed(true);
    setDestroyedReason('Room destroyed by participant');
  };

  // Send Typing Indicator
  const handleTyping = (isTyping: boolean) => {
    socketRef.current?.send({
      type: 'typing',
      roomId,
      memberId: identity.id,
      payload: { isTyping },
    });
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505] text-slate-100 min-h-screen">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse shadow-lg shadow-indigo-500/10">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-white">Connecting to Encrypted Room...</h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">Establishing zero-knowledge handshake</p>
      </div>
    );
  }

  // Room Destroyed / Expired Screen
  if (isDestroyed || (roomMeta && roomMeta.status !== 'active')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505] text-slate-100 min-h-screen animate-fade-in text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <Trash2 className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">This Room No Longer Exists</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
          {destroyedReason || 'All messages, media attachments, and keys for this private room have been permanently purged from server memory.'}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Room Fetch Error
  if (roomError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505] text-slate-100 min-h-screen text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-white">Unable to Access Room</h2>
        <p className="text-xs text-red-300 max-w-sm mt-1">{roomError}</p>
        <button
          onClick={onExit}
          className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-xl border border-white/10 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Prompt for Key if not found in URL hash
  if (!cryptoKey && !rawKeyBase64) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505] text-slate-100 min-h-screen animate-fade-in">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-7 space-y-5 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Encryption Key Required</h2>
            <p className="text-xs text-slate-400">
              The room link did not include the cryptographic hash key (<code className="text-indigo-400 font-mono">#key=...</code>).
            </p>
          </div>

          {keyError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
              {keyError}
            </div>
          )}

          <form onSubmit={handleManualKeySubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Paste Base64 Room Key or Full URL
              </label>
              <input
                type="text"
                value={keyInputVal}
                onChange={e => setKeyInputVal(e.target.value)}
                placeholder="e.g. jf9843hjkfs..."
                autoFocus
                className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExit}
                className="w-1/3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                Unlock Session
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const typingNames = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#050505] text-slate-300 overflow-hidden font-sans">
      {/* Top App / Chat Header */}
      {roomMeta && (
        <ChatHeader
          roomId={roomId}
          roomTitle={roomMeta.title}
          expiresAt={roomMeta.expiresAt}
          members={members}
          currentMemberId={identity.id}
          currentDisplayName={displayName}
          currentAvatarColor={avatarColor}
          cryptoKey={cryptoKey}
          rawKeyBase64={rawKeyBase64 || ''}
          hasPin={Boolean(roomMeta.security?.hasPin)}
          onUpdateProfile={handleUpdateProfile}
          onDestroyRoom={handleDestroyRoom}
        />
      )}

      {/* Main Message Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
        {/* Top Privacy & Security Notice Banner */}
        <div className="max-w-md mx-auto my-4 p-3.5 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1.5 select-none shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-semibold rounded-full border border-indigo-500/20">
            <Lock className="w-3 h-3" /> ZERO-KNOWLEDGE ACTIVE
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All messages and files are encrypted client-side. The server stores only ciphertext and sweeps data on room expiration.
          </p>
        </div>

        {/* Messages List */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-2 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">Room is Ready</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Send a private message or tap Share in the header to invite your chat partner.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === identity.id}
              onOpenMedia={(url, fn, mime, isVo, fId) => {
                setActiveMediaView({
                  mediaUrl: url,
                  fileName: fn,
                  mimeType: mime,
                  isViewOnce: isVo,
                  fileId: fId,
                });
              }}
              onDecryptMedia={handleDecryptMedia}
            />
          ))
        )}

        {/* Real-Time Typing Indicator */}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1 px-2 animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="font-mono text-[11px]">
              {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Bottom Composer */}
      {roomMeta && (
        <ChatComposer
          allowFileUploads={roomMeta.security.allowFileUploads}
          allowViewOnce={roomMeta.security.allowViewOnce}
          maxFileSizeMb={roomMeta.security.maxFileSizeMb}
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onTyping={handleTyping}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Fullscreen Ephemeral Media Viewer */}
      {activeMediaView && (
        <MediaViewer
          mediaUrl={activeMediaView.mediaUrl}
          fileName={activeMediaView.fileName}
          mimeType={activeMediaView.mimeType}
          isViewOnce={activeMediaView.isViewOnce}
          onClose={() => setActiveMediaView(null)}
          onBurn={() => handleBurnMedia(activeMediaView.fileId)}
        />
      )}

      {/* Share / Invite Modal */}
      {showShareModal && roomMeta && rawKeyBase64 && (
        <RoomShareModal
          isOpen={showShareModal}
          roomId={roomId}
          rawKeyBase64={rawKeyBase64}
          expiresAt={roomMeta.expiresAt}
          hasPin={Boolean(roomMeta.security?.hasPin)}
          onEnterRoom={() => setShowShareModal(false)}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
