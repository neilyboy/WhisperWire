const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Class for managing clients and their permissions
 */
class ClientManager {
  constructor() {
    this.clients = new Map();
    this.pendingClients = new Map();
    
    // Create admin client on startup if configured
    if (process.env.CREATE_ADMIN && process.env.ADMIN_NAME) {
      this.createAdminClient(process.env.ADMIN_NAME);
    }
  }

  /**
   * Create an admin client
   * @param {string} name - Admin client name
   * @returns {Object} Created admin client
   */
  createAdminClient(name) {
    const adminId = uuidv4();
    
    const adminClient = {
      id: adminId,
      name,
      socketId: null, // Will be set when admin connects
      isAdmin: true,
      authorized: true,
      channels: [],
      permissions: {
        speakToAll: true,
        listenToAll: true
      },
      channelSettings: new Map(),
      createdAt: new Date().toISOString()
    };
    
    this.clients.set(adminId, adminClient);
    logger.info(`Admin client created: ${name} (${adminId})`);
    
    return this.getClientInfo(adminId);
  }

  /**
   * Add a client to the pending authorization queue
   * @param {string} socketId - Socket ID
   * @param {string} name - Client name
   * @returns {Object} Created pending client
   */
  addPendingClient(socketId, name) {
    const clientId = uuidv4();
    
    const pendingClient = {
      id: clientId,
      name,
      socketId,
      pending: true,
      createdAt: new Date().toISOString()
    };
    
    this.pendingClients.set(clientId, pendingClient);
    logger.info(`Pending client added: ${name} (${clientId})`);
    
    return {
      id: clientId,
      name,
      pending: true
    };
  }

  /**
   * Authorize a pending client
   * @param {string} clientId - Client ID
   * @param {Array} channels - Array of channel IDs
   * @param {Object} permissions - Client permissions
   * @returns {Object} Authorized client or null if not found
   */
  authorizeClient(clientId, channels, permissions) {
    if (!this.pendingClients.has(clientId)) {
      return null;
    }
    
    const pendingClient = this.pendingClients.get(clientId);
    
    const client = {
      id: clientId,
      name: pendingClient.name,
      socketId: pendingClient.socketId,
      isAdmin: permissions.isAdmin || false,
      authorized: true,
      channels: channels || [],
      permissions: {
        speakToAll: permissions.speakToAll || false,
        listenToAll: permissions.listenToAll || false,
        speakTo: permissions.speakTo || {},
        listenTo: permissions.listenTo || {}
      },
      channelSettings: new Map(),
      createdAt: pendingClient.createdAt,
      authorizedAt: new Date().toISOString()
    };
    
    // Initialize channel settings for each channel
    if (channels) {
      channels.forEach(channelId => {
        client.channelSettings.set(channelId, {
          muted: false,
          volume: 1.0 // Default volume is 100%
        });
      });
    }
    
    // Add to clients and remove from pending
    this.clients.set(clientId, client);
    this.pendingClients.delete(clientId);
    
    logger.info(`Client authorized: ${client.name} (${clientId})`);
    
    return this.getClientInfo(clientId);
  }

  /**
   * Reject a pending client
   * @param {string} clientId - Client ID
   * @returns {boolean} Success or failure
   */
  rejectClient(clientId) {
    const success = this.pendingClients.delete(clientId);
    
    if (success) {
      logger.info(`Pending client rejected: ${clientId}`);
    }
    
    return success;
  }

  /**
   * Get all clients
   * @returns {Array} Array of client info objects
   */
  getAllClients() {
    const clientList = [];
    
    for (const clientId of this.clients.keys()) {
      clientList.push(this.getClientInfo(clientId));
    }
    
    return clientList;
  }

  /**
   * Get all pending clients
   * @returns {Array} Array of pending client info objects
   */
  getAllPendingClients() {
    const pendingList = [];
    
    for (const [clientId, client] of this.pendingClients.entries()) {
      pendingList.push({
        id: clientId,
        name: client.name,
        pending: true,
        createdAt: client.createdAt
      });
    }
    
    return pendingList;
  }

  /**
   * Get client by ID
   * @param {string} clientId - Client ID
   * @returns {Object} Client info or null if not found
   */
  getClient(clientId) {
    if (!this.clients.has(clientId)) {
      return null;
    }
    
    return this.getClientInfo(clientId);
  }

  /**
   * Get client by socket ID
   * @param {string} socketId - Socket ID
   * @returns {Object} Client info or null if not found
   */
  getClientBySocketId(socketId) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.socketId === socketId) {
        return this.getClientInfo(clientId);
      }
    }
    
    return null;
  }

  /**
   * Check if a client is an admin
   * @param {string} socketId - Socket ID
   * @returns {boolean} True if admin, false otherwise
   */
  isAdmin(socketId) {
    const client = this.getClientBySocketId(socketId);
    return client && client.isAdmin;
  }

  /**
   * Remove a client
   * @param {string} clientId - Client ID
   * @returns {boolean} Success or failure
   */
  removeClient(clientId) {
    const success = this.clients.delete(clientId);
    
    if (success) {
      logger.info(`Client removed: ${clientId}`);
    }
    
    return success;
  }

  /**
   * Update a client's socket ID
   * @param {string} clientId - Client ID
   * @param {string} socketId - New socket ID
   * @returns {boolean} Success or failure
   */
  updateClientSocketId(clientId, socketId) {
    if (!this.clients.has(clientId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    client.socketId = socketId;
    
    this.clients.set(clientId, client);
    logger.info(`Client socket ID updated: ${clientId} -> ${socketId}`);
    
    return true;
  }

  /**
   * Add a client to a channel
   * @param {string} clientId - Client ID
   * @param {string} channelId - Channel ID
   * @returns {boolean} Success or failure
   */
  addClientToChannel(clientId, channelId) {
    if (!this.clients.has(clientId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    
    if (!client.channels.includes(channelId)) {
      client.channels.push(channelId);
      
      // Initialize channel settings
      if (!client.channelSettings.has(channelId)) {
        client.channelSettings.set(channelId, {
          muted: false,
          volume: 1.0 // Default volume is 100%
        });
      }
      
      this.clients.set(clientId, client);
      logger.info(`Client ${clientId} added to channel ${channelId}`);
      
      return true;
    }
    
    return false;
  }

  /**
   * Remove a client from a channel
   * @param {string} clientId - Client ID
   * @param {string} channelId - Channel ID
   * @returns {boolean} Success or failure
   */
  removeClientFromChannel(clientId, channelId) {
    if (!this.clients.has(clientId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    const channelIndex = client.channels.indexOf(channelId);
    
    if (channelIndex !== -1) {
      client.channels.splice(channelIndex, 1);
      
      // Remove channel settings
      client.channelSettings.delete(channelId);
      
      this.clients.set(clientId, client);
      logger.info(`Client ${clientId} removed from channel ${channelId}`);
      
      return true;
    }
    
    return false;
  }

  /**
   * Check if a client can speak to a channel
   * @param {string} clientId - Client ID
   * @param {string} channelId - Channel ID
   * @returns {boolean} True if allowed, false otherwise
   */
  canSpeak(clientId, channelId) {
    if (!this.clients.has(clientId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    
    // Check if client is in the channel
    if (!client.channels.includes(channelId)) {
      return false;
    }
    
    // Check if client has global speak permission
    if (client.permissions.speakToAll) {
      return true;
    }
    
    // Check if client has specific speak permission for this channel
    return client.permissions.speakTo[channelId] === true;
  }

  /**
   * Check if a client can listen to a channel
   * @param {string} clientId - Client ID
   * @param {string} channelId - Channel ID
   * @returns {boolean} True if allowed, false otherwise
   */
  canListen(clientId, channelId) {
    if (!this.clients.has(clientId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    
    // Check if client is in the channel
    if (!client.channels.includes(channelId)) {
      return false;
    }
    
    // Check if client has global listen permission
    if (client.permissions.listenToAll) {
      return true;
    }
    
    // Check if client has specific listen permission for this channel
    return client.permissions.listenTo[channelId] === true;
  }

  /**
   * Set the mute status for a client's channel
   * @param {string} clientId - Client ID
   * @param {string} channelId - Channel ID
   * @param {boolean} muted - Mute status
   * @returns {boolean} Success or failure
   */
  setChannelMuteStatus(clientId, channelId, muted) {
    if (!this.clients.has(clientId) || !this.clients.get(clientId).channelSettings.has(channelId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    const settings = client.channelSettings.get(channelId);
    
    settings.muted = muted;
    client.channelSettings.set(channelId, settings);
    
    this.clients.set(clientId, client);
    logger.info(`Client ${clientId} ${muted ? 'muted' : 'unmuted'} channel ${channelId}`);
    
    return true;
  }

  /**
   * Set the volume for a client's channel
   * @param {string} clientId - Client ID
   * @param {string} channelId - Channel ID
   * @param {number} volume - Volume level (0.0 to 1.0)
   * @returns {boolean} Success or failure
   */
  setChannelVolume(clientId, channelId, volume) {
    if (!this.clients.has(clientId) || !this.clients.get(clientId).channelSettings.has(channelId)) {
      return false;
    }
    
    // Ensure volume is between 0 and 1
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    
    const client = this.clients.get(clientId);
    const settings = client.channelSettings.get(channelId);
    
    settings.volume = normalizedVolume;
    client.channelSettings.set(channelId, settings);
    
    this.clients.set(clientId, client);
    logger.info(`Client ${clientId} set volume for channel ${channelId} to ${normalizedVolume}`);
    
    return true;
  }

  /**
   * Update client permissions
   * @param {string} clientId - Client ID
   * @param {Object} permissions - Updated permissions
   * @returns {boolean} Success or failure
   */
  updateClientPermissions(clientId, permissions) {
    if (!this.clients.has(clientId)) {
      return false;
    }
    
    const client = this.clients.get(clientId);
    
    // Update permissions
    if (permissions.speakToAll !== undefined) {
      client.permissions.speakToAll = permissions.speakToAll;
    }
    
    if (permissions.listenToAll !== undefined) {
      client.permissions.listenToAll = permissions.listenToAll;
    }
    
    if (permissions.speakTo) {
      client.permissions.speakTo = {
        ...client.permissions.speakTo,
        ...permissions.speakTo
      };
    }
    
    if (permissions.listenTo) {
      client.permissions.listenTo = {
        ...client.permissions.listenTo,
        ...permissions.listenTo
      };
    }
    
    this.clients.set(clientId, client);
    logger.info(`Client permissions updated: ${clientId}`);
    
    return true;
  }

  /**
   * Get sanitized client info
   * @param {string} clientId - Client ID
   * @returns {Object} Sanitized client info
   */
  getClientInfo(clientId) {
    if (!this.clients.has(clientId)) {
      return null;
    }
    
    const client = this.clients.get(clientId);
    
    // Convert channelSettings Map to Object for serialization
    const channelSettings = {};
    for (const [channel, settings] of client.channelSettings.entries()) {
      channelSettings[channel] = settings;
    }
    
    return {
      id: client.id,
      name: client.name,
      isAdmin: client.isAdmin,
      authorized: client.authorized,
      channels: client.channels,
      permissions: client.permissions,
      channelSettings,
      createdAt: client.createdAt,
      authorizedAt: client.authorizedAt
    };
  }
}

module.exports = ClientManager;
