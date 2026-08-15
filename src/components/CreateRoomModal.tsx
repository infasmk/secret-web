/**
 * Sleek Interface Create Room Modal with Expiration Presets, Security Settings, and Zero-Knowledge Key Generation
 */

import React, { useState } from 'react';
import { Shield, Clock, Lock, FileUp, Eye, Sparkles, AlertCircle, ArrowRight, X } from 'lucide-react';
import { generateRoomKey, exportKeyToBase64, hashPin, generateSalt } from '../lib/crypto';
import { generateSecureRoomId } from '../lib/anonymousNames';
import { parseResponseJson } from '../lib/api';
import { ExpirationOption } from '../types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string, rawKeyBase64: string, hasPin: boolean, expiresAt: number) => void;
}

const EXPIRATION_OPTIONS: { label: string; value: ExpirationOption; ms: number; desc: string }[] = [
  { label: '15 Minutes', value: '15m', ms: 15 * 60 * 1000, desc: 'Ephemeral fleeting chat' },
  { label: '1 Hour', value: '1h', ms: 60 * 60 * 1000, desc: 'Short session' },
  { label: '6 Hours', value: '6h', ms: 6 * 60 * 60 * 1000, desc: 'Collaboration sync' },
  { label: '24 Hours', value: '24h', ms: 24 * 60 * 60 * 1000, desc: 'Standard default' },
  { label: '3 Days', value: '3d', ms: 3 * 24 * 60 * 60 * 1000, desc: 'Multi-day session' },
  { label: '7 Days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000, desc: 'Max room lifespan' },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [title, setTitle] = useState('');
  const [selectedExp, setSelectedExp] = useState<ExpirationOption>('24h');
  const [enablePin, setEnablePin] = useState(false);
  const [pin, setPin] = useState('');
  const [allowFileUploads, setAllowFileUploads] = useState(true);
  const [allowViewOnce, setAllowViewOnce] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enablePin && pin.trim().length < 4) {
      setError('PIN must be at least 4 digits/characters');
      return;
    }

    setIsCreating(true);

    try {
      // 1. Generate client-side cryptographic key
      const cryptoKey = await generateRoomKey();
      const rawKeyBase64 = await exportKeyToBase64(cryptoKey);

      // 2. Generate secure random room ID
      const roomId = generateSecureRoomId();

      // 3. Calculate expiration
      const expConfig = EXPIRATION_OPTIONS.find(o => o.value === selectedExp) || EXPIRATION_OPTIONS[3];

      // 4. Hash PIN if enabled
      let pinSalt = '';
      let pinHash = '';
      if (enablePin && pin.trim()) {
        pinSalt = generateSalt();
        pinHash = await hashPin(pin.trim(), pinSalt);
      }

      // 5. Create room on server (Zero-Knowledge: server receives NO key, only ciphertext/hashes)
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roomId,
          title: title.trim() || 'Private Session',
          expirationMs: expConfig.ms,
          creatorId: 'anon_' + Math.random().toString(36).substring(2, 10),
          security: {
            hasPin: enablePin,
            pinSalt,
            pinHash,
            allowFileUploads,
            allowViewOnce,
            maxFileSizeMb: 25,
          },
          encryptionVersion: 'AES-GCM-256',
        }),
      });

      const createdData = await parseResponseJson<{ expiresAt: number; id: string }>(res);
      onRoomCreated(roomId, rawKeyBase64, enablePin, createdData.expiresAt);
    } catch (err: any) {
      console.error('Room creation error:', err);
      setError(err.message || 'Error initializing secure room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 sm:p-7 text-slate-100 shadow-2xl space-y-6 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Private Room</h2>
              <p className="text-xs text-slate-400">Zero-Knowledge Encrypted & Auto-Expiring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
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

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Optional Room Topic/Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Room Label <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Secret Project, Strategic Sync, Private Chat"
              maxLength={40}
              className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Expiration Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Automatic Room Lifespan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPIRATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedExp(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedExp === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Security: PIN Protection */}
          <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-medium text-slate-200">Optional PIN Passphrase</div>
                  <div className="text-[11px] text-slate-400">Require PIN gate before decrypting session</div>
                </div>
              </div>
              <input
                type="checkbox"
                id="enable-pin-toggle"
                checked={enablePin}
                onChange={e => setEnablePin(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-black/50 text-indigo-500 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
              />
            </div>

            {enablePin && (
              <div className="pt-2 animate-fade-in">
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Enter 4-8 digit PIN code"
                  maxLength={16}
                  className="w-full px-3.5 py-2 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Media Feature Toggles */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition">
              <input
                type="checkbox"
                checked={allowFileUploads}
                onChange={e => setAllowFileUploads(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-black/50 text-indigo-500 accent-indigo-500"
              />
              <div className="flex items-center gap-1.5 text-slate-300">
                <FileUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>Encrypted Files</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition">
              <input
                type="checkbox"
                checked={allowViewOnce}
                onChange={e => setAllowViewOnce(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-black/50 text-indigo-500 accent-indigo-500"
              />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>View-Once Media</span>
              </div>
            </label>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-2 text-[11px] text-indigo-300 leading-relaxed">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
            <span>
              A 256-bit AES key is generated on your device. The key will be embedded only in your URL hash (<code className="font-mono text-indigo-200">#key=...</code>) and never seen by the server.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Keys...
                </>
              ) : (
                <>
                  <span>Create Private Room</span>
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
