import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState([]);
  const [clients, setClients] = useState([]);
  const [speakingClients, setSpeakingClients] = useState({});
  const { currentUser, isAuthenticated, updateAuthStatus, logout } = useAuth();
  const { showNotification } = useNotification();

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && !socket) {
      // Get the server hostname from the current URL
      const hostname = window.location.hostname;
      const serverUrl = process.env.REACT_APP_SERVER_URL || `http://${hostname}:5000`;
      
      console.log('Connecting to socket server at:', serverUrl);
      
      const newSocket = io(serverUrl, {
        transports: ['websocket'],
        auth: {
          token: localStorage.getItem('token')
        }
      });

      setSocket(newSocket);
      
      // Socket event handlers
      newSocket.on('connect', () => {
        setConnected(true);
        showNotification('Connected to communication server', 'success');
        
        // Authenticate with socket server
        if (currentUser) {
          newSocket.emit('authenticate', {
            clientName: currentUser.name,
            serverPassword: localStorage.getItem('serverPassword')
          }, (response) => {
            if (!response.success) {
              showNotification(response.error || 'Authentication failed', 'error');
              logout();
            }
          });
        }
      });
      
      newSocket.on('disconnect', () => {
        setConnected(false);
        showNotification('Disconnected from communication server', 'warning');
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        showNotification('Connection to server failed', 'error');
      });
      
      // Clean up function
      return () => {
        newSocket.disconnect();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [isAuthenticated, currentUser, showNotification, logout]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Channel events
    socket.on('channelCreated', (channel) => {
      setChannels(prev => [...prev, channel]);
      showNotification(`New channel created: ${channel.name}`, 'info');
    });
    
    socket.on('channelUpdated', (channel) => {
      setChannels(prev => prev.map(c => c.id === channel.id ? channel : c));
    });
    
    socket.on('channelDeleted', (channelId) => {
      setChannels(prev => prev.filter(c => c.id !== channelId));
      showNotification('A channel has been deleted', 'info');
    });
    
    // Client events
    socket.on('clientConnected', (client) => {
      setClients(prev => [...prev, client]);
      showNotification(`${client.name} has connected`, 'info');
    });
    
    socket.on('clientDisconnected', (client) => {
      setClients(prev => prev.filter(c => c.id !== client.clientId));
      setSpeakingClients(prev => {
        const updated = { ...prev };
        delete updated[client.clientId];
        return updated;
      });
      showNotification(`${client.clientName} has disconnected`, 'info');
    });
    
    socket.on('clientSpeaking', (data) => {
      setSpeakingClients(prev => ({
        ...prev,
        [data.clientId]: {
          name: data.clientName,
          channelId: data.channelId,
          timestamp: Date.now()
        }
      }));
    });
    
    socket.on('clientStoppedSpeaking', (data) => {
      setSpeakingClients(prev => {
        const updated = { ...prev };
        delete updated[data.clientId];
        return updated;
      });
    });
    
    // Authorization events
    socket.on('authorized', (data) => {
      updateAuthStatus(true, data.permissions, data.channels);
      
      // Fetch channels data
      fetchChannels();
    });
    
    socket.on('rejected', () => {
      updateAuthStatus(false);
    });
    
    // Fetch initial data if authenticated
    if (isAuthenticated && currentUser?.authorized) {
      fetchChannels();
      fetchClients();
    }
    
    return () => {
      // Clean up all event listeners
      socket.off('channelCreated');
      socket.off('channelUpdated');
      socket.off('channelDeleted');
      socket.off('clientConnected');
      socket.off('clientDisconnected');
      socket.off('clientSpeaking');
      socket.off('clientStoppedSpeaking');
      socket.off('authorized');
      socket.off('rejected');
    };
  }, [socket, isAuthenticated, currentUser, updateAuthStatus, showNotification]);

  // Fetch channel data
  const fetchChannels = async () => {
    if (!socket) return;
    
    socket.emit('getChannels', {}, (response) => {
      if (response.success) {
        setChannels(response.channels);
      }
    });
  };

  // Fetch clients data
  const fetchClients = async () => {
    if (!socket) return;
    
    socket.emit('getClients', {}, (response) => {
      if (response.success) {
        setClients(response.clients);
      }
    });
  };

  // Start speaking in a channel
  const startSpeaking = (channelId) => {
    if (!socket || !connected) return;
    
    socket.emit('startSpeaking', { channelId });
  };

  // Stop speaking in a channel
  const stopSpeaking = (channelId) => {
    if (!socket || !connected) return;
    
    socket.emit('stopSpeaking', { channelId });
  };

  // Toggle mute status for a channel
  const toggleChannelMute = (channelId, muted) => {
    if (!socket || !connected) return;
    
    socket.emit('toggleChannelMute', { channelId, muted }, (response) => {
      if (!response.success) {
        showNotification(response.error || 'Failed to change mute status', 'error');
      }
    });
  };

  // Adjust volume for a channel
  const adjustChannelVolume = (channelId, volume) => {
    if (!socket || !connected) return;
    
    socket.emit('adjustChannelVolume', { channelId, volume }, (response) => {
      if (!response.success) {
        showNotification(response.error || 'Failed to adjust volume', 'error');
      }
    });
  };

  // Create a new channel (admin only)
  const createChannel = (name, description = '') => {
    if (!socket || !connected) return;
    
    socket.emit('createChannel', { channelName: name, description }, (response) => {
      if (response.success) {
        showNotification(`Channel "${name}" created successfully`, 'success');
        return response.channel;
      } else {
        showNotification(response.error || 'Failed to create channel', 'error');
        return null;
      }
    });
  };

  // Authorize a pending client (admin only)
  const authorizeClient = (clientId, authorized, channels = [], permissions = {}) => {
    if (!socket || !connected) return;
    
    socket.emit('authorizeClient', { clientId, authorized, channels, permissions }, (response) => {
      if (response.success) {
        showNotification(`Client ${authorized ? 'authorized' : 'rejected'} successfully`, 'success');
        return true;
      } else {
        showNotification(response.error || 'Failed to authorize client', 'error');
        return false;
      }
    });
  };

  const value = {
    socket,
    connected,
    channels,
    clients,
    speakingClients,
    startSpeaking,
    stopSpeaking,
    toggleChannelMute,
    adjustChannelVolume,
    createChannel,
    authorizeClient,
    refreshChannels: fetchChannels,
    refreshClients: fetchClients
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
