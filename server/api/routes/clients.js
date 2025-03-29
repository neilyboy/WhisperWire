const express = require('express');
const router = express.Router();
const logger = require('../../src/utils/logger');
const { requireAdmin } = require('../../src/utils/auth');
const ClientManager = require('../../src/models/ClientManager');
const ChannelManager = require('../../src/models/ChannelManager');

// Initialize managers
const clientManager = new ClientManager();
const channelManager = new ChannelManager();

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Get all clients
 *     description: Retrieves a list of all clients (admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of clients
 *       403:
 *         description: Admin privileges required
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const clients = clientManager.getAllClients();
    res.json(clients);
  } catch (error) {
    logger.error(`Error fetching clients: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * @swagger
 * /api/clients/pending:
 *   get:
 *     summary: Get all pending clients
 *     description: Retrieves a list of all pending clients awaiting authorization (admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of pending clients
 *       403:
 *         description: Admin privileges required
 */
router.get('/pending', requireAdmin, (req, res) => {
  try {
    const pendingClients = clientManager.getAllPendingClients();
    res.json(pendingClients);
  } catch (error) {
    logger.error(`Error fetching pending clients: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch pending clients' });
  }
});

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get a specific client
 *     description: Retrieves a specific client by ID
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
 *         description: Client details
 *       404:
 *         description: Client not found
 */
router.get('/:id', (req, res) => {
  try {
    // Regular clients can only view their own info
    if (!req.user.isAdmin && req.user.clientId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized access to client information' });
    }
    
    const client = clientManager.getClient(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    logger.error(`Error fetching client: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * @swagger
 * /api/clients/{id}/authorize:
 *   post:
 *     summary: Authorize a pending client
 *     description: Authorizes a pending client (admin only)
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
 *               - channels
 *               - permissions
 *             properties:
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *               permissions:
 *                 type: object
 *                 properties:
 *                   isAdmin:
 *                     type: boolean
 *                   speakToAll:
 *                     type: boolean
 *                   listenToAll:
 *                     type: boolean
 *                   speakTo:
 *                     type: object
 *                   listenTo:
 *                     type: object
 *     responses:
 *       200:
 *         description: Client authorized
 *       404:
 *         description: Client not found
 *       403:
 *         description: Admin privileges required
 */
router.post('/:id/authorize', requireAdmin, (req, res) => {
  try {
    const { channels, permissions } = req.body;
    
    if (!channels || !permissions) {
      return res.status(400).json({ error: 'Channels and permissions are required' });
    }
    
    const client = clientManager.authorizeClient(req.params.id, channels, permissions);
    
    if (!client) {
      return res.status(404).json({ error: 'Pending client not found' });
    }
    
    // Add client to each channel
    channels.forEach(channelId => {
      channelManager.addClientToChannel(channelId, client.id);
    });
    
    res.json(client);
  } catch (error) {
    logger.error(`Error authorizing client: ${error.message}`);
    res.status(500).json({ error: 'Failed to authorize client' });
  }
});

/**
 * @swagger
 * /api/clients/{id}/reject:
 *   post:
 *     summary: Reject a pending client
 *     description: Rejects a pending client (admin only)
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
 *         description: Client rejected
 *       404:
 *         description: Client not found
 *       403:
 *         description: Admin privileges required
 */
router.post('/:id/reject', requireAdmin, (req, res) => {
  try {
    const success = clientManager.rejectClient(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Pending client not found' });
    }
    
    res.json({ message: 'Client rejected successfully' });
  } catch (error) {
    logger.error(`Error rejecting client: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject client' });
  }
});

/**
 * @swagger
 * /api/clients/{id}/permissions:
 *   put:
 *     summary: Update client permissions
 *     description: Updates a client's permissions (admin only)
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
 *             properties:
 *               isAdmin:
 *                 type: boolean
 *               speakToAll:
 *                 type: boolean
 *               listenToAll:
 *                 type: boolean
 *               speakTo:
 *                 type: object
 *               listenTo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Permissions updated
 *       404:
 *         description: Client not found
 *       403:
 *         description: Admin privileges required
 */
router.put('/:id/permissions', requireAdmin, (req, res) => {
  try {
    const success = clientManager.updateClientPermissions(req.params.id, req.body);
    
    if (!success) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    logger.error(`Error updating permissions: ${error.message}`);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

/**
 * @swagger
 * /api/clients/{id}/channels:
 *   post:
 *     summary: Add client to channel
 *     description: Adds a client to a channel (admin only)
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
 *               - channelId
 *             properties:
 *               channelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client added to channel
 *       404:
 *         description: Client or channel not found
 *       403:
 *         description: Admin privileges required
 */
router.post('/:id/channels', requireAdmin, (req, res) => {
  try {
    const { channelId } = req.body;
    
    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }
    
    // Verify channel exists
    if (!channelManager.getChannel(channelId)) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Add client to channel
    const clientSuccess = clientManager.addClientToChannel(req.params.id, channelId);
    
    if (!clientSuccess) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Add client to channel in channel manager
    channelManager.addClientToChannel(channelId, req.params.id);
    
    res.json({ message: 'Client added to channel successfully' });
  } catch (error) {
    logger.error(`Error adding client to channel: ${error.message}`);
    res.status(500).json({ error: 'Failed to add client to channel' });
  }
});

/**
 * @swagger
 * /api/clients/{id}/channels/{channelId}:
 *   delete:
 *     summary: Remove client from channel
 *     description: Removes a client from a channel (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Client removed from channel
 *       404:
 *         description: Client or channel not found
 *       403:
 *         description: Admin privileges required
 */
router.delete('/:id/channels/:channelId', requireAdmin, (req, res) => {
  try {
    // Remove client from channel in client manager
    const clientSuccess = clientManager.removeClientFromChannel(req.params.id, req.params.channelId);
    
    if (!clientSuccess) {
      return res.status(404).json({ error: 'Client not found or not in channel' });
    }
    
    // Remove client from channel in channel manager
    channelManager.removeClientFromChannel(req.params.channelId, req.params.id);
    
    res.json({ message: 'Client removed from channel successfully' });
  } catch (error) {
    logger.error(`Error removing client from channel: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove client from channel' });
  }
});

/**
 * @swagger
 * /api/clients/{id}/channel-settings/{channelId}:
 *   put:
 *     summary: Update client's channel settings
 *     description: Updates a client's settings for a specific channel
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *       - in: path
 *         name: channelId
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
 *               muted:
 *                 type: boolean
 *               volume:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Channel settings updated
 *       404:
 *         description: Client or channel not found
 *       403:
 *         description: Unauthorized
 */
router.put('/:id/channel-settings/:channelId', (req, res) => {
  try {
    // Regular clients can only update their own settings
    if (!req.user.isAdmin && req.user.clientId !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized access to client settings' });
    }
    
    const { muted, volume } = req.body;
    let success = false;
    
    if (muted !== undefined) {
      success = clientManager.setChannelMuteStatus(req.params.id, req.params.channelId, muted);
    }
    
    if (volume !== undefined) {
      success = clientManager.setChannelVolume(req.params.id, req.params.channelId, volume);
    }
    
    if (!success) {
      return res.status(404).json({ error: 'Client or channel not found' });
    }
    
    res.json({ message: 'Channel settings updated successfully' });
  } catch (error) {
    logger.error(`Error updating channel settings: ${error.message}`);
    res.status(500).json({ error: 'Failed to update channel settings' });
  }
});

module.exports = router;
