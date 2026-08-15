/**
 * Modern Sleek Interface Privacy Landing Page
 */

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Clock,
  Flame,
  ArrowRight,
  LogIn,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface LandingPageProps {
  onCreateClick: () => void;
  onJoinClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateClick,
  onJoinClick,
}) => {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 flex flex-col font-sans select-none selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <nav className="border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">
                Ghost Protocol
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              E2EE ZERO-KNOWLEDGE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Privacy Architecture
          </button>
          <button
            onClick={onJoinClick}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-400" />
            <span>Join Room</span>
          </button>
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 text-center max-w-4xl mx-auto space-y-10">
        {/* Sleek Security Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-mono tracking-wider animate-fade-in shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>BROWSER-NATIVE AES-GCM-256 • ZERO KNOWLEDGE</span>
        </div>

        {/* Hero Headlines */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Private conversations. <br />
            <span className="text-slate-500">Made temporary.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Create an encrypted perimeter, share the zero-knowledge link, and communicate in real time without leaving a permanent trail. No email, no account, automatic memory wiping.
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full max-w-md">
          <button
            onClick={onCreateClick}
            id="create-private-room-btn"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
          >
            <span>Create Private Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onJoinClick}
            id="join-private-room-btn"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm rounded-xl transition-all cursor-pointer"
          >
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Join with Link / Code</span>
          </button>
        </div>

        {/* Feature Highlights Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8 text-left">
          {/* Card 1: Zero Knowledge */}
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-3 hover:border-white/20 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Client-Side E2EE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Keys are generated in your browser and kept strictly in URL hashes (<code className="text-indigo-400">#key=...</code>). The server never sees plaintext or keys.
            </p>
          </div>

          {/* Card 2: Auto Expiration */}
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-3 hover:border-white/20 transition">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Automatic Expiration</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose from 15m to 7 days. A server-side sweeper automatically flushes expired rooms and encrypted files from memory at zero.
            </p>
          </div>

          {/* Card 3: Disappearing Media */}
          <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl space-y-3 hover:border-white/20 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">View-Once Media</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send view-once encrypted photos and documents. Viewing triggers immediate file deletion across the entire network.
            </p>
          </div>
        </div>

        {/* Security & Protocol Transparency Diagram */}
        <div className="w-full p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl text-left space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Cryptographic Workflow
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">RFC 3986 HASH COMPLIANCE</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
              <span className="text-indigo-400 font-mono text-[11px] font-bold">01. Key Generation</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Random 256-bit AES-GCM key created in Web Crypto API
              </p>
            </div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
              <span className="text-indigo-400 font-mono text-[11px] font-bold">02. Zero-Knowledge URL</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Key is encoded in <code className="text-indigo-300">#key=...</code> and never transmitted to server
              </p>
            </div>
            <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
              <span className="text-amber-500 font-mono text-[11px] font-bold">03. Ephemeral Sweep</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Ciphertexts and vaults wiped permanently at TTL zero or manual kill
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0a0a0a] py-6 px-6 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="hover:text-slate-300 transition underline underline-offset-4"
          >
            Privacy Architecture & Disclosures
          </button>
          <span>•</span>
          <span>Zero Server Logs</span>
          <span>•</span>
          <span>No Account Required</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Designed strictly to minimize data retention. As with all messaging platforms, screenshotting/physical photos cannot be blocked.
        </p>
      </footer>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
    </div>
  );
};
