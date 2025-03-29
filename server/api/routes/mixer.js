const express = require('express');
const router = express.Router();
const logger = require('../../src/utils/logger');
const { requireAdmin } = require('../../src/utils/auth');
const ChannelManager = require('../../src/models/ChannelManager');
const ClientManager = require('../../src/models/ClientManager');

// Initialize managers
const channelManager = new ChannelManager();
const clientManager = new ClientManager();

// Mixer state - in real app could be persisted to disk
const mixerState = {
  channels: {}, // channelId -> volume (0-1)
  clients: {},  // clientId -> volume (0-1)
  masterVolume: 1.0,
  broadcastActive: false
};

/**
 * @swagger
 * /api/mixer/state:
 *   get:
 *     summary: Get mixer state
 *     description: Retrieves the current state of the audio mixer
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current mixer state
 */
router.get('/state', (req, res) => {
  try {
    // Build current state with channel names
    const stateWithLabels = {
      ...mixerState,
      channelLabels: {},
      clientLabels: {}
    };
    
    // Add channel names to state
    Object.keys(mixerState.channels).forEach(channelId => {
      const channel = channelManager.getChannel(channelId);
      if (channel) {
        stateWithLabels.channelLabels[channelId] = channel.name;
      }
    });
    
    // Add client names to state
    Object.keys(mixerState.clients).forEach(clientId => {
      const client = clientManager.getClient(clientId);
      if (client) {
        stateWithLabels.clientLabels[clientId] = client.name;
      }
    });
    
    res.json(stateWithLabels);
  } catch (error) {
    logger.error(`Error fetching mixer state: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch mixer state' });
  }
});

/**
 * @swagger
 * /api/mixer/channels:
 *   post:
 *     summary: Add channel to mixer
 *     description: Adds a channel to the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelId
 *             properties:
 *               channelId:
 *                 type: string
 *               volume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Channel added to mixer
 *       404:
 *         description: Channel not found
 *       403:
 *         description: Admin privileges required
 */
router.post('/channels', requireAdmin, (req, res) => {
  try {
    const { channelId, volume = 1.0 } = req.body;
    
    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }
    
    // Verify channel exists
    const channel = channelManager.getChannel(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Add channel to mixer
    mixerState.channels[channelId] = Math.max(0, Math.min(1, volume));
    
    logger.info(`Channel ${channelId} added to mixer with volume ${volume}`);
    res.json({
      message: 'Channel added to mixer',
      channel
    });
  } catch (error) {
    logger.error(`Error adding channel to mixer: ${error.message}`);
    res.status(500).json({ error: 'Failed to add channel to mixer' });
  }
});

/**
 * @swagger
 * /api/mixer/channels/{id}:
 *   delete:
 *     summary: Remove channel from mixer
 *     description: Removes a channel from the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel removed from mixer
 *       404:
 *         description: Channel not found in mixer
 *       403:
 *         description: Admin privileges required
 */
router.delete('/channels/:id', requireAdmin, (req, res) => {
  try {
    const channelId = req.params.id;
    
    // Check if channel is in mixer
    if (!(channelId in mixerState.channels)) {
      return res.status(404).json({ error: 'Channel not found in mixer' });
    }
    
    // Remove channel from mixer
    delete mixerState.channels[channelId];
    
    logger.info(`Channel ${channelId} removed from mixer`);
    res.json({
      message: 'Channel removed from mixer'
    });
  } catch (error) {
    logger.error(`Error removing channel from mixer: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove channel from mixer' });
  }
});

/**
 * @swagger
 * /api/mixer/channels/{id}/volume:
 *   put:
 *     summary: Set channel volume
 *     description: Sets the volume for a specific channel in the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - volume
 *             properties:
 *               volume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Channel volume updated
 *       404:
 *         description: Channel not found in mixer
 *       403:
 *         description: Admin privileges required
 */
router.put('/channels/:id/volume', requireAdmin, (req, res) => {
  try {
    const channelId = req.params.id;
    const { volume } = req.body;
    
    if (volume === undefined) {
      return res.status(400).json({ error: 'Volume is required' });
    }
    
    // Check if channel is in mixer
    if (!(channelId in mixerState.channels)) {
      return res.status(404).json({ error: 'Channel not found in mixer' });
    }
    
    // Update channel volume
    mixerState.channels[channelId] = Math.max(0, Math.min(1, volume));
    
    logger.info(`Channel ${channelId} volume set to ${volume}`);
    res.json({
      message: 'Channel volume updated',
      channelId,
      volume: mixerState.channels[channelId]
    });
  } catch (error) {
    logger.error(`Error setting channel volume: ${error.message}`);
    res.status(500).json({ error: 'Failed to set channel volume' });
  }
});

/**
 * @swagger
 * /api/mixer/clients:
 *   post:
 *     summary: Add client to mixer
 *     description: Adds a specific client to the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *             properties:
 *               clientId:
 *                 type: string
 *               volume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Client added to mixer
 *       404:
 *         description: Client not found
 *       403:
 *         description: Admin privileges required
 */
router.post('/clients', requireAdmin, (req, res) => {
  try {
    const { clientId, volume = 1.0 } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    // Verify client exists
    const client = clientManager.getClient(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Add client to mixer
    mixerState.clients[clientId] = Math.max(0, Math.min(1, volume));
    
    logger.info(`Client ${clientId} added to mixer with volume ${volume}`);
    res.json({
      message: 'Client added to mixer',
      client: {
        id: client.id,
        name: client.name
      }
    });
  } catch (error) {
    logger.error(`Error adding client to mixer: ${error.message}`);
    res.status(500).json({ error: 'Failed to add client to mixer' });
  }
});

/**
 * @swagger
 * /api/mixer/clients/{id}:
 *   delete:
 *     summary: Remove client from mixer
 *     description: Removes a client from the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client removed from mixer
 *       404:
 *         description: Client not found in mixer
 *       403:
 *         description: Admin privileges required
 */
router.delete('/clients/:id', requireAdmin, (req, res) => {
  try {
    const clientId = req.params.id;
    
    // Check if client is in mixer
    if (!(clientId in mixerState.clients)) {
      return res.status(404).json({ error: 'Client not found in mixer' });
    }
    
    // Remove client from mixer
    delete mixerState.clients[clientId];
    
    logger.info(`Client ${clientId} removed from mixer`);
    res.json({
      message: 'Client removed from mixer'
    });
  } catch (error) {
    logger.error(`Error removing client from mixer: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove client from mixer' });
  }
});

/**
 * @swagger
 * /api/mixer/clients/{id}/volume:
 *   put:
 *     summary: Set client volume
 *     description: Sets the volume for a specific client in the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - volume
 *             properties:
 *               volume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Client volume updated
 *       404:
 *         description: Client not found in mixer
 *       403:
 *         description: Admin privileges required
 */
router.put('/clients/:id/volume', requireAdmin, (req, res) => {
  try {
    const clientId = req.params.id;
    const { volume } = req.body;
    
    if (volume === undefined) {
      return res.status(400).json({ error: 'Volume is required' });
    }
    
    // Check if client is in mixer
    if (!(clientId in mixerState.clients)) {
      return res.status(404).json({ error: 'Client not found in mixer' });
    }
    
    // Update client volume
    mixerState.clients[clientId] = Math.max(0, Math.min(1, volume));
    
    logger.info(`Client ${clientId} volume set to ${volume}`);
    res.json({
      message: 'Client volume updated',
      clientId,
      volume: mixerState.clients[clientId]
    });
  } catch (error) {
    logger.error(`Error setting client volume: ${error.message}`);
    res.status(500).json({ error: 'Failed to set client volume' });
  }
});

/**
 * @swagger
 * /api/mixer/master-volume:
 *   put:
 *     summary: Set master volume
 *     description: Sets the master volume for the mixer (admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - volume
 *             properties:
 *               volume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Master volume updated
 *       403:
 *         description: Admin privileges required
 */
router.put('/master-volume', requireAdmin, (req, res) => {
  try {
    const { volume } = req.body;
    
    if (volume === undefined) {
      return res.status(400).json({ error: 'Volume is required' });
    }
    
    // Update master volume
    mixerState.masterVolume = Math.max(0, Math.min(1, volume));
    
    logger.info(`Master volume set to ${volume}`);
    res.json({
      message: 'Master volume updated',
      volume: mixerState.masterVolume
    });
  } catch (error) {
    logger.error(`Error setting master volume: ${error.message}`);
    res.status(500).json({ error: 'Failed to set master volume' });
  }
});

/**
 * @swagger
 * /api/mixer/broadcast:
 *   put:
 *     summary: Control broadcast
 *     description: Starts or stops the audio broadcast (admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - active
 *             properties:
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Broadcast status updated
 *       403:
 *         description: Admin privileges required
 */
router.put('/broadcast', requireAdmin, (req, res) => {
  try {
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ error: 'Active status is required' });
    }
    
    // Update broadcast status
    mixerState.broadcastActive = active;
    
    logger.info(`Broadcast ${active ? 'started' : 'stopped'}`);
    res.json({
      message: `Broadcast ${active ? 'started' : 'stopped'}`,
      active: mixerState.broadcastActive
    });
  } catch (error) {
    logger.error(`Error updating broadcast status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update broadcast status' });
  }
});

/**
 * @swagger
 * /api/mixer/stream-url:
 *   get:
 *     summary: Get broadcast stream URL
 *     description: Retrieves the URL for the broadcast audio stream
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stream URL
 */
router.get('/stream-url', (req, res) => {
  try {
    // This would return the actual stream URL in a real implementation
    // We're mocking it here
    const host = req.get('host');
    const protocol = req.protocol;
    const streamUrl = `${protocol}://${host}/stream/audio.mp3`;
    
    res.json({
      streamUrl,
      active: mixerState.broadcastActive
    });
  } catch (error) {
    logger.error(`Error getting stream URL: ${error.message}`);
    res.status(500).json({ error: 'Failed to get stream URL' });
  }
});

/**
 * @swagger
 * /api/mixer/reset:
 *   post:
 *     summary: Reset mixer
 *     description: Resets the mixer to default state (admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Mixer reset
 *       403:
 *         description: Admin privileges required
 */
router.post('/reset', requireAdmin, (req, res) => {
  try {
    // Reset mixer state
    mixerState.channels = {};
    mixerState.clients = {};
    mixerState.masterVolume = 1.0;
    mixerState.broadcastActive = false;
    
    logger.info('Mixer reset to default state');
    res.json({
      message: 'Mixer reset to default state',
      state: mixerState
    });
  } catch (error) {
    logger.error(`Error resetting mixer: ${error.message}`);
    res.status(500).json({ error: 'Failed to reset mixer' });
  }
});

module.exports = router;
