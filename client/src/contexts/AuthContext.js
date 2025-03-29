import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from './NotificationContext';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Token is handled by axios interceptors
          const response = await apiService.auth.verifyToken();
          
          if (response.valid) {
            const userData = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(userData);
            setIsAuthenticated(true);
          } else {
            // Invalid token, logout user
            logout();
          }
        } catch (error) {
          console.error('Error verifying authentication:', error);
          logout();
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = async (clientName, serverPassword) => {
    try {
      setIsLoading(true);
      
      const response = await apiService.auth.login(clientName, serverPassword);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.client));
        
        // Token is stored in localStorage and handled by axios interceptors
        setCurrentUser(response.client);
        
        if (response.client.pending) {
          setPending(true);
          showNotification('Connected to server. Waiting for admin authorization.', 'info');
        } else {
          setIsAuthenticated(true);
          navigate('/console');
          showNotification('Login successful', 'success');
        }
        
        return response;
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Admin login function
  const adminLogin = async (adminName, serverPassword, adminKey) => {
    try {
      setIsLoading(true);
      
      const response = await apiService.auth.adminLogin(adminName, serverPassword, adminKey);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.client));
        
        // Token is stored in localStorage and handled by axios interceptors
        setCurrentUser(response.client);
        setIsAuthenticated(true);
        
        navigate('/admin');
        showNotification('Admin login successful', 'success');
        
        return response;
      }
    } catch (error) {
      console.error('Admin login error:', error);
      showNotification(error.message || 'Admin login failed. Please check your credentials.', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPending(false);
    
    // Token is removed from localStorage
    navigate('/login');
  };

  // Update authorization status
  const updateAuthStatus = (authorized, permissions = {}, channels = []) => {
    if (authorized) {
      setCurrentUser(prev => ({
        ...prev,
        authorized: true,
        pending: false,
        permissions,
        channels
      }));
      
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        authorized: true,
        pending: false,
        permissions,
        channels
      }));
      
      setIsAuthenticated(true);
      setPending(false);
      
      showNotification('You have been authorized by the admin', 'success');
      navigate('/console');
    } else {
      // Rejected by admin
      showNotification('Your authorization request was rejected by the admin', 'error');
      logout();
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    pending,
    login,
    adminLogin,
    logout,
    updateAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
