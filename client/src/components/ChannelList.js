import React from 'react';
import styled from 'styled-components';
import { FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

const ChannelList = ({ 
  channels, 
  userChannels,
  activeChannel, 
  onSelectChannel, 
  muted, 
  volumes,
  onMuteToggle,
  onVolumeChange
}) => {
  // Filter channels that the user has access to
  const availableChannels = channels.filter(channel => 
    userChannels.includes(channel.id)
  );

  if (availableChannels.length === 0) {
    return (
      <EmptyMessage>No channels available</EmptyMessage>
    );
  }

  return (
    <ChannelListContainer>
      {availableChannels.map(channel => (
        <ChannelItem 
          key={channel.id}
          active={activeChannel === channel.id}
          onClick={() => onSelectChannel(channel.id)}
        >
          <ChannelInfo>
            <ChannelName>{channel.name}</ChannelName>
            <ChannelDescription>{channel.description}</ChannelDescription>
          </ChannelInfo>
          
          <ChannelControls>
            <MuteButton 
              muted={muted[channel.id]} 
              onClick={(e) => {
                e.stopPropagation();
                onMuteToggle(channel.id);
              }}
            >
              {muted[channel.id] ? <FaVolumeMute /> : <FaVolumeUp />}
            </MuteButton>
            
            <VolumeSlider 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={volumes[channel.id] || 1}
              onChange={(e) => {
                e.stopPropagation();
                onVolumeChange(channel.id, parseFloat(e.target.value));
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </ChannelControls>
        </ChannelItem>
      ))}
    </ChannelListContainer>
  );
};

const ChannelListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const ChannelItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: var(--border-radius-md);
  background-color: ${({ active }) => 
    active ? 'var(--bg-tertiary)' : 'transparent'};
  border-left: 3px solid ${({ active }) => 
    active ? 'var(--accent-primary)' : 'transparent'};
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
`;

const ChannelInfo = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
`;

const ChannelDescription = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

const ChannelControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const MuteButton = styled.button`
  background: none;
  border: none;
  color: ${({ muted }) => 
    muted ? 'var(--warning)' : 'var(--text-secondary)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  
  &:hover {
    color: ${({ muted }) => 
      muted ? 'var(--error)' : 'var(--text-primary)'};
  }
`;

const VolumeSlider = styled.input`
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-primary);
  border-radius: 3px;
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
    border: none;
  }
`;

const EmptyMessage = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
`;

export default ChannelList;
