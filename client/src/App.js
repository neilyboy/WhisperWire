import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AudioProvider } from './contexts/AudioContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Pages
import Login from './pages/Login';
import ClientConsole from './pages/ClientConsole';
import AdminConsole from './pages/AdminConsole';
import ServerSetup from './pages/ServerSetup';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
import Notifications from './components/Notifications';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppRoutes />
        <Notifications />
      </AuthProvider>
    </NotificationProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <SocketProvider>
      <AudioProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/console" /> : <Login />
          } />

          {/* Protected routes */}
          <Route element={<AuthGuard><Layout /></AuthGuard>}>
            <Route path="/" element={<Navigate to="/console" />} />
            
            <Route path="/console" element={<ClientConsole />} />
            
            <Route path="/admin" element={
              <AdminGuard>
                <AdminConsole />
              </AdminGuard>
            } />
            
            <Route path="/setup" element={
              <AdminGuard>
                <ServerSetup />
              </AdminGuard>
            } />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AudioProvider>
    </SocketProvider>
  );
}

export default App;
