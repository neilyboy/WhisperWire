import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPlug, FaSave, FaUndo } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { useSocket } from '../contexts/SocketContext';

const BitfocusCompanionSettings = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    ipAddress: '',
    port: 16622,
    connectionTimeout: 5000,
    reconnectInterval: 3000
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const { showNotification } = useNotification();
  const { getCompanionSettings, updateCompanionSettings, companionStatus } = useSocket();

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const companionSettings = await getCompanionSettings();
        if (companionSettings) {
          setSettings(companionSettings);
        }
      } catch (error) {
        showNotification('Failed to load Companion settings', 'error');
      }
    };
    
    loadSettings();
  }, [getCompanionSettings, showNotification]);

  // Update connection status when companionStatus changes
  useEffect(() => {
    if (companionStatus) {
      setIsConnected(companionStatus.connected);
    }
  }, [companionStatus]);

  // Handle input change
  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle number input change
  const handleNumberChange = (field, value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      handleInputChange(field, numValue);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Save settings
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await updateCompanionSettings(settings);
      showNotification('Bitfocus Companion settings saved successfully', 'success');
    } catch (error) {
      showNotification(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      enabled: false,
      ipAddress: '',
      port: 16622,
      connectionTimeout: 5000,
      reconnectInterval: 3000
    });
    
    showNotification('Settings reset to defaults', 'info');
  };

  return (
    <CompanionCard>
      <CardHeader>
        <IconContainer>
          <FaPlug />
        </IconContainer>
        <HeaderContent>
          <CardTitle>Bitfocus Companion Integration</CardTitle>
          <CardSubtitle>Connect WhisperWire to Bitfocus Companion for Stream Deck control</CardSubtitle>
        </HeaderContent>
        <ConnectionStatus connected={isConnected}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </ConnectionStatus>
      </CardHeader>
      
      <CardContent>
        <Form onSubmit={handleSave}>
          <FormRow>
            <CheckboxGroup>
              <Checkbox 
                id="companionEnabled"
                checked={settings.enabled}
                onChange={() => handleCheckboxChange('enabled')}
              />
              <CheckboxLabel htmlFor="companionEnabled">
                Enable Bitfocus Companion Integration
              </CheckboxLabel>
            </CheckboxGroup>
          </FormRow>
          
          <FormRow>
            <FormGroup>
              <Label htmlFor="ipAddress">Companion IP Address</Label>
              <Input 
                id="ipAddress"
                type="text"
                value={settings.ipAddress}
                onChange={(e) => handleInputChange('ipAddress', e.target.value)}
                placeholder="Enter IP address (e.g. 127.0.0.1)"
                disabled={!settings.enabled}
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="port">Companion Port</Label>
              <Input 
                id="port"
                type="number"
                value={settings.port}
                onChange={(e) => handleNumberChange('port', e.target.value)}
                min="1"
                max="65535"
                disabled={!settings.enabled}
              />
            </FormGroup>
          </FormRow>
          
          <FormRow>
            <FormGroup>
              <Label htmlFor="connectionTimeout">Connection Timeout (ms)</Label>
              <Input 
                id="connectionTimeout"
                type="number"
                value={settings.connectionTimeout}
                onChange={(e) => handleNumberChange('connectionTimeout', e.target.value)}
                min="1000"
                step="1000"
                disabled={!settings.enabled}
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="reconnectInterval">Reconnect Interval (ms)</Label>
              <Input 
                id="reconnectInterval"
                type="number"
                value={settings.reconnectInterval}
                onChange={(e) => handleNumberChange('reconnectInterval', e.target.value)}
                min="1000"
                step="1000"
                disabled={!settings.enabled}
              />
            </FormGroup>
          </FormRow>
          
          <InfoBox>
            <strong>Note:</strong> Bitfocus Companion allows you to control WhisperWire through a Stream Deck. 
            Each button can be configured to trigger specific actions like talk, listen, or mute functions.
          </InfoBox>
          
          <FormActions>
            <ResetButton type="button" onClick={handleReset}>
              <FaUndo /> Reset to Defaults
            </ResetButton>
            <SaveButton type="submit" disabled={isSaving}>
              <FaSave /> {isSaving ? 'Saving...' : 'Save Settings'}
            </SaveButton>
          </FormActions>
        </Form>
      </CardContent>
    </CompanionCard>
  );
};

const CompanionCard = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const CardHeader = styled.div`
  background-color: var(--bg-tertiary);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconContainer = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border-radius: 50%;
  font-size: 1.2rem;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const CardTitle = styled.h3`
  margin: 0 0 0.25rem 0;
  color: var(--text-primary);
`;

const CardSubtitle = styled.p`
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
`;

const ConnectionStatus = styled.div`
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: ${({ connected }) => 
    connected ? 'var(--success-bg)' : 'var(--error-bg)'};
  color: ${({ connected }) => 
    connected ? 'var(--success)' : 'var(--error)'};
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FormGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  
  &:focus {
    border-color: var(--accent-primary);
    outline: none;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  color: var(--text-primary);
  cursor: pointer;
`;

const InfoBox = styled.div`
  background-color: var(--bg-tertiary);
  padding: 1rem;
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  font-size: 0.9rem;
  
  strong {
    color: var(--text-primary);
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-secondary);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
`;

export default BitfocusCompanionSettings;
