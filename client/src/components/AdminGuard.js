import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

const AdminGuard = ({ children }) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen message="Checking authorization..." />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!currentUser?.isAdmin) {
    return <Navigate to="/console" />;
  }
  
  return children;
};

export default AdminGuard;
