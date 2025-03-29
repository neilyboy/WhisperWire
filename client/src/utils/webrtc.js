import { Device } from 'mediasoup-client';

class WebRTCManager {
  constructor() {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map();
    this.consumers = new Map();
    this.socket = null;
    this.microphoneStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStreamSource = null;
    this.audioLevels = {
      mic: 0,
      incoming: {}
    };
  }

  // Initialize WebRTC device with router capabilities
  async initialize(routerRtpCapabilities, socket) {
    try {
      this.socket = socket;
      this.device = new Device();
      
      await this.device.load({ routerRtpCapabilities });
      console.log('Device initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize WebRTC device', error);
      throw error;
    }
  }

  // Create a send transport for publishing audio
  async createSendTransport(transportOptions) {
    try {
      this.sendTransport = this.device.createSendTransport(transportOptions);
      
      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await this.socket.emit('transport-connect', {
            transportId: this.sendTransport.id,
            dtlsParameters
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const { producerId } = await new Promise((resolve, reject) => {
            this.socket.emit('produce', {
              transportId: this.sendTransport.id,
              kind,
              rtpParameters,
              appData
            }, resolve);
            
            this.socket.once('produce-error', reject);
          });
          
          callback({ id: producerId });
        } catch (error) {
          errback(error);
        }
      });
      
      return this.sendTransport;
    } catch (error) {
      console.error('Failed to create send transport', error);
      throw error;
    }
  }

  // Create a receive transport for consuming audio
  async createReceiveTransport(transportOptions) {
    try {
      this.recvTransport = this.device.createRecvTransport(transportOptions);
      
      this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await this.socket.emit('transport-connect', {
            transportId: this.recvTransport.id,
            dtlsParameters
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      return this.recvTransport;
    } catch (error) {
      console.error('Failed to create receive transport', error);
      throw error;
    }
  }

  // Get user's microphone stream with proper constraints
  async getMicrophoneStream(constraints = {}) {
    try {
      const defaultConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      
      const mergedConstraints = {
        ...defaultConstraints,
        audio: {
          ...defaultConstraints.audio,
          ...(constraints.audio || {})
        }
      };
      
      this.microphoneStream = await navigator.mediaDevices.getUserMedia(mergedConstraints);
      
      // Create audio context and analyzer for level metering
      this.setupAudioAnalyzer();
      
      return this.microphoneStream;
    } catch (error) {
      console.error('Failed to get microphone stream', error);
      throw error;
    }
  }

  // Setup audio analyzer for level metering
  setupAudioAnalyzer() {
    if (!this.microphoneStream) return;
    
    try {
      // Create audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Create analyzer
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connect microphone stream to analyzer
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.mediaStreamSource.connect(this.analyser);
      
      // Start monitoring audio levels
      this.startLevelMonitoring();
    } catch (error) {
      console.error('Failed to setup audio analyzer', error);
    }
  }

  // Start monitoring audio levels
  startLevelMonitoring() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const updateLevels = () => {
      if (!this.analyser) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume level (0-1)
      const sum = dataArray.reduce((acc, value) => acc + value, 0);
      const avg = sum / dataArray.length;
      this.audioLevels.mic = avg / 255;
      
      requestAnimationFrame(updateLevels);
    };
    
    updateLevels();
  }

  // Produce and send audio to the server
  async produceAudio(channelId) {
    if (!this.sendTransport || !this.microphoneStream) {
      throw new Error('Send transport or microphone stream not available');
    }
    
    try {
      // Check if we already have a producer for this channel
      if (this.producers.has(channelId)) {
        await this.resumeProducer(channelId);
        return this.producers.get(channelId);
      }
      
      const track = this.microphoneStream.getAudioTracks()[0];
      
      const producer = await this.sendTransport.produce({
        track,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
          opusFec: true,
          opusPtime: 20
        },
        appData: { channelId }
      });
      
      producer.on('transportclose', () => {
        console.log('Producer transport closed');
        this.producers.delete(channelId);
      });
      
      producer.on('trackended', () => {
        console.log('Producer track ended');
        this.closeProducer(channelId);
      });
      
      this.producers.set(channelId, producer);
      return producer;
    } catch (error) {
      console.error('Failed to produce audio', error);
      throw error;
    }
  }

  // Pause a producer (mute)
  async pauseProducer(channelId) {
    const producer = this.producers.get(channelId);
    if (!producer) return;
    
    try {
      await producer.pause();
      await this.socket.emit('producer-pause', { producerId: producer.id });
    } catch (error) {
      console.error('Failed to pause producer', error);
      throw error;
    }
  }

  // Resume a producer (unmute)
  async resumeProducer(channelId) {
    const producer = this.producers.get(channelId);
    if (!producer) return;
    
    try {
      await producer.resume();
      await this.socket.emit('producer-resume', { producerId: producer.id });
    } catch (error) {
      console.error('Failed to resume producer', error);
      throw error;
    }
  }

  // Close a producer
  async closeProducer(channelId) {
    const producer = this.producers.get(channelId);
    if (!producer) return;
    
    try {
      producer.close();
      await this.socket.emit('producer-close', { producerId: producer.id });
      this.producers.delete(channelId);
    } catch (error) {
      console.error('Failed to close producer', error);
      throw error;
    }
  }

  // Consume audio from a remote producer
  async consumeAudio(consumerOptions) {
    if (!this.recvTransport) {
      throw new Error('Receive transport not available');
    }
    
    try {
      const { producerId, id, kind, rtpParameters, appData } = consumerOptions;
      
      const consumer = await this.recvTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
        appData
      });
      
      this.consumers.set(id, {
        consumer,
        volume: 1.0,
        muted: false
      });
      
      // Create audio element to play the consumer's track
      this.attachConsumerToAudio(consumer);
      
      return consumer;
    } catch (error) {
      console.error('Failed to consume audio', error);
      throw error;
    }
  }

  // Attach consumer's track to audio element
  attachConsumerToAudio(consumer) {
    const { track } = consumer;
    const { clientId, channelId } = consumer.appData;
    
    // Create audio element
    const audioElement = document.createElement('audio');
    audioElement.id = `audio-${consumer.id}`;
    audioElement.autoplay = true;
    audioElement.setAttribute('data-client-id', clientId);
    audioElement.setAttribute('data-channel-id', channelId);
    
    // Attach track to audio element
    audioElement.srcObject = new MediaStream([track]);
    
    // Append to hidden container
    const audioContainer = document.getElementById('whisper-wire-audio-container') || document.body;
    audioContainer.appendChild(audioElement);
    
    // Return the audio element for further control
    return audioElement;
  }

  // Set volume for a specific consumer
  setConsumerVolume(consumerId, volume) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) return;
    
    consumerData.volume = volume;
    
    const audioElement = document.getElementById(`audio-${consumerId}`);
    if (audioElement) {
      audioElement.volume = volume;
    }
  }

  // Mute/unmute a specific consumer
  setConsumerMuted(consumerId, muted) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) return;
    
    consumerData.muted = muted;
    
    const audioElement = document.getElementById(`audio-${consumerId}`);
    if (audioElement) {
      audioElement.muted = muted;
    }
  }

  // Close a consumer
  async closeConsumer(consumerId) {
    const consumerData = this.consumers.get(consumerId);
    if (!consumerData) return;
    
    try {
      consumerData.consumer.close();
      this.consumers.delete(consumerId);
      
      // Remove audio element
      const audioElement = document.getElementById(`audio-${consumerId}`);
      if (audioElement) {
        audioElement.srcObject = null;
        audioElement.remove();
      }
      
      await this.socket.emit('consumer-close', { consumerId });
    } catch (error) {
      console.error('Failed to close consumer', error);
      throw error;
    }
  }

  // Clean up all resources
  async cleanup() {
    try {
      // Close all producers
      for (const channelId of this.producers.keys()) {
        await this.closeProducer(channelId);
      }
      
      // Close all consumers
      for (const consumerId of this.consumers.keys()) {
        await this.closeConsumer(consumerId);
      }
      
      // Close transports
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }
      
      if (this.recvTransport) {
        this.recvTransport.close();
        this.recvTransport = null;
      }
      
      // Stop microphone stream
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
        this.microphoneStream = null;
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }
      
      this.analyser = null;
      this.mediaStreamSource = null;
      
      console.log('WebRTC resources cleaned up');
    } catch (error) {
      console.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
const webRTCManager = new WebRTCManager();
export default webRTCManager;
