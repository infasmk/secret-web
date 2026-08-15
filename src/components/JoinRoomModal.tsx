/**
 * Sleek Interface Join Room Modal with PIN Prompt and URL Parser
 */

import React, { useState } from 'react';
import { LogIn, Key, Lock, AlertCircle, ArrowRight, X } from 'lucide-react';
import { hashPin } from '../lib/crypto';
import { parseResponseJson } from '../lib/api';

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
  const [needsPin, setNeedsPin] = useState(false);
  const [pinSalt, setPinSalt] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const raw = inputVal.trim();
    if (!raw) {
      setError('Please enter a room code or link');
      return;
    }

    let roomId = '';
    let extractedKey = '';

    // Handle full URL or room ID + hash
    if (raw.includes('/room/')) {
      const parts = raw.split('/room/')[1];
      const [idPart, hashPart] = parts.split('#');
      roomId = idPart.split('?')[0].trim();
      if (hashPart && hashPart.includes('key=')) {
        extractedKey = hashPart.split('key=')[1]?.split('&')[0];
      }
    } else if (raw.includes('#key=')) {
      const [idPart, keyPart] = raw.split('#key=');
      roomId = idPart.trim();
      extractedKey = keyPart.split('&')[0].trim();
    } else {
      roomId = raw.trim();
    }

    if (!roomId) {
      setError('Invalid room link or format');
      return;
    }

    setIsVerifying(true);

    try {
      // Check room status from server
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      const meta = await parseResponseJson<any>(res);

      if (meta.security?.hasPin && !needsPin) {
        setNeedsPin(true);
        setPinSalt(meta.security.pinSalt || '');
        setIsVerifying(false);
        return;
      }

      let calculatedPinHash = '';
      if (meta.security?.hasPin) {
        if (!pin.trim()) {
          setError('PIN code required for this room');
          setIsVerifying(false);
          return;
        }
        calculatedPinHash = await hashPin(pin.trim(), meta.security.pinSalt || '');
        
        // Verify PIN on server
        const pinRes = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinHash: calculatedPinHash }),
        });

        await parseResponseJson<any>(pinRes);
      }

      onJoinRoom(roomId, extractedKey || undefined, calculatedPinHash || undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 sm:p-7 text-slate-100 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Join Private Room</h2>
              <p className="text-xs text-slate-400">Enter a room code or shared private link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
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
                placeholder="Paste link or room code (e.g. xyz-abc-123)"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition"
              />
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-black/50 border border-white/10 rounded-xl animate-fade-in">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
                <Lock className="w-4 h-4" />
                This room is protected by a PIN
              </div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter room PIN"
                autoFocus
                maxLength={16}
                className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
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
                  Connecting...
                </>
              ) : (
                <>
                  <span>{needsPin ? 'Verify & Enter' : 'Continue'}</span>
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
