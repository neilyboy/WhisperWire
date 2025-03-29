const mediasoup = require('mediasoup');
const logger = require('../utils/logger');

class MediasoupManager {
  constructor() {
    this.worker = null;
    this.router = null;
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
    this.audioLevelObservers = new Map();
  }

  /**
   * Initialize MediaSoup worker and router
   */
  async initialize() {
    try {
      // Create mediasoup worker
      this.worker = await mediasoup.createWorker({
        logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT || 10000),
        rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || 10100)
      });

      logger.info('MediaSoup worker created');

      // Handle worker exit
      this.worker.on('died', () => {
        logger.error('MediaSoup worker died, exiting in 2 seconds...');
        setTimeout(() => process.exit(1), 2000);
      });

      // Create mediasoup router
      const mediaCodecs = [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        }
      ];

      this.router = await this.worker.createRouter({ mediaCodecs });
      logger.info('MediaSoup router created');
      
      // Create audio level observer to detect active speakers
      this.createAudioLevelObserver('main');

      return true;
    } catch (error) {
      logger.error(`MediaSoup initialization error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get router RTP capabilities
   * @returns {Object} RTP capabilities
   */
  getRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  /**
   * Create a WebRTC transport
   * @param {Object} options - Transport options
   * @returns {Object} Created transport
   */
  async createWebRtcTransport(options) {
    try {
      const { producing = true, consuming = true } = options;

      const transport = await this.router.createWebRtcTransport({
        listenIps: [
          {
            ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || null
          }
        ],
        initialAvailableOutgoingBitrate: 800000,
        minimumAvailableOutgoingBitrate: 100000,
        maxSctpMessageSize: 262144,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        enableSctp: true
      });

      // Store the transport
      this.transports.set(transport.id, transport);

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
          this.transports.delete(transport.id);
        }
      });

      transport.on('close', () => {
        logger.info(`Transport ${transport.id} closed`);
        this.transports.delete(transport.id);
      });

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters
      };
    } catch (error) {
      logger.error(`Error creating WebRTC transport: ${error.message}`);
      throw error;
    }
  }

  /**
   * Connect a WebRTC transport
   * @param {string} transportId - ID of the transport to connect
   * @param {Object} dtlsParameters - DTLS parameters
   */
  async connectWebRtcTransport(transportId, dtlsParameters) {
    try {
      const transport = this.transports.get(transportId);
      
      if (!transport) {
        throw new Error(`Transport with ID ${transportId} not found`);
      }
      
      await transport.connect({ dtlsParameters });
      logger.info(`Transport ${transportId} connected`);
      
      return true;
    } catch (error) {
      logger.error(`Error connecting WebRTC transport: ${error.message}`);
      throw error;
    }
  }

  /**
   * Produce media
   * @param {string} transportId - ID of the transport to produce on
   * @param {string} kind - Kind of producer ('audio' or 'video')
   * @param {Object} rtpParameters - RTP parameters
   * @returns {Object} Created producer
   */
  async produce(transportId, kind, rtpParameters) {
    try {
      const transport = this.transports.get(transportId);
      
      if (!transport) {
        throw new Error(`Transport with ID ${transportId} not found`);
      }
      
      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { transportId }
      });
      
      // Store the producer
      this.producers.set(producer.id, producer);
      
      producer.on('transportclose', () => {
        producer.close();
        this.producers.delete(producer.id);
      });
      
      producer.on('close', () => {
        logger.info(`Producer ${producer.id} closed`);
        this.producers.delete(producer.id);
      });
      
      return {
        id: producer.id,
        kind: producer.kind,
        rtpParameters: producer.rtpParameters,
        type: producer.type
      };
    } catch (error) {
      logger.error(`Error producing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Consume media
   * @param {string} transportId - ID of the transport to consume on
   * @param {string} producerId - ID of the producer to consume
   * @param {Object} rtpCapabilities - RTP capabilities
   * @returns {Object} Created consumer
   */
  async consume(transportId, producerId, rtpCapabilities) {
    try {
      const transport = this.transports.get(transportId);
      
      if (!transport) {
        throw new Error(`Transport with ID ${transportId} not found`);
      }
      
      const producer = this.producers.get(producerId);
      
      if (!producer) {
        throw new Error(`Producer with ID ${producerId} not found`);
      }
      
      if (!this.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Cannot consume this producer with provided RTP capabilities');
      }
      
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false
      });
      
      // Store the consumer
      this.consumers.set(consumer.id, consumer);
      
      consumer.on('transportclose', () => {
        consumer.close();
        this.consumers.delete(consumer.id);
      });
      
      consumer.on('producerclose', () => {
        consumer.close();
        this.consumers.delete(consumer.id);
      });
      
      consumer.on('close', () => {
        logger.info(`Consumer ${consumer.id} closed`);
        this.consumers.delete(consumer.id);
      });
      
      return {
        id: consumer.id,
        producerId: producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
      };
    } catch (error) {
      logger.error(`Error consuming: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an audio level observer to detect active speakers
   * @param {string} id - Observer ID
   * @returns {Object} Created audio level observer
   */
  async createAudioLevelObserver(id) {
    try {
      const audioLevelObserver = await this.router.createAudioLevelObserver({
        maxEntries: 1,
        threshold: -70,
        interval: 800
      });
      
      this.audioLevelObservers.set(id, audioLevelObserver);
      
      audioLevelObserver.on('volumes', (volumes) => {
        volumes.forEach((volume) => {
          logger.debug(`Producer ${volume.producer.id} has volume ${volume.volume}`);
          // This event would be forwarded to clients to show who is speaking
        });
      });
      
      audioLevelObserver.on('silence', () => {
        logger.debug('No audio detected');
      });
      
      return audioLevelObserver;
    } catch (error) {
      logger.error(`Error creating audio level observer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stats for a specific producer
   * @param {string} producerId - ID of the producer
   * @returns {Object} Producer stats
   */
  async getProducerStats(producerId) {
    try {
      const producer = this.producers.get(producerId);
      
      if (!producer) {
        throw new Error(`Producer with ID ${producerId} not found`);
      }
      
      return await producer.getStats();
    } catch (error) {
      logger.error(`Error getting producer stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stats for a specific consumer
   * @param {string} consumerId - ID of the consumer
   * @returns {Object} Consumer stats
   */
  async getConsumerStats(consumerId) {
    try {
      const consumer = this.consumers.get(consumerId);
      
      if (!consumer) {
        throw new Error(`Consumer with ID ${consumerId} not found`);
      }
      
      return await consumer.getStats();
    } catch (error) {
      logger.error(`Error getting consumer stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close all MediaSoup resources
   */
  close() {
    logger.info('Closing MediaSoup manager...');
    
    // Close all consumers
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();
    
    // Close all producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();
    
    // Close all transports
    for (const transport of this.transports.values()) {
      transport.close();
    }
    this.transports.clear();
    
    // Close all audio level observers
    for (const observer of this.audioLevelObservers.values()) {
      observer.close();
    }
    this.audioLevelObservers.clear();
    
    // Close router and worker
    if (this.router) {
      this.router.close();
      this.router = null;
    }
    
    if (this.worker) {
      this.worker.close();
      this.worker = null;
    }
    
    logger.info('MediaSoup manager closed');
  }
}

// Export singleton instance
const mediasoupManager = new MediasoupManager();
module.exports = mediasoupManager;
