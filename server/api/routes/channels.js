const express = require('express');
const router = express.Router();
const logger = require('../../src/utils/logger');
const { requireAdmin } = require('../../src/utils/auth');
const ChannelManager = require('../../src/models/ChannelManager');

// Initialize channel manager
const channelManager = new ChannelManager();

/**
 * @swagger
 * /api/channels:
 *   get:
 *     summary: Get all channels
 *     description: Retrieves a list of all communication channels
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of channels
 */
router.get('/', (req, res) => {
  try {
    const channels = channelManager.getAllChannels();
    res.json(channels);
  } catch (error) {
    logger.error(`Error fetching channels: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

/**
 * @swagger
 * /api/channels/{id}:
 *   get:
 *     summary: Get a specific channel
 *     description: Retrieves a specific channel by ID
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
 *         description: Channel details
 *       404:
 *         description: Channel not found
 */
router.get('/:id', (req, res) => {
  try {
    const channel = channelManager.getChannel(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json(channel);
  } catch (error) {
    logger.error(`Error fetching channel: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

/**
 * @swagger
 * /api/channels:
 *   post:
 *     summary: Create a new channel
 *     description: Creates a new communication channel (admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Channel created
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Admin privileges required
 */
router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }
    
    const channel = channelManager.createChannel(name, description);
    res.status(201).json(channel);
  } catch (error) {
    logger.error(`Error creating channel: ${error.message}`);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

/**
 * @swagger
 * /api/channels/{id}:
 *   put:
 *     summary: Update a channel
 *     description: Updates a specific channel by ID (admin only)
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Channel updated
 *       404:
 *         description: Channel not found
 *       403:
 *         description: Admin privileges required
 */
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (description) updates.description = description;
    
    const updatedChannel = channelManager.updateChannel(req.params.id, updates);
    
    if (!updatedChannel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json(updatedChannel);
  } catch (error) {
    logger.error(`Error updating channel: ${error.message}`);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

/**
 * @swagger
 * /api/channels/{id}:
 *   delete:
 *     summary: Delete a channel
 *     description: Deletes a specific channel by ID (admin only)
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
 *         description: Channel deleted
 *       404:
 *         description: Channel not found
 *       403:
 *         description: Admin privileges required
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const success = channelManager.deleteChannel(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Channel not found or could not be deleted' });
    }
    
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting channel: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

/**
 * @swagger
 * /api/channels/{id}/clients:
 *   get:
 *     summary: Get clients in a channel
 *     description: Retrieves a list of clients in a specific channel
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
 *         description: Array of client IDs
 *       404:
 *         description: Channel not found
 */
router.get('/:id/clients', (req, res) => {
  try {
    const clients = channelManager.getChannelClients(req.params.id);
    
    if (!clients) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json(clients);
  } catch (error) {
    logger.error(`Error fetching channel clients: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch channel clients' });
  }
});

module.exports = router;
