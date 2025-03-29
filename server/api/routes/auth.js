const express = require('express');
const router = express.Router();
const logger = require('../../src/utils/logger');
const { authenticateClient, generateToken } = require('../../src/utils/auth');
const ClientManager = require('../../src/models/ClientManager');

// Initialize client manager
const clientManager = new ClientManager();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a client
 *     description: Authenticates a client using the server password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientName
 *               - serverPassword
 *             properties:
 *               clientName:
 *                 type: string
 *               serverPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful, client pending authorization
 *       401:
 *         description: Authentication failed
 */
router.post('/login', (req, res) => {
  try {
    const { clientName, serverPassword } = req.body;
    
    if (!clientName || !serverPassword) {
      return res.status(400).json({ error: 'Client name and server password are required' });
    }
    
    // Authenticate using server password
    const authenticated = authenticateClient(serverPassword);
    
    if (!authenticated) {
      logger.warn(`Authentication failed for ${clientName}: Invalid server password`);
      return res.status(401).json({ error: 'Authentication failed: Invalid server password' });
    }
    
    // Add client to pending authorization queue
    const pendingClient = clientManager.addPendingClient(null, clientName);
    
    logger.info(`Client ${clientName} (${pendingClient.id}) connected via API and awaiting authorization`);
    
    // Generate token
    const token = generateToken(pendingClient.id, false);
    
    res.json({
      message: 'Connected to server. Waiting for admin authorization.',
      token,
      client: pendingClient
    });
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    res.status(500).json({ error: 'Authentication failed: Server error' });
  }
});

/**
 * @swagger
 * /api/auth/admin-login:
 *   post:
 *     summary: Authenticate as admin
 *     description: Authenticates as an admin using server password and admin key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminName
 *               - serverPassword
 *               - adminKey
 *             properties:
 *               adminName:
 *                 type: string
 *               serverPassword:
 *                 type: string
 *               adminKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin authentication successful
 *       401:
 *         description: Authentication failed
 */
router.post('/admin-login', (req, res) => {
  try {
    const { adminName, serverPassword, adminKey } = req.body;
    
    if (!adminName || !serverPassword || !adminKey) {
      return res.status(400).json({ error: 'Admin name, server password, and admin key are required' });
    }
    
    // Authenticate using server password
    const serverAuthenticated = authenticateClient(serverPassword);
    
    if (!serverAuthenticated) {
      logger.warn(`Admin authentication failed for ${adminName}: Invalid server password`);
      return res.status(401).json({ error: 'Authentication failed: Invalid server password' });
    }
    
    // Verify admin key
    if (!process.env.ADMIN_KEY) {
      logger.warn('ADMIN_KEY not set in environment');
      return res.status(401).json({ error: 'Authentication failed: Admin authentication not configured' });
    }
    
    if (adminKey !== process.env.ADMIN_KEY) {
      logger.warn(`Admin authentication failed for ${adminName}: Invalid admin key`);
      return res.status(401).json({ error: 'Authentication failed: Invalid admin key' });
    }
    
    // Create admin client
    const adminClient = clientManager.createAdminClient(adminName);
    
    // Generate admin token
    const token = generateToken(adminClient.id, true);
    
    logger.info(`Admin ${adminName} (${adminClient.id}) authenticated via API`);
    
    res.json({
      message: 'Admin authentication successful',
      token,
      client: adminClient
    });
  } catch (error) {
    logger.error(`Admin authentication error: ${error.message}`);
    res.status(500).json({ error: 'Authentication failed: Server error' });
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify authentication token
 *     description: Verifies if the current authentication token is valid
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Token is invalid or expired
 */
router.get('/verify', (req, res) => {
  // If this endpoint is reached, it means the authentication middleware passed
  res.json({
    valid: true,
    clientId: req.user.clientId,
    isAdmin: req.user.isAdmin
  });
});

module.exports = router;
