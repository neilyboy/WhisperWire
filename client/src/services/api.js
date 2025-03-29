import axios from 'axios';

// Get the server hostname from the current URL
const hostname = window.location.hostname;

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || `http://${hostname}:5000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('whisperwire_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('whisperwire_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (name, password) => 
    api.post('/auth/login', { name, password }),
  
  adminLogin: (name, password, adminKey) => 
    api.post('/auth/admin/login', { name, password, adminKey }),
  
  verifyToken: () => 
    api.get('/auth/verify')
};

// Channels endpoints
export const channelsAPI = {
  getAll: () => 
    api.get('/channels'),
  
  getById: (channelId) => 
    api.get(`/channels/${channelId}`),
  
  create: (channelData) => 
    api.post('/channels', channelData),
  
  update: (channelId, channelData) => 
    api.put(`/channels/${channelId}`, channelData),
  
  delete: (channelId) => 
    api.delete(`/channels/${channelId}`)
};

// Clients endpoints
export const clientsAPI = {
  getAll: () => 
    api.get('/clients'),
  
  getById: (clientId) => 
    api.get(`/clients/${clientId}`),
  
  update: (clientId, clientData) => 
    api.put(`/clients/${clientId}`, clientData),
  
  updatePermissions: (clientId, permissions) => 
    api.put(`/clients/${clientId}/permissions`, { permissions }),
  
  delete: (clientId) => 
    api.delete(`/clients/${clientId}`)
};

// Audio mixer endpoints
export const mixerAPI = {
  getSettings: () => 
    api.get('/mixer/settings'),
  
  updateSettings: (settings) => 
    api.put('/mixer/settings', settings),
  
  getMeterLevels: () => 
    api.get('/mixer/meters')
};

// Server settings endpoints
export const serverAPI = {
  getSettings: () => 
    api.get('/server/settings'),
  
  updateSettings: (settings) => 
    api.put('/server/settings', settings),
  
  getCompanionSettings: () => 
    api.get('/server/companion'),
  
  updateCompanionSettings: (settings) => 
    api.put('/server/companion', settings),
  
  getLogs: () => 
    api.get('/server/logs'),
  
  clearLogs: () => 
    api.delete('/server/logs')
};

// Export both the axios instance and the API modules
export default {
  instance: api,
  auth: authAPI,
  channels: channelsAPI,
  clients: clientsAPI,
  mixer: mixerAPI,
  server: serverAPI
};
