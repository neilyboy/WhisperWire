const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('./logger');

/**
 * Authenticate client using server password
 * @param {string} serverPassword - Password provided by client
 * @returns {boolean} Authentication success
 */
const authenticateClient = (serverPassword) => {
  if (!process.env.SERVER_PASSWORD) {
    logger.warn('SERVER_PASSWORD not set in environment');
    return false;
  }
  
  return serverPassword === process.env.SERVER_PASSWORD;
};

/**
 * Generate JWT token for authenticated clients
 * @param {string} clientId - Client ID
 * @param {boolean} isAdmin - Whether the client is an admin
 * @returns {string} JWT token
 */
const generateToken = (clientId, isAdmin = false) => {
  if (!process.env.JWT_SECRET) {
    logger.warn('JWT_SECRET not set in environment, using fallback');
  }
  
  const secret = process.env.JWT_SECRET || 'whisper-wire-default-secret';
  
  return jwt.sign(
    { clientId, isAdmin },
    secret,
    { expiresIn: '24h' }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'whisper-wire-default-secret';
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    return null;
  }
};

/**
 * Middleware to authenticate API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
};

/**
 * Middleware to ensure the user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
};

/**
 * Hash a password
 * @param {string} password - Password to hash
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 * @param {string} password - Password to compare
 * @param {string} hash - Hash to compare against
 * @returns {Promise<boolean>} Comparison result
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  authenticateClient,
  generateToken,
  verifyToken,
  authenticateJWT,
  requireAdmin,
  hashPassword,
  comparePassword
};
