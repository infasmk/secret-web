/**
 * Sleek Interface Chat Header with Real-Time Expiration Timer, E2EE Badge, Profile Editor, and Instant Kill Switch
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  Trash2,
  Share2,
  Users,
  Copy,
  Check,
  AlertTriangle,
  Flame,
  UserPen,
  ChevronDown,
} from 'lucide-react';
import { SecurityBadge } from './SecurityBadge';
import { RoomMember } from '../types';

interface ChatHeaderProps {
  roomId: string;
  roomTitle: string;
  expiresAt: number;
  members: RoomMember[];
  currentMemberId: string;
  currentDisplayName: string;
  currentAvatarColor?: string;
  cryptoKey: CryptoKey | null;
  rawKeyBase64: string;
  hasPin: boolean;
  onUpdateProfile: (name: string, color: string) => void;
  onDestroyRoom: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomId,
  roomTitle,
  expiresAt,
  members,
  currentMemberId,
  currentDisplayName,
  currentAvatarColor = '#6366f1',
  cryptoKey,
  rawKeyBase64,
  hasPin,
  onUpdateProfile,
  onDestroyRoom,
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [newNick, setNewNick] = useState(currentDisplayName);

  // Expiration countdown ticker
  useEffect(() => {
    const updateTicker = () => {
      const diff = Math.max(0, expiresAt - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff < 15 * 60 * 1000) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft(`00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}#key=${rawKeyBase64}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNick.trim()) {
      onUpdateProfile(newNick.trim(), currentAvatarColor);
      setShowProfileEdit(false);
    }
  };

  return (
    <>
      <header className="px-4 sm:px-6 py-3.5 bg-[#0a0a0a]/90 border-b border-white/5 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3 select-none">
        {/* Left: Room Title & Room ID */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-white truncate max-w-[140px] sm:max-w-[240px]">
                {roomTitle || 'Private Room'}
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-500">
              <span>ROOM: {roomId}</span>
              <span>•</span>
              <span className="text-slate-400">
                YOU: <strong className="text-slate-200 cursor-pointer hover:underline" onClick={() => setShowProfileEdit(true)}>{currentDisplayName}</strong>
              </span>
              <button
                onClick={() => setShowProfileEdit(true)}
                className="text-slate-500 hover:text-slate-300"
                title="Change Identity Handle"
              >
                <UserPen className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Center/Right: Expiration Timer, Security, Presence, Kill Switch */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Expiration Countdown Pill */}
          <div
            className={`flex flex-col items-center justify-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl border transition-colors ${
              isUrgent
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-white/5 border-white/5 text-slate-300'
            }`}
            title="Room and all messages auto-delete at zero"
          >
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              <Clock className={`w-3 h-3 ${isUrgent ? 'text-red-400' : 'text-indigo-400'}`} />
              <span>EXPIRES IN</span>
            </div>
            <div className="text-xs sm:text-sm font-mono font-bold text-indigo-400 tracking-tighter">
              {timeLeft || 'calculating...'}
            </div>
          </div>

          {/* Cryptographic Security Badge */}
          <div className="hidden sm:block">
            <SecurityBadge cryptoKey={cryptoKey} hasPin={hasPin} />
          </div>

          {/* Quick Copy Share Button */}
          <button
            onClick={handleCopyLink}
            id="header-copy-link-btn"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
            title="Copy Zero-Knowledge Invite Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          {/* Members Presence Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Active Members"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{members.length}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showMembers && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-2xl p-3 text-xs shadow-2xl z-40 space-y-2 animate-fade-in">
                <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                  Active in Room ({members.length})
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                        />
                        <span className="text-slate-200 font-medium truncate max-w-[120px]">
                          {m.displayName} {m.id === currentMemberId ? '(You)' : ''}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">online</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Destroy Room Killswitch */}
          <button
            onClick={() => setShowDestroyConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
            title="Immediately destroy room and wipe all data"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Destroy</span>
          </button>
        </div>
      </header>

      {/* Change Identity Handle Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Update Anonymous Handle</h3>
            <p className="text-xs text-slate-400">
              Change your temporary session pseudonym visible to active peers.
            </p>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <input
                type="text"
                value={newNick}
                onChange={e => setNewNick(e.target.value)}
                maxLength={24}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileEdit(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
                >
                  Save Handle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destroy Room Confirmation Modal */}
      {showDestroyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Destroy This Room?</h3>
                <p className="text-xs text-red-400 font-mono">IRREVERSIBLE INSTANT WIPE</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action immediately terminates the session for all participants and permanently erases all message logs, memory, and uploaded files from the server.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDestroyConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDestroyConfirm(false);
                  onDestroyRoom();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                Yes, Destroy Room
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
