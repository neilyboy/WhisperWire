import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaMicrophone, FaMicrophoneSlash, FaExchangeAlt } from 'react-icons/fa';

const AudioControls = ({
  activeChannel,
  micActive,
  audioLevel,
  onDuplexToggle,
  onPushToTalkStart,
  onPushToTalkEnd,
  enabled
}) => {
  const [duplexMode, setDuplexMode] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  
  // Update duplex mode if mic state changes externally
  useEffect(() => {
    setDuplexMode(micActive[activeChannel] === 'duplex');
  }, [micActive, activeChannel]);

  // Handle duplex mode toggle
  const handleDuplexToggle = () => {
    setDuplexMode(prev => !prev);
    onDuplexToggle();
  };

  // Handle push to talk
  const handlePushStart = () => {
    if (!duplexMode && enabled) {
      setPushActive(true);
      onPushToTalkStart();
    }
  };

  const handlePushEnd = () => {
    if (!duplexMode && enabled) {
      setPushActive(false);
      onPushToTalkEnd();
    }
  };

  // Calculate meter level (0-100)
  const meterLevel = Math.min(100, Math.round(audioLevel * 100));

  return (
    <ControlsContainer>
      <SectionTitle>Audio Controls</SectionTitle>
      
      <ControlsWrapper>
        <ModeToggle>
          <DuplexToggle
            active={duplexMode}
            onClick={handleDuplexToggle}
            disabled={!enabled}
          >
            <FaExchangeAlt />
            <ToggleLabel>Duplex Mode</ToggleLabel>
          </DuplexToggle>
        </ModeToggle>
        
        <MicrophoneSection>
          <MicMeter>
            <MicMeterFill level={meterLevel} active={duplexMode || pushActive} />
          </MicMeter>
          
          {duplexMode ? (
            <DuplexActive>
              <MicIcon active={true} />
              <MicStatusText>Mic Always On</MicStatusText>
            </DuplexActive>
          ) : (
            <PushToTalkButton
              onMouseDown={handlePushStart}
              onMouseUp={handlePushEnd}
              onTouchStart={handlePushStart}
              onTouchEnd={handlePushEnd}
              onMouseLeave={handlePushEnd}
              active={pushActive}
              disabled={!enabled}
            >
              {pushActive ? <FaMicrophone /> : <FaMicrophoneSlash />}
              <ButtonText>
                {pushActive ? 'Talking' : 'Push to Talk'}
              </ButtonText>
            </PushToTalkButton>
          )}
        </MicrophoneSection>
      </ControlsWrapper>
      
      <MicInstructions>
        {duplexMode 
          ? 'Your microphone is always on in duplex mode.'
          : 'Press and hold the button to speak.'}
      </MicInstructions>
    </ControlsContainer>
  );
};

const ControlsContainer = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: 1rem;
`;

const ControlsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModeToggle = styled.div`
  display: flex;
  justify-content: center;
`;

const DuplexToggle = styled.button`
  display: flex;
  align-items: center;
  background-color: ${({ active }) => 
    active ? 'var(--accent-primary)' : 'var(--bg-secondary)'};
  color: ${({ active }) => 
    active ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ active }) => 
      active ? 'var(--accent-secondary)' : 'var(--bg-primary)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToggleLabel = styled.span`
  margin-left: 0.5rem;
`;

const MicrophoneSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const MicMeter = styled.div`
  width: 100%;
  height: 10px;
  background-color: var(--bg-secondary);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const MicMeterFill = styled.div`
  height: 100%;
  width: ${({ level }) => `${level}%`};
  background-color: ${({ active }) => 
    active ? 'var(--success)' : 'var(--bg-primary)'};
  border-radius: 5px;
  transition: width 0.1s ease;
`;

const DuplexActive = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--success-bg);
  border-radius: var(--border-radius-md);
  color: var(--success);
`;

const MicIcon = styled(FaMicrophone)`
  color: ${({ active }) => 
    active ? 'var(--success)' : 'var(--text-secondary)'};
`;

const MicStatusText = styled.span`
  font-weight: 500;
`;

const PushToTalkButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 80%;
  background-color: ${({ active }) => 
    active ? 'var(--success)' : 'var(--bg-secondary)'};
  color: ${({ active }) => 
    active ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-md);
  padding: 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: ${({ active }) => 
      active ? 'var(--success-dark)' : 'var(--bg-primary)'};
  }
  
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonText = styled.span`
  font-weight: 500;
`;

const MicInstructions = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
  margin-top: 1rem;
`;

export default AudioControls;
