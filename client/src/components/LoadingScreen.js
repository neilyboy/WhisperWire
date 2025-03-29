import React from 'react';
import styled, { keyframes } from 'styled-components';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <LoadingContainer>
      <LoadingSpinner />
      <LoadingMessage>{message}</LoadingMessage>
    </LoadingContainer>
  );
};

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg-primary);
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid var(--bg-tertiary);
  border-top: 5px solid var(--accent-primary);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const LoadingMessage = styled.p`
  color: var(--text-primary);
  font-size: 1.2rem;
  text-align: center;
`;

export default LoadingScreen;
