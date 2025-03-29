import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [activeTab, setActiveTab] = useState('client');
  const [clientName, setClientName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [serverPassword, setServerPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, adminLogin } = useAuth();

  const handleClientLogin = async (e) => {
    e.preventDefault();
    
    if (!clientName || !serverPassword) {
      setError('Please enter your name and the server password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await login(clientName, serverPassword);
    } catch (error) {
      setError(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    if (!adminName || !serverPassword || !adminKey) {
      setError('Please enter your name, server password, and admin key');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await adminLogin(adminName, serverPassword, adminKey);
    } catch (error) {
      setError(error.message || 'Failed to login as admin. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <LogoSection>
          <LogoTitle>WhisperWire</LogoTitle>
          <LogoSubtitle>Low-Latency Audio Communications</LogoSubtitle>
        </LogoSection>
        
        <TabContainer>
          <TabButton 
            active={activeTab === 'client'} 
            onClick={() => setActiveTab('client')}
          >
            Client Login
          </TabButton>
          <TabButton 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')}
          >
            Admin Login
          </TabButton>
        </TabContainer>
        
        {activeTab === 'client' ? (
          <Form onSubmit={handleClientLogin}>
            <FormGroup>
              <Label htmlFor="clientName">Your Name</Label>
              <Input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter your name"
                disabled={loading}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="serverPassword">Server Password</Label>
              <Input
                id="serverPassword"
                type="password"
                value={serverPassword}
                onChange={(e) => setServerPassword(e.target.value)}
                placeholder="Enter server password"
                disabled={loading}
                required
              />
            </FormGroup>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <SubmitButton type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect to Server'}
            </SubmitButton>
          </Form>
        ) : (
          <Form onSubmit={handleAdminLogin}>
            <FormGroup>
              <Label htmlFor="adminName">Admin Name</Label>
              <Input
                id="adminName"
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Enter admin name"
                disabled={loading}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="adminServerPassword">Server Password</Label>
              <Input
                id="adminServerPassword"
                type="password"
                value={serverPassword}
                onChange={(e) => setServerPassword(e.target.value)}
                placeholder="Enter server password"
                disabled={loading}
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="adminKey">Admin Key</Label>
              <Input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin key"
                disabled={loading}
                required
              />
            </FormGroup>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <SubmitButton type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Login as Admin'}
            </SubmitButton>
          </Form>
        )}
      </LoginCard>
    </LoginContainer>
  );
};

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 1rem;
`;

const LoginCard = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow);
  width: 100%;
  max-width: 450px;
  overflow: hidden;
`;

const LogoSection = styled.div`
  text-align: center;
  padding: 2rem 1.5rem;
  background-color: var(--bg-tertiary);
`;

const LogoTitle = styled.h1`
  color: var(--accent-primary);
  margin-bottom: 0.5rem;
  font-size: 2rem;
`;

const LogoSubtitle = styled.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid var(--bg-tertiary);
`;

const TabButton = styled.button`
  flex: 1;
  background-color: ${props => props.active ? 'var(--bg-secondary)' : 'var(--bg-tertiary)'};
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  border: none;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--bg-secondary)' : 'var(--bg-tertiary)'};
    color: var(--text-primary);
  }
`;

const Form = styled.form`
  padding: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  
  &:focus {
    border-color: var(--accent-primary);
    outline: none;
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: var(--error);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const SubmitButton = styled.button`
  width: 100%;
  background-color: var(--accent-primary);
  color: var(--text-primary);
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--accent-secondary);
  }
  
  &:disabled {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }
`;

export default Login;
