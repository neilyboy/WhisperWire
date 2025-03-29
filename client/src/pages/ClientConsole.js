import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useAudio } from '../contexts/AudioContext';
import ChannelList from '../components/ChannelList';
import AudioControls from '../components/AudioControls';
import SpeakingIndicator from '../components/SpeakingIndicator';

const ClientConsole = () => {
  const [activeChannel, setActiveChannel] = useState(null);
  const [muted, setMuted] = useState({});
  const [volumes, setVolumes] = useState({});
  
  const { currentUser } = useAuth();
  const { channels, clients, speakingClients } = useSocket();
  const { micActive, audioLevels, toggleDuplexMode, startPushToTalk, stopPushToTalk } = useAudio();

  // Set initial active channel based on user's assigned channels
  useEffect(() => {
    if (currentUser?.channels?.length > 0 && !activeChannel) {
      setActiveChannel(currentUser.channels[0]);
    }
  }, [currentUser, activeChannel]);

  // Initialize mute states and volume levels
  useEffect(() => {
    if (currentUser?.channelSettings) {
      const initialMuted = {};
      const initialVolumes = {};
      
      Object.entries(currentUser.channelSettings).forEach(([channelId, settings]) => {
        initialMuted[channelId] = settings.muted || false;
        initialVolumes[channelId] = settings.volume || 1.0;
      });
      
      setMuted(initialMuted);
      setVolumes(initialVolumes);
    }
  }, [currentUser]);

  // Handle channel selection
  const handleChannelSelect = (channelId) => {
    setActiveChannel(channelId);
  };

  // Handle mute toggle
  const handleMuteToggle = (channelId) => {
    setMuted(prev => {
      const newState = {
        ...prev,
        [channelId]: !prev[channelId]
      };
      
      return newState;
    });
  };

  // Handle volume change
  const handleVolumeChange = (channelId, volume) => {
    setVolumes(prev => ({
      ...prev,
      [channelId]: volume
    }));
  };

  // Handle duplex mode toggle
  const handleDuplexToggle = () => {
    if (activeChannel) {
      toggleDuplexMode(activeChannel);
    }
  };

  // Handle push-to-talk
  const handlePushToTalkStart = () => {
    if (activeChannel) {
      startPushToTalk(activeChannel);
    }
  };

  const handlePushToTalkEnd = () => {
    if (activeChannel) {
      stopPushToTalk(activeChannel);
    }
  };

  // Get active speaking clients in the user's channels
  const activeSpeakers = Object.entries(speakingClients)
    .filter(([_, data]) => currentUser?.channels?.includes(data.channelId))
    .map(([clientId, data]) => ({
      id: clientId,
      name: data.name,
      channelId: data.channelId
    }));

  // Get channel name by ID
  const getChannelName = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? channel.name : 'Unknown Channel';
  };

  return (
    <ConsoleContainer>
      <ConsoleHeader>
        <Title>Communication Console</Title>
        <ClientInfo>
          Connected as: <ClientName>{currentUser?.name}</ClientName>
        </ClientInfo>
      </ConsoleHeader>
      
      <MainSection>
        <ChannelPanel>
          <PanelHeader>Channels</PanelHeader>
          <ChannelList 
            channels={channels}
            userChannels={currentUser?.channels || []}
            activeChannel={activeChannel}
            onSelectChannel={handleChannelSelect}
            muted={muted}
            volumes={volumes}
            onMuteToggle={handleMuteToggle}
            onVolumeChange={handleVolumeChange}
          />
        </ChannelPanel>
        
        <CommunicationPanel>
          <ActiveChannelHeader>
            {activeChannel ? (
              <>Active Channel: <ChannelTitle>{getChannelName(activeChannel)}</ChannelTitle></>
            ) : (
              'No channel selected'
            )}
          </ActiveChannelHeader>
          
          <SpeakersSection>
            <SectionLabel>Who's Speaking:</SectionLabel>
            {activeSpeakers.length > 0 ? (
              <SpeakersList>
                {activeSpeakers.map(speaker => (
                  <SpeakingIndicator 
                    key={speaker.id}
                    name={speaker.name}
                    channelName={getChannelName(speaker.channelId)}
                  />
                ))}
              </SpeakersList>
            ) : (
              <NoSpeakersMessage>No one is speaking right now</NoSpeakersMessage>
            )}
          </SpeakersSection>
          
          <AudioControls 
            activeChannel={activeChannel}
            micActive={micActive}
            audioLevel={audioLevels.mic || 0}
            onDuplexToggle={handleDuplexToggle}
            onPushToTalkStart={handlePushToTalkStart}
            onPushToTalkEnd={handlePushToTalkEnd}
            enabled={!!activeChannel}
          />
        </CommunicationPanel>
      </MainSection>
      
      <InfoSection>
        <InfoHeader>Channel Information</InfoHeader>
        {activeChannel ? (
          <ChannelInfo>
            <InfoItem>
              <InfoLabel>Channel:</InfoLabel>
              <InfoValue>{getChannelName(activeChannel)}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Status:</InfoLabel>
              <InfoValue>
                {muted[activeChannel] ? (
                  <MutedStatus>Muted</MutedStatus>
                ) : (
                  <LiveStatus>Live</LiveStatus>
                )}
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Volume:</InfoLabel>
              <InfoValue>{Math.round((volumes[activeChannel] || 1) * 100)}%</InfoValue>
            </InfoItem>
          </ChannelInfo>
        ) : (
          <NoChannelMessage>Select a channel to see information</NoChannelMessage>
        )}
      </InfoSection>
    </ConsoleContainer>
  );
};

const ConsoleContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  background-color: var(--bg-primary);
`;

const ConsoleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0;
`;

const ClientInfo = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const ClientName = styled.span`
  color: var(--accent-primary);
  font-weight: 500;
`;

const MainSection = styled.div`
  display: flex;
  flex: 1;
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ChannelPanel = styled.div`
  flex: 1;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    height: 40vh;
  }
`;

const PanelHeader = styled.div`
  background-color: var(--bg-tertiary);
  padding: 0.75rem 1rem;
  font-weight: 500;
  color: var(--text-primary);
`;

const CommunicationPanel = styled.div`
  flex: 2;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ActiveChannelHeader = styled.div`
  background-color: var(--bg-tertiary);
  padding: 0.75rem 1rem;
  font-weight: 500;
  color: var(--text-primary);
`;

const ChannelTitle = styled.span`
  color: var(--accent-primary);
  margin-left: 0.5rem;
`;

const SpeakersSection = styled.div`
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
`;

const SectionLabel = styled.div`
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
`;

const SpeakersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const NoSpeakersMessage = styled.div`
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
`;

const InfoSection = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
`;

const InfoHeader = styled.div`
  background-color: var(--bg-tertiary);
  padding: 0.75rem 1rem;
  font-weight: 500;
  color: var(--text-primary);
`;

const ChannelInfo = styled.div`
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoLabel = styled.span`
  color: var(--text-secondary);
`;

const InfoValue = styled.span`
  color: var(--text-primary);
  font-weight: 500;
`;

const MutedStatus = styled.span`
  color: var(--warning);
`;

const LiveStatus = styled.span`
  color: var(--success);
`;

const NoChannelMessage = styled.div`
  padding: 1rem;
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
`;

export default ClientConsole;
