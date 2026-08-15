/**
 * Sleek Interface Cryptographic Security Badge & Key Verification Modal
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, EyeOff, ServerOff, Key, Copy, Check, X, Shield } from 'lucide-react';
import { generateKeyFingerprint } from '../lib/crypto';

interface SecurityBadgeProps {
  cryptoKey: CryptoKey | null;
  encryptionVersion?: string;
  hasPin?: boolean;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  cryptoKey,
  encryptionVersion = 'AES-GCM-256',
  hasPin = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fingerprint, setFingerprint] = useState<{ code: string; emojis: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = async () => {
    if (cryptoKey) {
      try {
        const fp = await generateKeyFingerprint(cryptoKey);
        setFingerprint(fp);
      } catch (err) {
        console.error('Failed to generate fingerprint:', err);
      }
    }
    setIsOpen(true);
  };

  const copyCode = () => {
    if (fingerprint?.code) {
      navigator.clipboard.writeText(fingerprint.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        id="security-badge-trigger"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm"
        title="Click to inspect cryptographic verification"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <Lock className="w-3.5 h-3.5 text-emerald-400" />
        <span className="tracking-wide font-mono text-[11px]">E2EE Active</span>
      </button>

      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-md bg-[#0c0e14] border border-white/10 rounded-2xl p-5 sm:p-7 text-slate-100 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Cryptographic Verification</h3>
                  <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">{encryptionVersion}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verification Content */}
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#141722] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-medium text-slate-200">Room Security Fingerprint</span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Emoji Sequence */}
                {fingerprint && (
                  <div className="flex items-center justify-center gap-3 py-2 bg-black/50 rounded-lg text-2xl tracking-widest select-all border border-white/5">
                    {fingerprint.emojis.map((emoji, i) => (
                      <span key={i}>{emoji}</span>
                    ))}
                  </div>
                )}

                {/* Hex Fingerprint */}
                {fingerprint && (
                  <div className="font-mono text-[11px] text-center text-slate-300 bg-black/40 p-2.5 rounded-lg break-all border border-white/5 select-all">
                    {fingerprint.code}
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Compare this security fingerprint with other participants over a secondary channel to verify that your session is free from eavesdropping or tampering.
                </p>
              </div>

              {/* Security Badges */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-3 bg-[#141722] rounded-xl border border-white/5 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-300">256-bit AES-GCM Key</span>
                </div>
                <div className="p-3 bg-[#141722] rounded-xl border border-white/5 flex items-center gap-2">
                  <ServerOff className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">Server Zero-Knowledge</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
