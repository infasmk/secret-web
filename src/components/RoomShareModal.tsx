/**
 * Sleek Interface Room Ready / Share Modal with Zero-Knowledge URL, QR Code, and Expiration Timer
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, QrCode, ArrowRight, Clock, Lock, Sparkles, X, Key, Share2 } from 'lucide-react';

interface RoomShareModalProps {
  isOpen: boolean;
  roomId: string;
  rawKeyBase64: string;
  expiresAt: number;
  hasPin: boolean;
  pinHash?: string;
  onEnterRoom: (pinHash?: string) => void;
  onClose?: () => void;
}

export const RoomShareModal: React.FC<RoomShareModalProps> = ({
  isOpen,
  roomId,
  rawKeyBase64,
  expiresAt,
  hasPin,
  pinHash,
  onEnterRoom,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fullShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${encodeURIComponent(roomId)}#key=${rawKeyBase64}`
    : `/?room=${encodeURIComponent(roomId)}#key=${rawKeyBase64}`;

  // Close on Escape key & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, expiresAt - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-[#0c0e14] border border-white/10 rounded-2xl p-5 sm:p-7 text-slate-100 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mb-1">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Private Perimeter Initialized</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Send this zero-knowledge link to your participant. The encryption key stays in the URL hash and never touches any server.
          </p>
        </div>

        {/* Share Link Box */}
        <div className="p-4 bg-[#141722] border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium flex items-center gap-1.5 text-slate-300">
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              Direct Encrypted Link
            </span>
            <div className="flex items-center gap-1 text-indigo-400 text-xs font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in {timeLeft}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-black/60 border border-white/10 rounded-lg">
            <div className="text-xs font-mono text-slate-300 truncate flex-1 select-all">
              {fullShareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer shadow-sm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Room ID: <strong className="text-slate-200 font-mono">{roomId}</strong></span>
              <button
                onClick={handleCopyId}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Copy Room ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            {hasPin && (
              <span className="flex items-center gap-1 text-amber-400 font-medium font-mono text-[10px]">
                <Lock className="w-3 h-3" /> Password Protected
              </span>
            )}
          </div>
        </div>

        {/* QR Code toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowQr(!showQr)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer py-1 px-3 rounded-lg hover:bg-white/5"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>{showQr ? 'Hide Mobile QR Code' : 'Display Mobile QR Code'}</span>
          </button>

          {showQr && (
            <div className="mt-3 p-4 bg-white rounded-xl inline-block shadow-xl animate-fade-in">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullShareUrl)}`}
                alt="Room QR Code"
                className="w-36 h-36 object-contain mx-auto"
              />
              <p className="text-[10px] text-neutral-800 font-semibold mt-2">Scan with camera to open room</p>
            </div>
          )}
        </div>

        {/* Enter Room Button */}
        <button
          onClick={() => onEnterRoom(pinHash)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Enter Room Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
