import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const AudioContext = createContext();

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
  const [device, setDevice] = useState(null);
  const [ready, setReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [duplex, setDuplex] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [audioLevels, setAudioLevels] = useState({});
  
  // For WebRTC
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producerRef = useRef(null);
  const consumersRef = useRef({});
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const channelGainsRef = useRef({});
  
  const { socket, connected, channels, speakingClients } = useSocket();
  const { currentUser, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();

  // Initialize mediasoup device when socket is connected
  useEffect(() => {
    if (connected && socket && !initialized) {
      initializeMediasoup();
    }
  }, [connected, socket, initialized]);

  // Monitor audio levels
  useEffect(() => {
    let animationFrame;
    
    const updateAudioLevels = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate level from frequency data (0-255)
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        
        const average = sum / dataArrayRef.current.length;
        const normalizedLevel = average / 255;
        
        setAudioLevels(prev => ({
          ...prev,
          mic: normalizedLevel
        }));
      }
      
      animationFrame = requestAnimationFrame(updateAudioLevels);
    };
    
    if (micActive) {
      animationFrame = requestAnimationFrame(updateAudioLevels);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [micActive]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      cleanupMediasoup();
    };
  }, []);

  // Initialize mediasoup device
  const initializeMediasoup = async () => {
    try {
      // Create mediasoup device
      const newDevice = new mediasoupClient.Device();
      
      // Get router RTP capabilities
      socket.emit('getRouterRtpCapabilities', {}, async (response) => {
        if (response.success) {
          try {
            // Load the device with the router's RTP capabilities
            await newDevice.load({ routerRtpCapabilities: response.rtpCapabilities });
            
            setDevice(newDevice);
            setInitialized(true);
            setReady(true);
            
            // Create send and receive transports
            await createSendTransport(newDevice);
            await createReceiveTransport(newDevice);
          } catch (error) {
            console.error('Error loading mediasoup device:', error);
            showNotification('Failed to initialize audio system', 'error');
          }
        } else {
          console.error('Error getting router capabilities:', response.error);
          showNotification('Failed to initialize audio system', 'error');
        }
      });
    } catch (error) {
      console.error('Error initializing mediasoup:', error);
      showNotification('Failed to initialize audio system', 'error');
    }
  };

  // Create send transport
  const createSendTransport = async (device) => {
    socket.emit('createWebRtcTransport', { producing: true, consuming: false }, async (response) => {
      if (response.success) {
        try {
          // Create send transport
          const transport = device.createSendTransport(response.params);
          
          // Set transport event handlers
          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit('connectWebRtcTransport', {
              transportId: transport.id,
              dtlsParameters
            }, (response) => {
              if (response.success) {
                callback();
              } else {
                errback(new Error(response.error));
              }
            });
          });
          
          transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            socket.emit('produce', {
              transportId: transport.id,
              kind,
              rtpParameters,
              appData
            }, (response) => {
              if (response.success) {
                callback({ id: response.producerId });
              } else {
                errback(new Error(response.error));
              }
            });
          });
          
          transport.on('connectionstatechange', (state) => {
            console.log('Send transport connection state:', state);
            
            if (state === 'connected') {
              console.log('Send transport connected');
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
              console.error('Send transport failed/disconnected/closed');
              showNotification('Audio transmission connection failed', 'error');
            }
          });
          
          sendTransportRef.current = transport;
        } catch (error) {
          console.error('Error creating send transport:', error);
          showNotification('Failed to initialize audio transmission', 'error');
        }
      } else {
        console.error('Error creating send transport:', response.error);
        showNotification('Failed to initialize audio transmission', 'error');
      }
    });
  };

  // Create receive transport
  const createReceiveTransport = async (device) => {
    socket.emit('createWebRtcTransport', { producing: false, consuming: true }, async (response) => {
      if (response.success) {
        try {
          // Create receive transport
          const transport = device.createRecvTransport(response.params);
          
          // Set transport event handlers
          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit('connectWebRtcTransport', {
              transportId: transport.id,
              dtlsParameters
            }, (response) => {
              if (response.success) {
                callback();
              } else {
                errback(new Error(response.error));
              }
            });
          });
          
          transport.on('connectionstatechange', (state) => {
            console.log('Receive transport connection state:', state);
            
            if (state === 'connected') {
              console.log('Receive transport connected');
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
              console.error('Receive transport failed/disconnected/closed');
              showNotification('Audio reception connection failed', 'error');
            }
          });
          
          recvTransportRef.current = transport;
        } catch (error) {
          console.error('Error creating receive transport:', error);
          showNotification('Failed to initialize audio reception', 'error');
        }
      } else {
        console.error('Error creating receive transport:', response.error);
        showNotification('Failed to initialize audio reception', 'error');
      }
    });
  };

  // Activate microphone
  const activateMicrophone = async (channelId) => {
    if (!ready || !sendTransportRef.current) {
      showNotification('Audio system not ready', 'error');
      return false;
    }
    
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      // Create Web Audio context for level monitoring
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyzer node for volume level monitoring
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      // Connect audio stream to analyzer
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Produce audio
      const track = stream.getAudioTracks()[0];
      
      const producer = await sendTransportRef.current.produce({
        track,
        codecOptions: {
          opusStereo: false,
          opusDtx: true,
          opusFec: true,
          opusPtime: 20
        }
      });
      
      producerRef.current = producer;
      
      producer.on('transportclose', () => {
        console.log('Transport closed for producer');
        producerRef.current = null;
      });
      
      producer.on('trackended', () => {
        console.log('Track ended for producer');
        deactivateMicrophone();
      });
      
      setMicActive(true);
      
      // Notify server and UI
      if (channelId) {
        socket.emit('startSpeaking', { channelId });
      }
      
      return true;
    } catch (error) {
      console.error('Error activating microphone:', error);
      showNotification('Failed to activate microphone', 'error');
      return false;
    }
  };

  // Deactivate microphone
  const deactivateMicrophone = (channelId) => {
    if (producerRef.current) {
      producerRef.current.close();
      producerRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    setMicActive(false);
    
    // Notify server and UI
    if (channelId && socket) {
      socket.emit('stopSpeaking', { channelId });
    }
  };

  // Toggle duplex communication mode
  const toggleDuplexMode = async (channelId) => {
    if (duplex) {
      // Turn off duplex mode
      deactivateMicrophone(channelId);
      setDuplex(false);
    } else {
      // Turn on duplex mode
      const success = await activateMicrophone(channelId);
      
      if (success) {
        setDuplex(true);
        setPushToTalk(false);
      }
    }
  };

  // Start push-to-talk communication
  const startPushToTalk = async (channelId) => {
    // Don't activate if already in duplex mode
    if (duplex) return;
    
    const success = await activateMicrophone(channelId);
    
    if (success) {
      setPushToTalk(true);
    }
  };

  // Stop push-to-talk communication
  const stopPushToTalk = (channelId) => {
    // Only stop if actually in PTT mode
    if (pushToTalk) {
      deactivateMicrophone(channelId);
      setPushToTalk(false);
    }
  };

  // Consume audio from a producer
  const consumeAudio = async (producerId, channelId) => {
    if (!ready || !recvTransportRef.current || !device) {
      return;
    }
    
    try {
      // Check if we already have this consumer
      if (consumersRef.current[producerId]) {
        return;
      }
      
      socket.emit('consume', {
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities
      }, async (response) => {
        if (response.success) {
          try {
            const consumer = await recvTransportRef.current.consume({
              id: response.params.id,
              producerId: response.params.producerId,
              kind: response.params.kind,
              rtpParameters: response.params.rtpParameters
            });
            
            // Store the consumer
            consumersRef.current[producerId] = {
              consumer,
              channelId
            };
            
            // Create Web Audio gain node for this channel
            if (!channelGainsRef.current[channelId]) {
              const gainNode = audioContextRef.current.createGain();
              gainNode.gain.value = 1.0; // Default volume
              
              channelGainsRef.current[channelId] = gainNode;
            }
            
            // Create audio element for this consumer
            const audioElement = new Audio();
            audioElement.srcObject = new MediaStream([consumer.track]);
            audioElement.autoplay = true;
            
            // Additional processing if needed
            consumer.on('trackended', () => {
              closeConsumer(producerId);
            });
            
            consumer.on('transportclose', () => {
              closeConsumer(producerId);
            });
          } catch (error) {
            console.error('Error consuming audio:', error);
          }
        } else {
          console.error('Error consuming audio:', response.error);
        }
      });
    } catch (error) {
      console.error('Error consuming audio:', error);
    }
  };

  // Close a specific consumer
  const closeConsumer = (producerId) => {
    if (consumersRef.current[producerId]) {
      const { consumer } = consumersRef.current[producerId];
      consumer.close();
      delete consumersRef.current[producerId];
    }
  };

  // Set channel volume
  const setChannelVolume = (channelId, volume) => {
    if (channelGainsRef.current[channelId]) {
      // Ensure volume is between 0 and 1
      const normalizedVolume = Math.max(0, Math.min(1, volume));
      channelGainsRef.current[channelId].gain.value = normalizedVolume;
    }
  };

  // Mute/unmute a channel
  const setChannelMute = (channelId, muted) => {
    if (channelGainsRef.current[channelId]) {
      channelGainsRef.current[channelId].gain.value = muted ? 0 : 1;
    }
  };

  // Clean up mediasoup resources
  const cleanupMediasoup = () => {
    // Close all consumers
    Object.values(consumersRef.current).forEach(({ consumer }) => {
      consumer.close();
    });
    consumersRef.current = {};
    
    // Close producer
    if (producerRef.current) {
      producerRef.current.close();
      producerRef.current = null;
    }
    
    // Close transports
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }
    
    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }
    
    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setDevice(null);
    setInitialized(false);
    setReady(false);
    setMicActive(false);
    setDuplex(false);
    setPushToTalk(false);
  };

  const value = {
    ready,
    micActive,
    duplex,
    pushToTalk,
    audioLevels,
    speakingClients,
    toggleDuplexMode,
    startPushToTalk,
    stopPushToTalk,
    setChannelVolume,
    setChannelMute
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
