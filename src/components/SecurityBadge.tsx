/**
 * Sleek Interface Cryptographic Security Badge & Key Verification Modal
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, EyeOff, ServerOff, Key, Copy, Check, X } from 'lucide-react';
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
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer shadow-sm"
        title="Click to inspect cryptographic verification"
      >
        <Lock className="w-3.5 h-3.5 text-indigo-400" />
        <span className="tracking-wide font-mono text-[11px]">E2EE Active</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Cryptographic Verification</h3>
                  <p className="text-xs text-slate-400">Client-Side Zero-Knowledge Session</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Key Fingerprint Verification */}
            {fingerprint && (
              <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Safety Number / Fingerprint
                  </span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono text-xs cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 text-2xl py-2 bg-white/5 rounded-lg border border-white/5">
                  {fingerprint.emojis.map((emoji, i) => (
                    <span key={i} className="hover:scale-125 transition-transform select-none">
                      {emoji}
                    </span>
                  ))}
                </div>

                <div className="text-center font-mono text-xs tracking-wider text-slate-300 select-all">
                  {fingerprint.code}
                </div>
                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  Compare these emojis or safety fingerprint with your peer to verify that no entity has intercepted the end-to-end key exchange.
                </p>
              </div>
            )}

            {/* Privacy Pillars */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-3 bg-white/5 rounded-xl border border-white/5">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-200">Browser-Native AES-GCM (256-bit)</span>
                  <p className="text-slate-400 mt-0.5">
                    Every message and file is encrypted in your browser using the Web Crypto API prior to transmission.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-white/5 rounded-xl border border-white/5">
                <ServerOff className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-200">Zero-Knowledge URL Hash</span>
                  <p className="text-slate-400 mt-0.5">
                    The encryption key lives in the URL fragment (<code className="text-indigo-400 font-mono">#key=...</code>), which RFC 3986 guarantees is never sent to the web server.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-white/5 rounded-xl border border-white/5">
                <EyeOff className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-200">Ephemeral Storage & View-Once</span>
                  <p className="text-slate-400 mt-0.5">
                    Server memory is wiped on expiration or manual killswitch. Ciphertext cannot be decrypted without your private key.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
