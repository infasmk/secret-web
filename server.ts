/**
 * Production-Grade Private Temporary Messaging Backend Server
 * Express + WebSocket + Ephemeral In-Memory Storage + File Vault + Auto-Cleanup Sweeper
 */

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Enable JSON parser with 30MB limit for encrypted media blobs
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Ephemeral Media Storage Directory
const TEMP_UPLOADS_DIR = path.join(process.cwd(), '.temp_vault');
if (!fs.existsSync(TEMP_UPLOADS_DIR)) {
  fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
}

// In-Memory Ephemeral Stores (Zero-Persistence on disk for message ciphertext & keys)
interface StoredMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  type: string;
  encryptedContent: { iv: string; ciphertext: string };
  media?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    isViewOnce: boolean;
    viewedBy?: string[];
    burnedAt?: number;
  };
  createdAt: number;
  expiresAt: number;
  isViewOnce?: boolean;
  isBurned?: boolean;
}

interface StoredRoom {
  id: string;
  title: string;
  createdAt: number;
  expiresAt: number;
  creatorId: string;
  security: {
    hasPin: boolean;
    pinSalt?: string;
    pinHash?: string;
    allowFileUploads: boolean;
    allowViewOnce: boolean;
    maxFileSizeMb: number;
  };
  status: 'active' | 'expired' | 'destroyed';
  destructionReason?: string;
  encryptionVersion: string;
  members: Map<string, { id: string; displayName: string; avatarColor: string; joinedAt: number; lastSeenAt: number }>;
  messages: StoredMessage[];
  fileIds: Set<string>;
}

const rooms = new Map<string, StoredRoom>();

// Rate-limiting and abuse protection maps
const pinAttempts = new Map<string, { count: number; lockedUntil: number }>();
const creationRateLimit = new Map<string, number[]>();

// Helper to sanitize IP
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: Date.now(),
    privacy: 'Zero-Knowledge E2EE Storage Active',
  });
});

// Create Private Room
app.post('/api/rooms/create', (req, res) => {
  const ip = getClientIp(req);
  const now = Date.now();

  // Rate limiting: Max 15 rooms per 10 minutes per IP
  const attempts = (creationRateLimit.get(ip) || []).filter(t => now - t < 600000);
  if (attempts.length >= 15) {
    return res.status(429).json({ error: 'Room creation rate limit exceeded. Please wait a few minutes.' });
  }
  attempts.push(now);
  creationRateLimit.set(ip, attempts);

  const { id, title, expirationMs, creatorId, security, encryptionVersion } = req.body;

  if (!id || typeof id !== 'string' || id.length < 5) {
    return res.status(400).json({ error: 'Invalid room identifier' });
  }

  if (rooms.has(id)) {
    return res.status(409).json({ error: 'Room identifier collision. Please try again.' });
  }

  // Expiration bounds: min 1 minute, max 7 days
  const minMs = 60 * 1000;
  const maxMs = 7 * 24 * 60 * 60 * 1000;
  const validExpirationMs = Math.min(Math.max(Number(expirationMs) || 86400000, minMs), maxMs);

  const newRoom: StoredRoom = {
    id,
    title: (title || 'Private Session').slice(0, 50),
    createdAt: now,
    expiresAt: now + validExpirationMs,
    creatorId: creatorId || 'anon_creator',
    security: {
      hasPin: Boolean(security?.hasPin),
      pinSalt: security?.pinSalt || '',
      pinHash: security?.pinHash || '',
      allowFileUploads: security?.allowFileUploads !== false,
      allowViewOnce: security?.allowViewOnce !== false,
      maxFileSizeMb: Math.min(Number(security?.maxFileSizeMb) || 25, 50),
    },
    status: 'active',
    encryptionVersion: encryptionVersion || 'AES-GCM-256',
    members: new Map(),
    messages: [],
    fileIds: new Set(),
  };

  rooms.set(id, newRoom);

  res.status(201).json({
    id: newRoom.id,
    title: newRoom.title,
    createdAt: newRoom.createdAt,
    expiresAt: newRoom.expiresAt,
    security: {
      hasPin: newRoom.security.hasPin,
      pinSalt: newRoom.security.pinSalt,
      allowFileUploads: newRoom.security.allowFileUploads,
      allowViewOnce: newRoom.security.allowViewOnce,
      maxFileSizeMb: newRoom.security.maxFileSizeMb,
    },
    encryptionVersion: newRoom.encryptionVersion,
  });
});

// Get Room Metadata (public info only, no keys/plaintext)
app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  const now = Date.now();

  if (!room) {
    return res.status(404).json({ error: 'Room not found or has been permanently destroyed' });
  }

  if (room.status !== 'active' || now >= room.expiresAt) {
    return res.status(410).json({
      error: 'This private room has expired or was destroyed',
      status: room.status === 'destroyed' ? 'destroyed' : 'expired',
      destructionReason: room.destructionReason,
    });
  }

  res.json({
    id: room.id,
    title: room.title,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    status: room.status,
    security: {
      hasPin: room.security.hasPin,
      pinSalt: room.security.pinSalt,
      allowFileUploads: room.security.allowFileUploads,
      allowViewOnce: room.security.allowViewOnce,
      maxFileSizeMb: room.security.maxFileSizeMb,
    },
    encryptionVersion: room.encryptionVersion,
    memberCount: room.members.size,
  });
});

// Verify PIN Attempt
app.post('/api/rooms/:id/verify-pin', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room || room.status !== 'active') {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!room.security.hasPin) {
    return res.json({ verified: true });
  }

  const ip = getClientIp(req);
  const lockKey = `${ip}:${room.id}`;
  const now = Date.now();
  const attemptData = pinAttempts.get(lockKey) || { count: 0, lockedUntil: 0 };

  if (attemptData.lockedUntil > now) {
    const remainingSec = Math.ceil((attemptData.lockedUntil - now) / 1000);
    return res.status(429).json({
      error: `Too many failed PIN attempts. Locked for ${remainingSec}s`,
      lockedUntil: attemptData.lockedUntil,
    });
  }

  const { pinHash } = req.body;
  if (!pinHash || pinHash !== room.security.pinHash) {
    attemptData.count += 1;
    if (attemptData.count >= 5) {
      attemptData.lockedUntil = now + 60000; // 1 minute lockout
      attemptData.count = 0;
    }
    pinAttempts.set(lockKey, attemptData);
    return res.status(401).json({
      error: 'Incorrect PIN code',
      attemptsRemaining: Math.max(0, 5 - attemptData.count),
    });
  }

  // Reset attempt counter on success
  pinAttempts.delete(lockKey);
  res.json({ verified: true });
});

// Fetch Paginated Messages (Ciphertext only)
app.get('/api/rooms/:id/messages', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room || room.status !== 'active') {
    return res.status(404).json({ error: 'Room not found' });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = Number(req.query.before) || Date.now() + 10000;

  const filtered = room.messages
    .filter(m => m.createdAt < before)
    .slice(-limit);

  res.json({ messages: filtered });
});

// Encrypted Media Upload
app.post('/api/rooms/:id/media', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room || room.status !== 'active') {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (!room.security.allowFileUploads) {
    return res.status(403).json({ error: 'File uploads are disabled in this room' });
  }

  const { fileId, iv, encryptedData, fileSize, mimeType, isViewOnce, fileName } = req.body;

  if (!fileId || !iv || !encryptedData) {
    return res.status(400).json({ error: 'Missing encrypted media payload' });
  }

  const maxBytes = (room.security.maxFileSizeMb || 25) * 1024 * 1024;
  if (fileSize > maxBytes) {
    return res.status(413).json({ error: `File exceeds room limit of ${room.security.maxFileSizeMb}MB` });
  }

  try {
    const binaryBuffer = Buffer.from(encryptedData, 'base64');
    const filePath = path.join(TEMP_UPLOADS_DIR, `${room.id}_${fileId}.vault`);
    fs.writeFileSync(filePath, JSON.stringify({ iv, data: binaryBuffer.toString('base64'), mimeType }));
    room.fileIds.add(fileId);

    res.status(201).json({
      fileId,
      size: binaryBuffer.length,
      isViewOnce: Boolean(isViewOnce),
      uploadedAt: Date.now(),
    });
  } catch (err) {
    console.error('Media upload storage error:', err);
    res.status(500).json({ error: 'Failed to process media storage' });
  }
});

// Download Encrypted Media Stream
app.get('/api/rooms/:id/media/:fileId', (req, res) => {
  const { id: roomId, fileId } = req.params;
  const room = rooms.get(roomId);
  if (!room || room.status !== 'active') {
    return res.status(404).json({ error: 'Room not found' });
  }

  const filePath = path.join(TEMP_UPLOADS_DIR, `${roomId}_${fileId}.vault`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Encrypted media not found or already burned' });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read media' });
  }
});

// Burn / Delete Ephemeral Media
app.delete('/api/rooms/:id/media/:fileId', (req, res) => {
  const { id: roomId, fileId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const filePath = path.join(TEMP_UPLOADS_DIR, `${roomId}_${fileId}.vault`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  }
  room.fileIds.delete(fileId);

  // Mark message media as burned
  const msg = room.messages.find(m => m.media?.fileId === fileId);
  if (msg) {
    msg.isBurned = true;
    if (msg.media) msg.media.burnedAt = Date.now();
  }

  // Notify connected sockets
  broadcastToRoom(roomId, {
    type: 'media_burned',
    roomId,
    payload: { fileId, messageId: msg?.id },
  });

  res.json({ burned: true });
});

// Instant Room Destruction
app.post('/api/rooms/:id/destroy', (req, res) => {
  const { id: roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  destroyRoom(roomId, 'Destroyed manually by participant');
  res.json({ destroyed: true });
});

// ----------------------------------------------------
// WEBSOCKET REAL-TIME ENGINE
// ----------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

// Track client connections: WebSocket -> { roomId, memberId, displayName, avatarColor }
interface ClientConnection {
  ws: WebSocket;
  roomId: string;
  memberId: string;
  displayName: string;
  avatarColor: string;
  isAlive: boolean;
}

const connections = new Map<WebSocket, ClientConnection>();

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const json = JSON.stringify(message);
  for (const [ws, client] of connections.entries()) {
    if (client.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const client: ClientConnection = {
    ws,
    roomId: '',
    memberId: '',
    displayName: '',
    avatarColor: '',
    isAlive: true,
  };
  connections.set(ws, client);

  ws.on('pong', () => {
    client.isAlive = true;
  });

  ws.on('message', (data: string) => {
    try {
      const parsed = JSON.parse(data.toString());
      handleWsMessage(ws, client, parsed);
    } catch (err) {
      console.error('Invalid WS payload:', err);
    }
  });

  ws.on('close', () => {
    handleWsDisconnect(ws, client);
  });
});

function handleWsMessage(ws: WebSocket, client: ClientConnection, msg: any) {
  const { type, roomId, memberId, displayName, avatarColor, payload } = msg;

  if (type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    return;
  }

  const room = rooms.get(roomId);
  if (!room || room.status !== 'active') {
    ws.send(JSON.stringify({ type: 'room_destroyed', roomId, payload: { reason: 'Room expired or destroyed' } }));
    return;
  }

  if (type === 'join') {
    client.roomId = roomId;
    client.memberId = memberId;
    client.displayName = displayName || 'Anonymous Guest';
    client.avatarColor = avatarColor || '#10B981';

    room.members.set(memberId, {
      id: memberId,
      displayName: client.displayName,
      avatarColor: client.avatarColor,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    });

    // Send full current room state to joining member
    const activeMembers = Array.from(room.members.values());
    ws.send(
      JSON.stringify({
        type: 'room_state',
        roomId,
        payload: {
          room: {
            id: room.id,
            title: room.title,
            createdAt: room.createdAt,
            expiresAt: room.expiresAt,
            status: room.status,
            security: room.security,
            encryptionVersion: room.encryptionVersion,
          },
          members: activeMembers,
          messages: room.messages.slice(-50),
        },
      })
    );

    // Notify other peers
    broadcastToRoom(
      roomId,
      {
        type: 'member_joined',
        roomId,
        payload: {
          member: room.members.get(memberId),
          members: Array.from(room.members.values()),
        },
      },
      ws
    );
  } else if (type === 'message') {
    const newMessage: StoredMessage = {
      id: payload.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      roomId,
      senderId: memberId,
      senderName: client.displayName,
      senderColor: client.avatarColor,
      type: payload.type || 'text',
      encryptedContent: payload.encryptedContent,
      media: payload.media,
      createdAt: Date.now(),
      expiresAt: room.expiresAt,
      isViewOnce: payload.isViewOnce,
      isBurned: false,
    };

    // Store in ephemeral memory (max 500 messages per room)
    room.messages.push(newMessage);
    if (room.messages.length > 500) {
      room.messages.shift();
    }

    // Broadcast to everyone in the room
    broadcastToRoom(roomId, {
      type: 'message',
      roomId,
      payload: newMessage,
    });
  } else if (type === 'typing') {
    broadcastToRoom(
      roomId,
      {
        type: 'typing_update',
        roomId,
        payload: {
          memberId,
          displayName: client.displayName,
          isTyping: Boolean(payload.isTyping),
        },
      },
      ws
    );
  } else if (type === 'burn_media') {
    const fileId = payload.fileId;
    if (fileId) {
      const filePath = path.join(TEMP_UPLOADS_DIR, `${roomId}_${fileId}.vault`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      }
      room.fileIds.delete(fileId);

      const targetMsg = room.messages.find(m => m.media?.fileId === fileId);
      if (targetMsg) {
        targetMsg.isBurned = true;
        if (targetMsg.media) targetMsg.media.burnedAt = Date.now();
      }

      broadcastToRoom(roomId, {
        type: 'media_burned',
        roomId,
        payload: { fileId, messageId: targetMsg?.id },
      });
    }
  } else if (type === 'destroy_room') {
    destroyRoom(roomId, 'Room destroyed by participant');
  }
}

function handleWsDisconnect(ws: WebSocket, client: ClientConnection) {
  if (client.roomId && client.memberId) {
    const room = rooms.get(client.roomId);
    if (room) {
      room.members.delete(client.memberId);
      broadcastToRoom(client.roomId, {
        type: 'member_left',
        roomId: client.roomId,
        payload: {
          memberId: client.memberId,
          members: Array.from(room.members.values()),
        },
      });
    }
  }
  connections.delete(ws);
}

// Attach WebSocket upgrade to HTTP server
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/ws' || pathname.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Periodic WebSocket heartbeat check
setInterval(() => {
  for (const [ws, client] of connections.entries()) {
    if (!client.isAlive) {
      ws.terminate();
      connections.delete(ws);
      continue;
    }
    client.isAlive = false;
    ws.ping();
  }
}, 30000);

// ----------------------------------------------------
// PURGE & DESTRUCTION ENGINE
// ----------------------------------------------------

function destroyRoom(roomId: string, reason: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = 'destroyed';
  room.destructionReason = reason;

  // Broadcast destroy event to all open connections
  broadcastToRoom(roomId, {
    type: 'room_destroyed',
    roomId,
    payload: { reason },
  });

  // Purge all physical encrypted files
  for (const fileId of room.fileIds) {
    const filePath = path.join(TEMP_UPLOADS_DIR, `${roomId}_${fileId}.vault`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }
  }
  room.fileIds.clear();
  room.messages = [];
  room.members.clear();

  // Close active WebSockets in that room
  for (const [ws, client] of connections.entries()) {
    if (client.roomId === roomId) {
      try {
        ws.close(1000, 'Room destroyed');
      } catch (_) {}
      connections.delete(ws);
    }
  }

  // Delete room record from memory
  rooms.delete(roomId);
}

// Background Sweeper (Runs every 10 seconds to delete expired rooms & files)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now >= room.expiresAt || room.status !== 'active') {
      destroyRoom(roomId, 'Automatic room expiration');
    }
  }

  // Also clean any orphaned .vault files older than 24 hours
  try {
    const files = fs.readdirSync(TEMP_UPLOADS_DIR);
    for (const file of files) {
      const fullPath = path.join(TEMP_UPLOADS_DIR, file);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > 86400000) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (_) {}
}, 10000);

// ----------------------------------------------------
// VITE INTEGRATION / PRODUCTION SPA SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ephemeral Privacy Messaging Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
