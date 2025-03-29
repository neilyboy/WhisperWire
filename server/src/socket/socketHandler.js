const logger = require('../utils/logger');
const { authenticateClient } = require('../utils/auth');
const ChannelManager = require('../models/ChannelManager');
const ClientManager = require('../models/ClientManager');
const mediasoupManager = require('../media/mediasoupManager');

// Initialize managers
const channelManager = new ChannelManager();
const clientManager = new ClientManager();

/**
 * Socket.IO connection handler
 * @param {Socket} socket - Socket.IO socket instance
 */
const socketHandler = async (socket) => {
  logger.info(`New connection: ${socket.id}`);

  // Handle client authentication
  socket.on('authenticate', async (data, callback) => {
    try {
      const { clientName, serverPassword } = data;
      
      // Validate server password
      if (!serverPassword || serverPassword !== process.env.SERVER_PASSWORD) {
        logger.warn(`Authentication failed for ${clientName}: Invalid server password`);
        return callback({ success: false, error: 'Invalid server password' });
      }

      // Add client to pending authorization queue
      const client = clientManager.addPendingClient(socket.id, clientName);
      
      logger.info(`Client ${clientName} (${socket.id}) connected and awaiting authorization`);
      
      // Notify admins about new client
      socket.broadcast.to('admin').emit('clientPending', {
        clientId: socket.id,
        clientName: clientName
      });
      
      callback({ 
        success: true, 
        message: 'Connected to server. Waiting for admin authorization.',
        client
      });
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // Handle client authorization (admin only)
  socket.on('authorizeClient', async (data, callback) => {
    try {
      // Verify admin privileges
      const isAdmin = clientManager.isAdmin(socket.id);
      if (!isAdmin) {
        logger.warn(`Unauthorized authorization attempt from ${socket.id}`);
        return callback({ success: false, error: 'Unauthorized' });
      }

      const { clientId, authorized, channels, permissions } = data;
      
      if (authorized) {
        // Authorize client
        clientManager.authorizeClient(clientId, channels, permissions);
        
        // Join client to assigned channels
        const clientSocket = socket.to(clientId);
        channels.forEach(channelId => {
          clientSocket.join(channelId);
        });
        
        // Notify client about authorization
        socket.to(clientId).emit('authorized', {
          channels,
          permissions
        });
        
        logger.info(`Client ${clientId} authorized with channels: ${channels.join(', ')}`);
      } else {
        // Reject client
        clientManager.rejectClient(clientId);
        socket.to(clientId).emit('rejected');
        logger.info(`Client ${clientId} rejected by admin`);
      }
      
      callback({ success: true });
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // Handle channel creation (admin only)
  socket.on('createChannel', async (data, callback) => {
    try {
      // Verify admin privileges
      const isAdmin = clientManager.isAdmin(socket.id);
      if (!isAdmin) {
        return callback({ success: false, error: 'Unauthorized' });
      }

      const { channelName, description } = data;
      const channel = channelManager.createChannel(channelName, description);
      
      // Notify all clients about new channel
      socket.broadcast.emit('channelCreated', channel);
      
      logger.info(`Channel created: ${channelName} (${channel.id})`);
      callback({ success: true, channel });
    } catch (error) {
      logger.error(`Channel creation error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // Handle client speaking status changes
  socket.on('startSpeaking', async (data) => {
    try {
      const { channelId } = data;
      const client = clientManager.getClientBySocketId(socket.id);
      
      // Verify client has permission to speak in this channel
      if (!client || !clientManager.canSpeak(client.id, channelId)) {
        logger.warn(`Speaking permission denied for client ${socket.id} in channel ${channelId}`);
        return;
      }
      
      // Notify other clients in the channel
      socket.to(channelId).emit('clientSpeaking', {
        clientId: client.id,
        clientName: client.name,
        channelId
      });
      
      logger.debug(`Client ${client.name} started speaking in channel ${channelId}`);
    } catch (error) {
      logger.error(`Speaking status error: ${error.message}`);
    }
  });

  socket.on('stopSpeaking', async (data) => {
    try {
      const { channelId } = data;
      const client = clientManager.getClientBySocketId(socket.id);
      
      if (!client) return;
      
      // Notify other clients in the channel
      socket.to(channelId).emit('clientStoppedSpeaking', {
        clientId: client.id,
        clientName: client.name,
        channelId
      });
      
      logger.debug(`Client ${client.name} stopped speaking in channel ${channelId}`);
    } catch (error) {
      logger.error(`Speaking status error: ${error.message}`);
    }
  });

  // Handle channel mute/unmute
  socket.on('toggleChannelMute', async (data, callback) => {
    try {
      const { channelId, muted } = data;
      const client = clientManager.getClientBySocketId(socket.id);
      
      if (!client) {
        return callback({ success: false, error: 'Client not found' });
      }
      
      clientManager.setChannelMuteStatus(client.id, channelId, muted);
      
      logger.info(`Client ${client.name} ${muted ? 'muted' : 'unmuted'} channel ${channelId}`);
      callback({ success: true });
    } catch (error) {
      logger.error(`Channel mute toggle error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // Handle channel volume adjustment
  socket.on('adjustChannelVolume', async (data, callback) => {
    try {
      const { channelId, volume } = data;
      const client = clientManager.getClientBySocketId(socket.id);
      
      if (!client) {
        return callback({ success: false, error: 'Client not found' });
      }
      
      clientManager.setChannelVolume(client.id, channelId, volume);
      
      logger.info(`Client ${client.name} adjusted volume for channel ${channelId} to ${volume}`);
      callback({ success: true });
    } catch (error) {
      logger.error(`Channel volume adjustment error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // MediaSoup WebRTC handlers
  socket.on('getRouterRtpCapabilities', async (data, callback) => {
    try {
      const rtpCapabilities = mediasoupManager.getRtpCapabilities();
      callback({ success: true, rtpCapabilities });
    } catch (error) {
      logger.error(`RTP capabilities error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('createWebRtcTransport', async (data, callback) => {
    try {
      const { producing, consuming } = data;
      const transport = await mediasoupManager.createWebRtcTransport({ producing, consuming });
      
      callback({
        success: true,
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        }
      });
    } catch (error) {
      logger.error(`Create WebRTC transport error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('connectWebRtcTransport', async (data, callback) => {
    try {
      const { transportId, dtlsParameters } = data;
      await mediasoupManager.connectWebRtcTransport(transportId, dtlsParameters);
      callback({ success: true });
    } catch (error) {
      logger.error(`Connect WebRTC transport error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('produce', async (data, callback) => {
    try {
      const { transportId, kind, rtpParameters } = data;
      const producer = await mediasoupManager.produce(transportId, kind, rtpParameters);
      
      // Add producer to channelManager
      const client = clientManager.getClientBySocketId(socket.id);
      if (client) {
        client.channels.forEach(channelId => {
          if (clientManager.canSpeak(client.id, channelId)) {
            channelManager.addProducerToChannel(channelId, producer.id);
          }
        });
      }
      
      callback({ success: true, producerId: producer.id });
    } catch (error) {
      logger.error(`Produce error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('consume', async (data, callback) => {
    try {
      const { transportId, producerId, rtpCapabilities } = data;
      const consumer = await mediasoupManager.consume(transportId, producerId, rtpCapabilities);
      
      callback({
        success: true,
        params: {
          producerId,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused
        }
      });
    } catch (error) {
      logger.error(`Consume error: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    try {
      const client = clientManager.getClientBySocketId(socket.id);
      
      if (client) {
        // Remove client from channels
        client.channels.forEach(channelId => {
          channelManager.removeClientFromChannel(channelId, client.id);
          socket.leave(channelId);
        });
        
        // Notify other clients
        socket.broadcast.emit('clientDisconnected', {
          clientId: client.id,
          clientName: client.name
        });
        
        // Remove client from manager
        clientManager.removeClient(client.id);
        
        logger.info(`Client ${client.name} (${socket.id}) disconnected`);
      } else {
        logger.info(`Unknown client ${socket.id} disconnected`);
      }
    } catch (error) {
      logger.error(`Disconnect handler error: ${error.message}`);
    }
  });
};

module.exports = socketHandler;
