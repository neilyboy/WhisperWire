import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.listeners = new Map();
    this.connectionListeners = [];
    this.disconnectionListeners = [];
    this.reconnectionListeners = [];
    this.errorListeners = [];
  }

  // Initialize socket connection
  connect(url, token) {
    if (this.socket) {
      this.disconnect();
    }

    const socketUrl = url || process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Setup default event listeners
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;
      this.reconnecting = false;
      this._notifyConnectionListeners();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      this.connected = false;
      this._notifyDisconnectionListeners(reason);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt #${attemptNumber}`);
      this.reconnecting = true;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.connected = true;
      this.reconnecting = false;
      this._notifyReconnectionListeners();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this._notifyErrorListeners(error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.reconnecting = false;
    }
  }

  // Check if socket is connected
  isConnected() {
    return this.connected;
  }

  // Check if socket is reconnecting
  isReconnecting() {
    return this.reconnecting;
  }

  // Add event listener with optional namespace
  on(event, callback, namespace = 'default') {
    if (!this.socket) {
      console.warn('Socket not initialized yet');
      return;
    }

    // Create namespace in listeners map if it doesn't exist
    if (!this.listeners.has(namespace)) {
      this.listeners.set(namespace, new Map());
    }

    // Get namespace listeners
    const namespaceListeners = this.listeners.get(namespace);

    // Create event listeners array if it doesn't exist
    if (!namespaceListeners.has(event)) {
      namespaceListeners.set(event, []);
    }

    // Add callback to event listeners
    namespaceListeners.get(event).push(callback);

    // Add event listener to socket
    this.socket.on(event, callback);
  }

  // Remove event listener
  off(event, callback, namespace = 'default') {
    if (!this.socket) {
      console.warn('Socket not initialized yet');
      return;
    }

    // Check if namespace exists
    if (!this.listeners.has(namespace)) {
      return;
    }

    // Get namespace listeners
    const namespaceListeners = this.listeners.get(namespace);

    // Check if event exists
    if (!namespaceListeners.has(event)) {
      return;
    }

    // Remove callback from event listeners
    const eventListeners = namespaceListeners.get(event);
    const index = eventListeners.indexOf(callback);
    
    if (index !== -1) {
      eventListeners.splice(index, 1);
      
      // Remove event listener from socket
      this.socket.off(event, callback);
    }
  }

  // Remove all event listeners for a specific namespace
  offAll(namespace = 'default') {
    if (!this.socket) {
      console.warn('Socket not initialized yet');
      return;
    }

    // Check if namespace exists
    if (!this.listeners.has(namespace)) {
      return;
    }

    // Get namespace listeners
    const namespaceListeners = this.listeners.get(namespace);

    // Remove all event listeners
    for (const [event, callbacks] of namespaceListeners.entries()) {
      for (const callback of callbacks) {
        this.socket.off(event, callback);
      }
      callbacks.length = 0;
    }

    // Clear namespace
    this.listeners.delete(namespace);
  }

  // Emit event with optional acknowledgment
  emit(event, data, callback) {
    if (!this.socket) {
      console.warn('Socket not initialized yet');
      return Promise.reject(new Error('Socket not initialized'));
    }

    return new Promise((resolve, reject) => {
      if (callback) {
        this.socket.emit(event, data, callback);
        resolve();
      } else {
        this.socket.emit(event, data, (response) => {
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      }
    });
  }

  // Add connection listener
  onConnect(callback) {
    this.connectionListeners.push(callback);
    
    // If already connected, call callback immediately
    if (this.connected) {
      callback();
    }
  }

  // Add disconnection listener
  onDisconnect(callback) {
    this.disconnectionListeners.push(callback);
  }

  // Add reconnection listener
  onReconnect(callback) {
    this.reconnectionListeners.push(callback);
  }

  // Add error listener
  onError(callback) {
    this.errorListeners.push(callback);
  }

  // Remove connection listener
  offConnect(callback) {
    const index = this.connectionListeners.indexOf(callback);
    if (index !== -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  // Remove disconnection listener
  offDisconnect(callback) {
    const index = this.disconnectionListeners.indexOf(callback);
    if (index !== -1) {
      this.disconnectionListeners.splice(index, 1);
    }
  }

  // Remove reconnection listener
  offReconnect(callback) {
    const index = this.reconnectionListeners.indexOf(callback);
    if (index !== -1) {
      this.reconnectionListeners.splice(index, 1);
    }
  }

  // Remove error listener
  offError(callback) {
    const index = this.errorListeners.indexOf(callback);
    if (index !== -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  // Notify connection listeners
  _notifyConnectionListeners() {
    for (const listener of this.connectionListeners) {
      try {
        listener();
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    }
  }

  // Notify disconnection listeners
  _notifyDisconnectionListeners(reason) {
    for (const listener of this.disconnectionListeners) {
      try {
        listener(reason);
      } catch (error) {
        console.error('Error in disconnection listener:', error);
      }
    }
  }

  // Notify reconnection listeners
  _notifyReconnectionListeners() {
    for (const listener of this.reconnectionListeners) {
      try {
        listener();
      } catch (error) {
        console.error('Error in reconnection listener:', error);
      }
    }
  }

  // Notify error listeners
  _notifyErrorListeners(error) {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    }
  }
}

// Export singleton instance
const socketManager = new SocketManager();
export default socketManager;
