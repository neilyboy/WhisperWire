const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const apiRoutes = require('../api/routes');
const socketHandler = require('./socket/socketHandler');
const mediasoupManager = require('./media/mediasoupManager');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, set this to your client's domain
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhisperWire API',
      version: '1.0.0',
      description: 'API documentation for WhisperWire, a real-time audio communication system'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./api/routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'WhisperWire server is running' });
});

// Initialize Socket.IO connection
io.on('connection', socketHandler);

// Initialize MediaSoup
(async () => {
  try {
    await mediasoupManager.initialize();
    logger.info('MediaSoup initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize MediaSoup: ${error.message}`);
    process.exit(1);
  }
})();

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`WhisperWire server running on port ${PORT}`);
  logger.info(`API documentation available at http://localhost:${PORT}/api-docs`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down server...');
  server.close(() => {
    logger.info('Server closed');
    mediasoupManager.close();
    process.exit(0);
  });
});

module.exports = server;
