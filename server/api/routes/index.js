const express = require('express');
const router = express.Router();
const channelsRoutes = require('./channels');
const clientsRoutes = require('./clients');
const authRoutes = require('./auth');
const mixerRoutes = require('./mixer');
const { authenticateJWT } = require('../../src/utils/auth');

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/channels', authenticateJWT, channelsRoutes);
router.use('/clients', authenticateJWT, clientsRoutes);
router.use('/mixer', authenticateJWT, mixerRoutes);

// API Version and health check
/**
 * @swagger
 * /api/version:
 *   get:
 *     summary: Get API version information
 *     description: Returns the current version of the WhisperWire API
 *     responses:
 *       200:
 *         description: API version information
 */
router.get('/version', (req, res) => {
  res.json({
    name: 'WhisperWire API',
    version: '0.1.0',
    status: 'development'
  });
});

module.exports = router;
