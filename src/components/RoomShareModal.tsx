/**
 * Sleek Interface Room Ready / Share Modal with Zero-Knowledge URL, QR Code, and Expiration Timer
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, QrCode, ArrowRight, Clock, Lock, Sparkles, X } from 'lucide-react';

interface RoomShareModalProps {
  isOpen: boolean;
  roomId: string;
  rawKeyBase64: string;
  expiresAt: number;
  hasPin: boolean;
  onEnterRoom: () => void;
  onClose?: () => void;
}

export const RoomShareModal: React.FC<RoomShareModalProps> = ({
  isOpen,
  roomId,
  rawKeyBase64,
  expiresAt,
  hasPin,
  onEnterRoom,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fullShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomId}#key=${rawKeyBase64}`
    : `/room/${roomId}#key=${rawKeyBase64}`;

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

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 sm:p-8 text-slate-100 shadow-2xl space-y-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white mb-1 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Your Private Room is Ready</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Share this link with your chat partner. End-to-end encryption keys are held strictly in the URL hash.
          </p>
        </div>

        {/* Share Link Box */}
        <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Direct Zero-Knowledge Link
            </span>
            <div className="flex items-center gap-1 text-indigo-400 text-xs font-medium font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in {timeLeft}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-xs font-mono text-slate-300 truncate flex-1 select-all">
              {fullShareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition shrink-0 cursor-pointer shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <span>Room ID: <strong className="text-slate-300 font-mono">{roomId}</strong></span>
            {hasPin && (
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <Lock className="w-3 h-3" /> PIN Protected
              </span>
            )}
          </div>
        </div>

        {/* QR Code toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowQr(!showQr)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>{showQr ? 'Hide QR Code' : 'Show Mobile QR Code'}</span>
          </button>

          {showQr && (
            <div className="mt-4 p-4 bg-white rounded-xl inline-block shadow-lg animate-fade-in">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullShareUrl)}`}
                alt="Room QR Code"
                className="w-40 h-40 object-contain mx-auto"
              />
              <p className="text-[10px] text-neutral-800 font-medium mt-2">Scan to join securely on mobile</p>
            </div>
          )}
        </div>

        {/* Enter Room Button */}
        <button
          onClick={onEnterRoom}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Enter Room</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
