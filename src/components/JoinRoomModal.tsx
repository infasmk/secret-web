/**
 * Sleek Interface Join Room Modal with PIN/Password Prompt and URL Parser
 */

import React, { useState, useEffect } from 'react';
import { LogIn, Key, Lock, AlertCircle, ArrowRight, X, Eye, EyeOff } from 'lucide-react';
import { hashPin } from '../lib/crypto';
import { parseResponseJson, safeFetch } from '../lib/api';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomId: string, rawKeyBase64?: string, pinHash?: string) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [extractedKey, setExtractedKey] = useState<string | undefined>(undefined);
  const [pinSalt, setPinSalt] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isVerifying) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isVerifying, onClose]);

  if (!isOpen) return null;

  const handleParseAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let roomId = targetRoomId;
    let key = extractedKey;

    if (!needsPin) {
      const raw = inputVal.trim();
      if (!raw) {
        setError('Please enter a room code or link');
        return;
      }

      // Handle full URL or room ID + hash
      if (raw.includes('/room/')) {
        const parts = raw.split('/room/')[1];
        const [idPart, hashPart] = parts.split('#');
        roomId = idPart.split('?')[0].trim();
        if (hashPart && hashPart.includes('key=')) {
          key = hashPart.split('key=')[1]?.split('&')[0];
        }
      } else if (raw.includes('#key=')) {
        const [idPart, keyPart] = raw.split('#key=');
        roomId = idPart.replace(/^.*\?room=/, '').trim();
        key = keyPart.split('&')[0].trim();
      } else if (raw.includes('?room=') || raw.includes('&room=')) {
        const urlParams = new URLSearchParams(raw.split('?')[1] || '');
        roomId = urlParams.get('room') || '';
        if (raw.includes('#key=')) {
          key = raw.split('#key=')[1]?.split('&')[0]?.trim();
        }
      } else {
        roomId = raw.trim();
      }

      if (!roomId) {
        setError('Invalid room link or format');
        return;
      }

      setTargetRoomId(roomId);
      setExtractedKey(key);
    }

    setIsVerifying(true);

    try {
      let meta: any = null;

      // 1. Check server
      try {
        const res = await safeFetch(`/api/rooms/${encodeURIComponent(roomId)}`);
        if (res.ok) {
          meta = await parseResponseJson<any>(res);
        }
      } catch (_) {}

      // 2. Fallback to Firestore
      if (!meta) {
        try {
          const docSnap = await getDoc(doc(db, 'rooms', roomId));
          if (docSnap.exists()) {
            const d = docSnap.data();
            meta = {
              id: roomId,
              title: d.name || 'Private Session',
              security: {
                hasPin: d.hasPin || false,
                pinSalt: d.salt || '',
                pinHash: d.pinHash || '',
              },
            };
          }
        } catch (fsErr) {
          console.warn('Firestore join lookup note:', fsErr);
        }
      }

      if (!meta) {
        throw new Error('Room not found or has expired.');
      }

      if (meta.security?.hasPin && !needsPin) {
        setNeedsPin(true);
        setPinSalt(meta.security.pinSalt || '');
        setIsVerifying(false);
        return;
      }

      let calculatedPinHash = '';
      if (meta.security?.hasPin) {
        if (!pin.trim()) {
          setError('Password / PIN code required for this room');
          setIsVerifying(false);
          return;
        }
        calculatedPinHash = await hashPin(pin.trim(), meta.security.pinSalt || '');

        // Verify with server endpoint or stored hash
        if (meta.security.pinHash && calculatedPinHash !== meta.security.pinHash) {
          throw new Error('Incorrect room password or PIN');
        }

        try {
          const pinRes = await safeFetch(`/api/rooms/${encodeURIComponent(roomId)}/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinHash: calculatedPinHash }),
          });
          if (pinRes.status === 401 || pinRes.status === 429) {
            const errData = await parseResponseJson<{ error?: string }>(pinRes);
            throw new Error(errData.error || 'Incorrect PIN code');
          }
        } catch (srvErr: any) {
          if (srvErr.message?.includes('Incorrect') || srvErr.message?.includes('Locked')) {
            throw srvErr;
          }
        }
      }

      onJoinRoom(roomId, key || undefined, calculatedPinHash || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to access room');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isVerifying) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-[#0c0e14] border border-white/10 rounded-2xl p-5 sm:p-7 text-slate-100 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Join Private Room</h2>
              <p className="text-xs text-slate-400">Enter a room code or shared private link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleParseAndJoin} className="space-y-4">
          {!needsPin ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Room Link or Code
              </label>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="e.g. ghost-raven-492 or paste full link"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-[#141722] border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
              />
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-[#141722] border border-white/10 rounded-xl animate-fade-in">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Password Required for Room: <strong className="text-white font-mono">{targetRoomId}</strong></span>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter room password or PIN"
                  autoFocus
                  maxLength={32}
                  className="w-full px-3.5 py-2.5 pr-10 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <span>{needsPin ? 'Unlock & Enter' : 'Continue'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
