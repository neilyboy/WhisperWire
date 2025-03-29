import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { FaSave, FaUndo, FaNetworkWired, FaVolumeUp, FaCog } from 'react-icons/fa';

const ServerSetup = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      serverName: '',
      announcementsEnabled: true,
      logLevel: 'info'
    },
    network: {
      rtcMinPort: 10000,
      rtcMaxPort: 11000,
      websocketPort: 5000,
      publicIp: ''
    },
    audio: {
      sampleRate: 48000,
      channelCount: 2,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      defaultGain: 1.0
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const { getServerSettings, updateServerSettings } = useSocket();
  const { showNotification } = useNotification();

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const serverSettings = await getServerSettings();
        if (serverSettings) {
          setSettings(serverSettings);
        }
      } catch (error) {
        showNotification('Failed to load server settings', 'error');
      }
    };
    
    loadSettings();
  }, [getServerSettings, showNotification]);

  // Handle input change
  const handleInputChange = (tab, field, value) => {
    setSettings(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value
      }
    }));
  };

  // Handle checkbox change
  const handleCheckboxChange = (tab, field) => {
    setSettings(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: !prev[tab][field]
      }
    }));
  };

  // Handle number input change
  const handleNumberChange = (tab, field, value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      handleInputChange(tab, field, numValue);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSaving(true);
    
    try {
      await updateServerSettings(settings);
      showNotification('Server settings saved successfully', 'success');
    } catch (error) {
      showNotification(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form to last saved settings
  const handleReset = async () => {
    try {
      const serverSettings = await getServerSettings();
      if (serverSettings) {
        setSettings(serverSettings);
        showNotification('Settings reset to last saved values', 'info');
      }
    } catch (error) {
      showNotification('Failed to reset settings', 'error');
    }
  };

  return (
    <SetupContainer>
      <SetupHeader>
        <Title>Server Setup</Title>
        <Description>Configure server settings for WhisperWire</Description>
      </SetupHeader>
      
      <SetupContent>
        <Sidebar>
          <TabButton 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')}
          >
            <FaCog /> General
          </TabButton>
          <TabButton 
            active={activeTab === 'network'} 
            onClick={() => setActiveTab('network')}
          >
            <FaNetworkWired /> Network
          </TabButton>
          <TabButton 
            active={activeTab === 'audio'} 
            onClick={() => setActiveTab('audio')}
          >
            <FaVolumeUp /> Audio
          </TabButton>
        </Sidebar>
        
        <SetupForm onSubmit={handleSubmit}>
          {activeTab === 'general' && (
            <TabContent>
              <SectionTitle>General Settings</SectionTitle>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="serverName">Server Name</Label>
                  <Input 
                    id="serverName"
                    type="text"
                    value={settings.general.serverName}
                    onChange={(e) => handleInputChange('general', 'serverName', e.target.value)}
                    placeholder="Enter server name"
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <CheckboxGroup>
                  <Checkbox 
                    id="announcementsEnabled"
                    checked={settings.general.announcementsEnabled}
                    onChange={() => handleCheckboxChange('general', 'announcementsEnabled')}
                  />
                  <CheckboxLabel htmlFor="announcementsEnabled">
                    Enable client announcements
                  </CheckboxLabel>
                </CheckboxGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="logLevel">Log Level</Label>
                  <Select 
                    id="logLevel"
                    value={settings.general.logLevel}
                    onChange={(e) => handleInputChange('general', 'logLevel', e.target.value)}
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </Select>
                </FormGroup>
              </FormRow>
            </TabContent>
          )}
          
          {activeTab === 'network' && (
            <TabContent>
              <SectionTitle>Network Settings</SectionTitle>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="publicIp">Public IP Address</Label>
                  <Input 
                    id="publicIp"
                    type="text"
                    value={settings.network.publicIp}
                    onChange={(e) => handleInputChange('network', 'publicIp', e.target.value)}
                    placeholder="Public IP or leave blank for auto-detect"
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="websocketPort">WebSocket Port</Label>
                  <Input 
                    id="websocketPort"
                    type="number"
                    value={settings.network.websocketPort}
                    onChange={(e) => handleNumberChange('network', 'websocketPort', e.target.value)}
                    min="1024"
                    max="65535"
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="rtcMinPort">RTC Min Port</Label>
                  <Input 
                    id="rtcMinPort"
                    type="number"
                    value={settings.network.rtcMinPort}
                    onChange={(e) => handleNumberChange('network', 'rtcMinPort', e.target.value)}
                    min="1024"
                    max="65535"
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="rtcMaxPort">RTC Max Port</Label>
                  <Input 
                    id="rtcMaxPort"
                    type="number"
                    value={settings.network.rtcMaxPort}
                    onChange={(e) => handleNumberChange('network', 'rtcMaxPort', e.target.value)}
                    min="1024"
                    max="65535"
                  />
                </FormGroup>
              </FormRow>
              
              <InfoMessage>
                Note: Changes to network settings require a server restart to take effect.
              </InfoMessage>
            </TabContent>
          )}
          
          {activeTab === 'audio' && (
            <TabContent>
              <SectionTitle>Audio Settings</SectionTitle>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="sampleRate">Sample Rate (Hz)</Label>
                  <Select 
                    id="sampleRate"
                    value={settings.audio.sampleRate}
                    onChange={(e) => handleNumberChange('audio', 'sampleRate', e.target.value)}
                  >
                    <option value="44100">44100 Hz</option>
                    <option value="48000">48000 Hz</option>
                    <option value="96000">96000 Hz</option>
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="channelCount">Channels</Label>
                  <Select 
                    id="channelCount"
                    value={settings.audio.channelCount}
                    onChange={(e) => handleNumberChange('audio', 'channelCount', e.target.value)}
                  >
                    <option value="1">Mono (1)</option>
                    <option value="2">Stereo (2)</option>
                  </Select>
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <Label htmlFor="defaultGain">Default Gain</Label>
                  <Input 
                    id="defaultGain"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.audio.defaultGain}
                    onChange={(e) => handleInputChange('audio', 'defaultGain', parseFloat(e.target.value))}
                  />
                  <RangeValue>{settings.audio.defaultGain.toFixed(1)}</RangeValue>
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <CheckboxGroup>
                  <Checkbox 
                    id="echoCancellation"
                    checked={settings.audio.echoCancellation}
                    onChange={() => handleCheckboxChange('audio', 'echoCancellation')}
                  />
                  <CheckboxLabel htmlFor="echoCancellation">
                    Echo Cancellation
                  </CheckboxLabel>
                </CheckboxGroup>
              </FormRow>
              
              <FormRow>
                <CheckboxGroup>
                  <Checkbox 
                    id="noiseSuppression"
                    checked={settings.audio.noiseSuppression}
                    onChange={() => handleCheckboxChange('audio', 'noiseSuppression')}
                  />
                  <CheckboxLabel htmlFor="noiseSuppression">
                    Noise Suppression
                  </CheckboxLabel>
                </CheckboxGroup>
              </FormRow>
              
              <FormRow>
                <CheckboxGroup>
                  <Checkbox 
                    id="autoGainControl"
                    checked={settings.audio.autoGainControl}
                    onChange={() => handleCheckboxChange('audio', 'autoGainControl')}
                  />
                  <CheckboxLabel htmlFor="autoGainControl">
                    Auto Gain Control
                  </CheckboxLabel>
                </CheckboxGroup>
              </FormRow>
            </TabContent>
          )}
          
          <FormActions>
            <ResetButton type="button" onClick={handleReset}>
              <FaUndo /> Reset
            </ResetButton>
            <SaveButton type="submit" disabled={isSaving}>
              <FaSave /> {isSaving ? 'Saving...' : 'Save Settings'}
            </SaveButton>
          </FormActions>
        </SetupForm>
      </SetupContent>
    </SetupContainer>
  );
};

const SetupContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 140px);
`;

const SetupHeader = styled.div`
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
`;

const Description = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const SetupContent = styled.div`
  display: flex;
  flex: 1;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 200px;
  background-color: var(--bg-tertiary);
  padding: 1rem;
  
  @media (max-width: 768px) {
    width: 100%;
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.5rem;
  }
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  background-color: ${({ active }) => 
    active ? 'var(--accent-primary)' : 'transparent'};
  color: ${({ active }) => 
    active ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-md);
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ active }) => 
      active ? 'var(--accent-secondary)' : 'var(--bg-secondary)'};
    color: ${({ active }) => 
      active ? 'var(--text-invert)' : 'var(--text-primary)'};
  }
  
  @media (max-width: 768px) {
    width: auto;
    margin-bottom: 0;
    white-space: nowrap;
  }
`;

const SetupForm = styled.form`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
`;

const TabContent = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--bg-tertiary);
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
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
  
  &[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: var(--bg-primary);
    border-radius: 4px;
    outline: none;
    padding: 0;
    
    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-primary);
      cursor: pointer;
    }
    
    &::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-primary);
      cursor: pointer;
      border: none;
    }
  }
`;

const Select = styled.select`
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

const RangeValue = styled.span`
  color: var(--text-secondary);
  margin-left: 0.5rem;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--bg-tertiary);
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
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
  padding: 0.75rem 1.5rem;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
`;

const InfoMessage = styled.div`
  padding: 0.75rem;
  background-color: var(--bg-primary);
  border-left: 3px solid var(--accent-primary);
  color: var(--text-secondary);
  border-radius: var(--border-radius-sm);
  margin-top: 1rem;
  font-size: 0.9rem;
`;

export default ServerSetup;
