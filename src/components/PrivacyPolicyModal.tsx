/**
 * Honest Privacy & Data Retention Disclosure Modal
 */

import React, { useEffect } from 'react';
import { Shield, Lock, Trash2, Server, Key, Eye, X, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[#0c0e14] border border-white/10 rounded-2xl p-5 sm:p-8 text-slate-100 shadow-2xl space-y-6 my-auto max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Privacy Architecture & Data Lifecycle</h2>
              <p className="text-xs text-slate-400">Cryptographic Guarantees & Zero-Knowledge Verification</p>
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

        {/* Core Principles */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <section className="p-4 bg-[#141722] border border-white/5 rounded-xl space-y-1.5">
            <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              1. End-to-End Client Encryption (Web Crypto API)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every message and attachment is encrypted in your web browser with <strong>AES-GCM (256-bit)</strong> prior to transmission. 
              The raw cryptographic encryption key is appended solely to the URL hash fragment (<code className="text-emerald-400 font-mono">#key=...</code>). By Web RFC 3986 standards, 
              hash fragments are never sent in HTTP requests and are never received or stored by the backend.
            </p>
          </section>

          <section className="p-4 bg-[#141722] border border-white/5 rounded-xl space-y-1.5">
            <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              2. Zero Account & Zero Identity Tracking
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No email address, phone number, real name, or account registration is ever required. Sessions utilize randomized ephemeral pseudonyms. IP addresses are analyzed exclusively in memory for rate-limiting and DDoS mitigation, and are never persisted to long-term storage.
            </p>
          </section>

          <section className="p-4 bg-[#141722] border border-white/5 rounded-xl space-y-1.5">
            <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-emerald-400" />
              3. Automatic Memory Sweeping & Kill Switch
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a room reaches its scheduled expiration timer (15m to 7d) or any participant activates the emergency <strong>Destroy Room</strong> kill switch, all encrypted ciphertext chunks, file memory, and metadata are permanently erased.
            </p>
          </section>

          <section className="p-4 bg-[#141722] border border-white/5 rounded-xl space-y-1.5">
            <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              4. Ephemeral View-Once Attachments
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When view-once media is opened by a recipient, a cryptographically signed burn signal broadcasts across the room websocket, automatically purging the file from memory across all devices.
            </p>
          </section>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
