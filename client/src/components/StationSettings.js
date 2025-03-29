import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaMicrophone, FaHeadphones, FaVolumeUp, FaCheck, FaTimes, FaCog } from 'react-icons/fa';
import { useAudio } from '../contexts/AudioContext';
import { useNotification } from '../contexts/NotificationContext';

const StationSettings = () => {
  const [availableDevices, setAvailableDevices] = useState({
    audioInput: [],
    audioOutput: []
  });
  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: '',
    audioOutput: ''
  });
  const [testingMicrophone, setTestingMicrophone] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [audioProcessing, setAudioProcessing] = useState({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  });
  
  const testAudioRef = useRef(null);
  const testInterval = useRef(null);
  
  const { updateAudioSettings, getUserMediaStream, audioLevels } = useAudio();
  const { showNotification } = useNotification();

  // Load available devices on component mount
  useEffect(() => {
    loadAvailableDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadAvailableDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadAvailableDevices);
      stopTestingMicrophone();
      stopTestingOutput();
    };
  }, []);

  // Update mic level from audioLevels
  useEffect(() => {
    if (testingMicrophone) {
      setMicLevel(audioLevels.mic || 0);
    }
  }, [audioLevels, testingMicrophone]);

  const loadAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`
        }));
      
      const audioOutputDevices = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 5)}...`
        }));
      
      setAvailableDevices({
        audioInput: audioInputDevices,
        audioOutput: audioOutputDevices
      });
      
      // Load saved device preferences
      const savedSettings = JSON.parse(localStorage.getItem('whisperwire_audio_settings') || '{}');
      
      setSelectedDevices(prev => ({
        audioInput: savedSettings.audioInput || prev.audioInput || (audioInputDevices[0]?.id || ''),
        audioOutput: savedSettings.audioOutput || prev.audioOutput || (audioOutputDevices[0]?.id || '')
      }));
      
      setAudioProcessing(prev => ({
        echoCancellation: savedSettings.echoCancellation !== undefined ? savedSettings.echoCancellation : prev.echoCancellation,
        noiseSuppression: savedSettings.noiseSuppression !== undefined ? savedSettings.noiseSuppression : prev.noiseSuppression,
        autoGainControl: savedSettings.autoGainControl !== undefined ? savedSettings.autoGainControl : prev.autoGainControl
      }));
    } catch (error) {
      console.error('Failed to load audio devices', error);
      showNotification('Failed to load audio devices. Please check browser permissions.', 'error');
    }
  };

  const handleDeviceChange = (type, deviceId) => {
    setSelectedDevices(prev => ({
      ...prev,
      [type]: deviceId
    }));
  };

  const handleProcessingToggle = (feature) => {
    setAudioProcessing(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const startTestingMicrophone = async () => {
    try {
      setTestingMicrophone(true);
      
      // Start microphone test
      await getUserMediaStream({
        audio: {
          deviceId: selectedDevices.audioInput ? { exact: selectedDevices.audioInput } : undefined,
          echoCancellation: audioProcessing.echoCancellation,
          noiseSuppression: audioProcessing.noiseSuppression,
          autoGainControl: audioProcessing.autoGainControl
        }
      });
    } catch (error) {
      console.error('Failed to test microphone', error);
      showNotification('Failed to test microphone. Please check browser permissions.', 'error');
      setTestingMicrophone(false);
    }
  };

  const stopTestingMicrophone = () => {
    setTestingMicrophone(false);
  };

  const startTestingOutput = () => {
    if (!testAudioRef.current) return;
    
    try {
      // Set output device if supported
      if (typeof testAudioRef.current.setSinkId === 'function' && selectedDevices.audioOutput) {
        testAudioRef.current.setSinkId(selectedDevices.audioOutput);
      }
      
      testAudioRef.current.play();
      setIsTestingOutput(true);
      
      // Stop after the audio ends
      testAudioRef.current.onended = stopTestingOutput;
    } catch (error) {
      console.error('Failed to test audio output', error);
      showNotification('Failed to test audio output', 'error');
    }
  };

  const stopTestingOutput = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
    }
    setIsTestingOutput(false);
  };

  const saveSettings = () => {
    try {
      // Save settings to local storage
      localStorage.setItem('whisperwire_audio_settings', JSON.stringify({
        audioInput: selectedDevices.audioInput,
        audioOutput: selectedDevices.audioOutput,
        ...audioProcessing
      }));
      
      // Update audio context
      updateAudioSettings({
        inputDeviceId: selectedDevices.audioInput,
        outputDeviceId: selectedDevices.audioOutput,
        ...audioProcessing
      });
      
      showNotification('Audio settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save audio settings', error);
      showNotification('Failed to save audio settings', 'error');
    }
  };

  return (
    <SettingsContainer>
      <SettingsHeader>
        <HeaderIcon>
          <FaCog />
        </HeaderIcon>
        <Title>Station Settings</Title>
      </SettingsHeader>
      
      <SettingsContent>
        <SettingsSection>
          <SectionTitle>
            <FaMicrophone />
            Microphone
          </SectionTitle>
          
          <FormGroup>
            <Label>Select Microphone</Label>
            <Select 
              value={selectedDevices.audioInput}
              onChange={(e) => handleDeviceChange('audioInput', e.target.value)}
            >
              {availableDevices.audioInput.length > 0 ? (
                availableDevices.audioInput.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))
              ) : (
                <option value="">No microphones found</option>
              )}
            </Select>
          </FormGroup>
          
          <TestContainer>
            <TestButton 
              onClick={testingMicrophone ? stopTestingMicrophone : startTestingMicrophone}
              active={testingMicrophone}
            >
              {testingMicrophone ? 'Stop Test' : 'Test Microphone'}
            </TestButton>
            
            {testingMicrophone && (
              <LevelMeter>
                <LevelFill level={micLevel * 100} />
              </LevelMeter>
            )}
          </TestContainer>
        </SettingsSection>
        
        <SettingsSection>
          <SectionTitle>
            <FaHeadphones />
            Speakers
          </SectionTitle>
          
          <FormGroup>
            <Label>Select Output Device</Label>
            <Select 
              value={selectedDevices.audioOutput}
              onChange={(e) => handleDeviceChange('audioOutput', e.target.value)}
            >
              {availableDevices.audioOutput.length > 0 ? (
                availableDevices.audioOutput.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))
              ) : (
                <option value="">No output devices found</option>
              )}
            </Select>
          </FormGroup>
          
          <TestContainer>
            <TestButton 
              onClick={isTestingOutput ? stopTestingOutput : startTestingOutput}
              active={isTestingOutput}
            >
              {isTestingOutput ? 'Stop Test' : 'Test Speakers'}
            </TestButton>
            
            <audio 
              ref={testAudioRef} 
              src="/test-audio.mp3" 
              preload="auto"
              style={{ display: 'none' }}
            />
          </TestContainer>
        </SettingsSection>
        
        <SettingsSection>
          <SectionTitle>
            <FaVolumeUp />
            Audio Processing
          </SectionTitle>
          
          <ProcessingOptions>
            <ProcessingOption>
              <ToggleSwitch 
                active={audioProcessing.echoCancellation}
                onClick={() => handleProcessingToggle('echoCancellation')}
              >
                <ToggleTrack active={audioProcessing.echoCancellation}>
                  <ToggleThumb />
                </ToggleTrack>
                <ToggleStatus>
                  {audioProcessing.echoCancellation ? (
                    <ToggleIcon active><FaCheck /></ToggleIcon>
                  ) : (
                    <ToggleIcon><FaTimes /></ToggleIcon>
                  )}
                </ToggleStatus>
              </ToggleSwitch>
              <OptionLabel>Echo Cancellation</OptionLabel>
            </ProcessingOption>
            
            <ProcessingOption>
              <ToggleSwitch 
                active={audioProcessing.noiseSuppression}
                onClick={() => handleProcessingToggle('noiseSuppression')}
              >
                <ToggleTrack active={audioProcessing.noiseSuppression}>
                  <ToggleThumb />
                </ToggleTrack>
                <ToggleStatus>
                  {audioProcessing.noiseSuppression ? (
                    <ToggleIcon active><FaCheck /></ToggleIcon>
                  ) : (
                    <ToggleIcon><FaTimes /></ToggleIcon>
                  )}
                </ToggleStatus>
              </ToggleSwitch>
              <OptionLabel>Noise Suppression</OptionLabel>
            </ProcessingOption>
            
            <ProcessingOption>
              <ToggleSwitch 
                active={audioProcessing.autoGainControl}
                onClick={() => handleProcessingToggle('autoGainControl')}
              >
                <ToggleTrack active={audioProcessing.autoGainControl}>
                  <ToggleThumb />
                </ToggleTrack>
                <ToggleStatus>
                  {audioProcessing.autoGainControl ? (
                    <ToggleIcon active><FaCheck /></ToggleIcon>
                  ) : (
                    <ToggleIcon><FaTimes /></ToggleIcon>
                  )}
                </ToggleStatus>
              </ToggleSwitch>
              <OptionLabel>Auto Gain Control</OptionLabel>
            </ProcessingOption>
          </ProcessingOptions>
        </SettingsSection>
      </SettingsContent>
      
      <SettingsFooter>
        <SaveButton onClick={saveSettings}>Save Settings</SaveButton>
      </SettingsFooter>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const SettingsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--bg-tertiary);
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border-radius: 50%;
`;

const Title = styled.h3`
  margin: 0;
  color: var(--text-primary);
`;

const SettingsContent = styled.div`
  padding: 1.5rem;
`;

const SettingsSection = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  border-bottom: 1px solid var(--bg-tertiary);
  padding-bottom: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
  
  option {
    background-color: var(--bg-tertiary);
  }
`;

const TestContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TestButton = styled.button`
  background-color: ${({ active }) => 
    active ? 'var(--accent-secondary)' : 'var(--bg-tertiary)'};
  color: ${({ active }) => 
    active ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ active }) => 
      active ? 'var(--accent-primary)' : 'var(--bg-primary)'};
    color: ${({ active }) => 
      active ? 'var(--text-invert)' : 'var(--text-primary)'};
  }
`;

const LevelMeter = styled.div`
  width: 100%;
  height: 10px;
  background-color: var(--bg-primary);
  border-radius: 5px;
  overflow: hidden;
`;

const LevelFill = styled.div`
  height: 100%;
  width: ${({ level }) => `${level}%`};
  background-color: ${({ level }) => {
    if (level < 30) return 'var(--success)';
    if (level < 70) return 'var(--warning)';
    return 'var(--error)';
  }};
  transition: width 0.1s ease-out;
`;

const ProcessingOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ProcessingOption = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ToggleSwitch = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ToggleTrack = styled.div`
  width: 44px;
  height: 24px;
  background-color: ${({ active }) => 
    active ? 'var(--accent-primary)' : 'var(--bg-tertiary)'};
  border-radius: 12px;
  transition: background-color 0.2s;
`;

const ToggleThumb = styled.div`
  position: absolute;
  left: ${({ active }) => active ? '24px' : '4px'};
  width: 16px;
  height: 16px;
  background-color: var(--text-primary);
  border-radius: 50%;
  transition: left 0.2s;
`;

const ToggleStatus = styled.div`
  position: absolute;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ToggleIcon = styled.div`
  font-size: 10px;
  color: ${({ active }) => 
    active ? 'var(--success)' : 'var(--error)'};
`;

const OptionLabel = styled.div`
  color: var(--text-primary);
`;

const SettingsFooter = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
  display: flex;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--accent-secondary);
  }
`;

export default StationSettings;
