/**
 * Client-Side Real-Time WebSocket Manager
 * Handles auto-reconnect, message routing, heartbeats, and room subscription
 */

import { WsClientMessage, WsServerMessage } from '../types';

export type SocketEventHandler = (msg: WsServerMessage) => void;

export class ChatSocketClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private memberId: string;
  private displayName: string;
  private avatarColor: string;
  private listeners: Set<SocketEventHandler> = new Set();
  private isExplicitlyClosed = false;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  public isConnected = false;

  constructor(roomId: string, memberId: string, displayName: string, avatarColor: string) {
    this.roomId = roomId;
    this.memberId = memberId;
    this.displayName = displayName;
    this.avatarColor = avatarColor;
  }

  public updateProfile(displayName: string, avatarColor: string) {
    this.displayName = displayName;
    this.avatarColor = avatarColor;
    if (this.isConnected) {
      this.send({
        type: 'join',
        roomId: this.roomId,
        memberId: this.memberId,
        displayName: this.displayName,
        avatarColor: this.avatarColor,
      });
    }
  }

  public connect() {
    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Send join payload immediately
        this.send({
          type: 'join',
          roomId: this.roomId,
          memberId: this.memberId,
          displayName: this.displayName,
          avatarColor: this.avatarColor,
        });

        // Setup ping heartbeat every 20 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping', roomId: this.roomId, memberId: this.memberId }));
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WsServerMessage = JSON.parse(event.data);
          this.listeners.forEach(fn => fn(parsed));
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.pingInterval) clearInterval(this.pingInterval);

        if (!this.isExplicitlyClosed) {
          // Attempt automatic reconnection after 2 seconds
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection event error, will retry...', err);
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
    }
  }

  public send(msg: WsClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public subscribe(fn: SocketEventHandler): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }
}
