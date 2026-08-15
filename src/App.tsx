/**
 * Main Application Orchestrator for Private Temporary Messaging Platform
 */

import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { RoomShareModal } from './components/RoomShareModal';
import { ChatRoom } from './components/ChatRoom';

export default function App() {
  // Navigation State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeKeyBase64, setActiveKeyBase64] = useState<string | undefined>(undefined);
  const [activePinHash, setActivePinHash] = useState<string | undefined>(undefined);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Newly Created Room Share Screen State
  const [createdRoomInfo, setCreatedRoomInfo] = useState<{
    roomId: string;
    rawKeyBase64: string;
    hasPin: boolean;
    expiresAt: number;
  } | null>(null);

  // Initial Route Check (handles incoming shared links, e.g. /room/abc-123#key=...)
  useEffect(() => {
    const parseUrlRoute = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      if (pathname.includes('/room/')) {
        const parts = pathname.split('/room/')[1];
        const extractedRoomId = parts.split('/')[0].split('?')[0].trim();
        let extractedKey: string | undefined;

        if (hash && hash.includes('key=')) {
          extractedKey = hash.split('key=')[1]?.split('&')[0]?.trim();
        }

        if (extractedRoomId) {
          setActiveRoomId(extractedRoomId);
          setActiveKeyBase64(extractedKey);
        }
      } else {
        setActiveRoomId(null);
        setActiveKeyBase64(undefined);
      }
    };

    parseUrlRoute();
    window.addEventListener('popstate', parseUrlRoute);
    return () => window.removeEventListener('popstate', parseUrlRoute);
  }, []);

  // Handle Room Created by Creator
  const handleRoomCreated = (
    roomId: string,
    rawKeyBase64: string,
    hasPin: boolean,
    expiresAt: number
  ) => {
    setIsCreateOpen(false);
    // Show the share screen first so creator can copy link
    setCreatedRoomInfo({ roomId, rawKeyBase64, hasPin, expiresAt });
  };

  // Enter the newly created room
  const handleEnterCreatedRoom = () => {
    if (createdRoomInfo) {
      const { roomId, rawKeyBase64 } = createdRoomInfo;
      setCreatedRoomInfo(null);
      // Update browser URL without full reload
      window.history.pushState({}, '', `/room/${roomId}#key=${rawKeyBase64}`);
      setActiveRoomId(roomId);
      setActiveKeyBase64(rawKeyBase64);
    }
  };

  // Handle Joining from Modal
  const handleJoinRoom = (roomId: string, rawKeyBase64?: string, pinHash?: string) => {
    setIsJoinOpen(false);
    const keyHash = rawKeyBase64 ? `#key=${rawKeyBase64}` : '';
    window.history.pushState({}, '', `/room/${roomId}${keyHash}`);
    setActiveRoomId(roomId);
    setActiveKeyBase64(rawKeyBase64);
    setActivePinHash(pinHash);
  };

  // Exit Room back to Landing Page
  const handleExitRoom = () => {
    window.history.pushState({}, '', '/');
    setActiveRoomId(null);
    setActiveKeyBase64(undefined);
    setActivePinHash(undefined);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 selection:bg-indigo-500/30">
      {activeRoomId ? (
        <ChatRoom
          roomId={activeRoomId}
          rawKeyBase64={activeKeyBase64}
          pinHash={activePinHash}
          onExit={handleExitRoom}
        />
      ) : (
        <LandingPage
          onCreateClick={() => setIsCreateOpen(true)}
          onJoinClick={() => setIsJoinOpen(true)}
        />
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoinRoom={handleJoinRoom}
      />

      {/* Room Created Share / Ready Screen */}
      {createdRoomInfo && (
        <RoomShareModal
          isOpen={true}
          roomId={createdRoomInfo.roomId}
          rawKeyBase64={createdRoomInfo.rawKeyBase64}
          expiresAt={createdRoomInfo.expiresAt}
          hasPin={createdRoomInfo.hasPin}
          onEnterRoom={handleEnterCreatedRoom}
          onClose={() => setCreatedRoomInfo(null)}
        />
      )}
    </div>
  );
}
