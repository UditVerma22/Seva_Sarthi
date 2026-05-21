import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this._listeners = new Map(); // Track listeners for re-attachment on reconnect
  }

  connect(token) {
    // If already connected with same token, skip
    if (this.socket?.connected && this._currentToken === token) return;

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this._currentToken = token;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    // Re-attach any previously registered listeners
    this._listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket.on(event, cb);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._currentToken = null;
  }

  on(event, callback) {
    // Track the listener
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Attach to current socket if connected
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    // Remove from tracking
    if (callback && this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
      if (this._listeners.get(event).size === 0) {
        this._listeners.delete(event);
      }
    } else if (!callback) {
      // Remove all listeners for this event
      this._listeners.delete(event);
    }

    // Remove from socket
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

const socketService = new SocketService();
export default socketService;
