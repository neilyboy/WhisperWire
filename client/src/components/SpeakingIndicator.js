import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FaMicrophone } from 'react-icons/fa';

const SpeakingIndicator = ({ name, channelName }) => {
  return (
    <IndicatorContainer>
      <IconContainer>
        <FaMicrophone />
      </IconContainer>
      <SpeakerInfo>
        <SpeakerName>{name}</SpeakerName>
        <ChannelName>{channelName}</ChannelName>
      </SpeakerInfo>
    </IndicatorContainer>
  );
};

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
  }
`;

const IndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  border-left: 3px solid var(--success);
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--success-bg);
  color: var(--success);
  animation: ${pulse} 1.5s infinite;
`;

const SpeakerInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const SpeakerName = styled.div`
  color: var(--text-primary);
  font-weight: 500;
`;

const ChannelName = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

export default SpeakingIndicator;
