/**
 * Honest Privacy & Data Retention Disclosure Modal
 */

import React from 'react';
import { Shield, Lock, Trash2, AlertTriangle, Eye, Server, RefreshCw } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 text-neutral-100 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Privacy Architecture & Data Retention</h2>
              <p className="text-xs text-neutral-400">Transparent Cryptographic Guarantees & Operational Boundaries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Core Principles */}
        <div className="space-y-4 text-sm text-neutral-300">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              1. End-to-End Client Encryption (Web Crypto API)
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every message and uploaded media item is encrypted in your web browser with <strong>AES-GCM (256-bit)</strong> before it leaves your device. 
              The raw cryptographic encryption key is appended solely to the URL hash fragment (<code>#key=...</code>). By Web specifications (RFC 3986), 
              the hash fragment is never included in HTTP requests and is never received by the web server or logged.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              2. Zero-Account & Zero Personal Identifiers
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              We do not require an email address, phone number, real name, or password. Temporary sessions use randomized, anonymous identity handles 
              (e.g., <em>Neon Raven</em>). IP addresses are briefly analyzed in memory purely for denial-of-service and brute-force PIN prevention, and are never saved to long-term storage or linked to chat content.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-emerald-400" />
              3. Automatic Expiration & Permanent Deletion
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every room has a strict expiration timer (1h, 6h, 24h, 3d, 7d). A server-side background sweeper continuously flushes and wipes expired rooms and all associated temporary files. 
              Alternatively, any participant can invoke the <strong>"Destroy Room"</strong> button to immediately wipe all messages, media files, and active real-time connections.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              4. Disappearing & View-Once Media
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              When view-once media is enabled, the encrypted file is decrypted in the recipient's memory only once. Closing or finishing the view triggers an immediate burn command that deletes the file from storage and purges the payload from the room feed.
            </p>
          </section>

          <section className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              Important Technical Honesty & Screenshot Notice
            </div>
            <p className="leading-relaxed">
              No digital messaging software or web application can mathematically prevent a recipient from photographing their monitor with a secondary physical camera, taking an operating-system level screenshot, or recording their screen. Always share sensitive information with people you trust.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-medium text-sm rounded-xl transition"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
