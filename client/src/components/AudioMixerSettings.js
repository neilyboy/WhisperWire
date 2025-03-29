import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { FaSave, FaSlash, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

const AudioMixerSettings = () => {
  const [mixerSettings, setMixerSettings] = useState({
    outputGain: 1.0,
    channelGains: {},
    channelMutes: {},
    masterCompressor: {
      enabled: true,
      threshold: -24,
      ratio: 4,
      attack: 0.003,
      release: 0.25
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const { channels, getMixerSettings, updateMixerSettings } = useSocket();
  const { showNotification } = useNotification();

  // Load mixer settings on component mount
  useEffect(() => {
    loadMixerSettings();
  }, []);

  // Update channel gains and mutes when channels change
  useEffect(() => {
    if (channels && channels.length > 0) {
      setMixerSettings(prev => {
        const channelGains = { ...prev.channelGains };
        const channelMutes = { ...prev.channelMutes };
        
        channels.forEach(channel => {
          if (channelGains[channel.id] === undefined) {
            channelGains[channel.id] = 1.0;
          }
          if (channelMutes[channel.id] === undefined) {
            channelMutes[channel.id] = false;
          }
        });
        
        return {
          ...prev,
          channelGains,
          channelMutes
        };
      });
    }
  }, [channels]);

  const loadMixerSettings = async () => {
    try {
      const settings = await getMixerSettings();
      if (settings) {
        setMixerSettings(settings);
      }
    } catch (error) {
      showNotification('Failed to load mixer settings', 'error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await updateMixerSettings(mixerSettings);
      showNotification('Mixer settings saved successfully', 'success');
    } catch (error) {
      showNotification(`Failed to save mixer settings: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOutputGainChange = (value) => {
    setMixerSettings(prev => ({
      ...prev,
      outputGain: parseFloat(value)
    }));
  };

  const handleChannelGainChange = (channelId, value) => {
    setMixerSettings(prev => ({
      ...prev,
      channelGains: {
        ...prev.channelGains,
        [channelId]: parseFloat(value)
      }
    }));
  };

  const handleChannelMuteToggle = (channelId) => {
    setMixerSettings(prev => ({
      ...prev,
      channelMutes: {
        ...prev.channelMutes,
        [channelId]: !prev.channelMutes[channelId]
      }
    }));
  };

  const handleCompressorChange = (field, value) => {
    setMixerSettings(prev => ({
      ...prev,
      masterCompressor: {
        ...prev.masterCompressor,
        [field]: typeof value === 'string' ? parseFloat(value) : value
      }
    }));
  };

  const formatDbValue = (value) => {
    return `${value.toFixed(1)} dB`;
  };

  const formatRatioValue = (value) => {
    return `${value}:1`;
  };

  const formatTimeValue = (value) => {
    return value < 0.001 ? `${(value * 1000).toFixed(2)} μs` : `${value.toFixed(3)} ms`;
  };

  return (
    <MixerContainer>
      <MixerHeader>
        <MixerTitle>Audio Mixer</MixerTitle>
        <SaveButton onClick={handleSave} disabled={isSaving}>
          <FaSave /> {isSaving ? 'Saving...' : 'Save Settings'}
        </SaveButton>
      </MixerHeader>
      
      <MixerSection>
        <SectionTitle>Master Output</SectionTitle>
        <ControlGroup>
          <ControlLabel>Output Gain</ControlLabel>
          <SliderContainer>
            <Slider 
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={mixerSettings.outputGain}
              onChange={(e) => handleOutputGainChange(e.target.value)}
            />
            <SliderValue>{mixerSettings.outputGain.toFixed(2)}</SliderValue>
          </SliderContainer>
        </ControlGroup>
      </MixerSection>
      
      <MixerSection>
        <SectionTitle>Channel Gains</SectionTitle>
        {channels && channels.length > 0 ? (
          <ChannelList>
            {channels.map(channel => (
              <ChannelItem key={channel.id}>
                <ChannelHeader>
                  <ChannelName>{channel.name}</ChannelName>
                  <MuteButton 
                    muted={mixerSettings.channelMutes[channel.id]} 
                    onClick={() => handleChannelMuteToggle(channel.id)}
                  >
                    {mixerSettings.channelMutes[channel.id] ? <FaVolumeMute /> : <FaVolumeUp />}
                  </MuteButton>
                </ChannelHeader>
                <SliderContainer>
                  <Slider 
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={mixerSettings.channelGains[channel.id] || 1.0}
                    onChange={(e) => handleChannelGainChange(channel.id, e.target.value)}
                    disabled={mixerSettings.channelMutes[channel.id]}
                  />
                  <SliderValue>
                    {mixerSettings.channelMutes[channel.id] 
                      ? <MutedText><FaSlash /> MUTED</MutedText> 
                      : (mixerSettings.channelGains[channel.id] || 1.0).toFixed(2)
                    }
                  </SliderValue>
                </SliderContainer>
              </ChannelItem>
            ))}
          </ChannelList>
        ) : (
          <EmptyMessage>No channels available</EmptyMessage>
        )}
      </MixerSection>
      
      <MixerSection>
        <SectionTitle>Master Compressor</SectionTitle>
        <CompressorContainer>
          <CheckboxGroup>
            <Checkbox 
              id="compressorEnabled"
              checked={mixerSettings.masterCompressor.enabled}
              onChange={() => handleCompressorChange('enabled', !mixerSettings.masterCompressor.enabled)}
            />
            <CheckboxLabel htmlFor="compressorEnabled">Enable Compressor</CheckboxLabel>
          </CheckboxGroup>
          
          <ControlGroup>
            <ControlLabel>Threshold</ControlLabel>
            <SliderContainer>
              <Slider 
                type="range"
                min="-60"
                max="0"
                step="1"
                value={mixerSettings.masterCompressor.threshold}
                onChange={(e) => handleCompressorChange('threshold', e.target.value)}
                disabled={!mixerSettings.masterCompressor.enabled}
              />
              <SliderValue>{formatDbValue(mixerSettings.masterCompressor.threshold)}</SliderValue>
            </SliderContainer>
          </ControlGroup>
          
          <ControlGroup>
            <ControlLabel>Ratio</ControlLabel>
            <SliderContainer>
              <Slider 
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={mixerSettings.masterCompressor.ratio}
                onChange={(e) => handleCompressorChange('ratio', e.target.value)}
                disabled={!mixerSettings.masterCompressor.enabled}
              />
              <SliderValue>{formatRatioValue(mixerSettings.masterCompressor.ratio)}</SliderValue>
            </SliderContainer>
          </ControlGroup>
          
          <ControlGroup>
            <ControlLabel>Attack</ControlLabel>
            <SliderContainer>
              <Slider 
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={mixerSettings.masterCompressor.attack}
                onChange={(e) => handleCompressorChange('attack', e.target.value)}
                disabled={!mixerSettings.masterCompressor.enabled}
              />
              <SliderValue>{formatTimeValue(mixerSettings.masterCompressor.attack)}</SliderValue>
            </SliderContainer>
          </ControlGroup>
          
          <ControlGroup>
            <ControlLabel>Release</ControlLabel>
            <SliderContainer>
              <Slider 
                type="range"
                min="0.05"
                max="1"
                step="0.01"
                value={mixerSettings.masterCompressor.release}
                onChange={(e) => handleCompressorChange('release', e.target.value)}
                disabled={!mixerSettings.masterCompressor.enabled}
              />
              <SliderValue>{formatTimeValue(mixerSettings.masterCompressor.release)}</SliderValue>
            </SliderContainer>
          </ControlGroup>
        </CompressorContainer>
      </MixerSection>
    </MixerContainer>
  );
};

const MixerContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const MixerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
`;

const MixerTitle = styled.h3`
  margin: 0;
  color: var(--text-primary);
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
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

const MixerSection = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--bg-tertiary);
  
  &:last-child {
    border-bottom: none;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: var(--text-primary);
`;

const ControlGroup = styled.div`
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ControlLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-primary);
  border-radius: 3px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
    border: none;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SliderValue = styled.div`
  min-width: 60px;
  text-align: right;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
`;

const ChannelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChannelItem = styled.div`
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  padding: 0.75rem 1rem;
`;

const ChannelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ChannelName = styled.div`
  color: var(--text-primary);
  font-weight: 500;
`;

const MuteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${({ muted }) => 
    muted ? 'var(--error)' : 'var(--bg-primary)'};
  color: ${({ muted }) => 
    muted ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ muted }) => 
      muted ? 'var(--error-dark)' : 'var(--accent-primary)'};
    color: var(--text-invert);
  }
`;

const MutedText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--error);
  font-size: 0.8rem;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  margin-right: 0.5rem;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  color: var(--text-primary);
  cursor: pointer;
`;

const CompressorContainer = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
`;

const EmptyMessage = styled.div`
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 1rem;
`;

export default AudioMixerSettings;
