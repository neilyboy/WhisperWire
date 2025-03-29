const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Class for managing communication channels
 */
class ChannelManager {
  constructor() {
    this.channels = new Map();
    
    // Create a default channel for system-wide communication
    this.createChannel('System', 'System-wide announcements and notifications');
  }

  /**
   * Create a new channel
   * @param {string} name - Channel name
   * @param {string} description - Channel description
   * @returns {Object} Created channel
   */
  createChannel(name, description = '') {
    const channelId = uuidv4();
    
    const channel = {
      id: channelId,
      name,
      description,
      clients: new Set(),
      producers: new Set(),
      createdAt: new Date().toISOString()
    };
    
    this.channels.set(channelId, channel);
    logger.info(`Channel created: ${name} (${channelId})`);
    
    return this.getChannelInfo(channelId);
  }

  /**
   * Get all channels
   * @returns {Array} Array of channel info objects
   */
  getAllChannels() {
    const channelList = [];
    
    for (const channelId of this.channels.keys()) {
      channelList.push(this.getChannelInfo(channelId));
    }
    
    return channelList;
  }

  /**
   * Get channel by ID
   * @param {string} channelId - Channel ID
   * @returns {Object} Channel info or null if not found
   */
  getChannel(channelId) {
    if (!this.channels.has(channelId)) {
      return null;
    }
    
    return this.getChannelInfo(channelId);
  }

  /**
   * Update channel properties
   * @param {string} channelId - Channel ID
   * @param {Object} updates - Properties to update
   * @returns {Object} Updated channel or null if not found
   */
  updateChannel(channelId, updates) {
    if (!this.channels.has(channelId)) {
      return null;
    }
    
    const channel = this.channels.get(channelId);
    
    // Update allowed properties
    if (updates.name) channel.name = updates.name;
    if (updates.description) channel.description = updates.description;
    
    this.channels.set(channelId, channel);
    logger.info(`Channel updated: ${channelId}`);
    
    return this.getChannelInfo(channelId);
  }

  /**
   * Delete a channel
   * @param {string} channelId - Channel ID
   * @returns {boolean} Success or failure
   */
  deleteChannel(channelId) {
    // Don't allow deleting the System channel
    if (this.channels.get(channelId)?.name === 'System') {
      logger.warn('Attempted to delete System channel');
      return false;
    }
    
    const success = this.channels.delete(channelId);
    
    if (success) {
      logger.info(`Channel deleted: ${channelId}`);
    }
    
    return success;
  }

  /**
   * Add a client to a channel
   * @param {string} channelId - Channel ID
   * @param {string} clientId - Client ID
   * @returns {boolean} Success or failure
   */
  addClientToChannel(channelId, clientId) {
    if (!this.channels.has(channelId)) {
      return false;
    }
    
    const channel = this.channels.get(channelId);
    channel.clients.add(clientId);
    
    this.channels.set(channelId, channel);
    logger.info(`Client ${clientId} added to channel ${channelId}`);
    
    return true;
  }

  /**
   * Remove a client from a channel
   * @param {string} channelId - Channel ID
   * @param {string} clientId - Client ID
   * @returns {boolean} Success or failure
   */
  removeClientFromChannel(channelId, clientId) {
    if (!this.channels.has(channelId)) {
      return false;
    }
    
    const channel = this.channels.get(channelId);
    const success = channel.clients.delete(clientId);
    
    this.channels.set(channelId, channel);
    
    if (success) {
      logger.info(`Client ${clientId} removed from channel ${channelId}`);
    }
    
    return success;
  }

  /**
   * Add a producer to a channel
   * @param {string} channelId - Channel ID
   * @param {string} producerId - Producer ID
   * @returns {boolean} Success or failure
   */
  addProducerToChannel(channelId, producerId) {
    if (!this.channels.has(channelId)) {
      return false;
    }
    
    const channel = this.channels.get(channelId);
    channel.producers.add(producerId);
    
    this.channels.set(channelId, channel);
    logger.debug(`Producer ${producerId} added to channel ${channelId}`);
    
    return true;
  }

  /**
   * Remove a producer from a channel
   * @param {string} channelId - Channel ID
   * @param {string} producerId - Producer ID
   * @returns {boolean} Success or failure
   */
  removeProducerFromChannel(channelId, producerId) {
    if (!this.channels.has(channelId)) {
      return false;
    }
    
    const channel = this.channels.get(channelId);
    const success = channel.producers.delete(producerId);
    
    this.channels.set(channelId, channel);
    
    if (success) {
      logger.debug(`Producer ${producerId} removed from channel ${channelId}`);
    }
    
    return success;
  }

  /**
   * Get all producers in a channel
   * @param {string} channelId - Channel ID
   * @returns {Array} Array of producer IDs
   */
  getChannelProducers(channelId) {
    if (!this.channels.has(channelId)) {
      return [];
    }
    
    const channel = this.channels.get(channelId);
    return Array.from(channel.producers);
  }

  /**
   * Get all clients in a channel
   * @param {string} channelId - Channel ID
   * @returns {Array} Array of client IDs
   */
  getChannelClients(channelId) {
    if (!this.channels.has(channelId)) {
      return [];
    }
    
    const channel = this.channels.get(channelId);
    return Array.from(channel.clients);
  }

  /**
   * Get sanitized channel info
   * @param {string} channelId - Channel ID
   * @returns {Object} Sanitized channel info
   */
  getChannelInfo(channelId) {
    if (!this.channels.has(channelId)) {
      return null;
    }
    
    const channel = this.channels.get(channelId);
    
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      clientCount: channel.clients.size,
      createdAt: channel.createdAt
    };
  }
}

module.exports = ChannelManager;
