import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FaHome, FaExclamationTriangle } from 'react-icons/fa';

const NotFound = () => {
  return (
    <NotFoundContainer>
      <ErrorIcon>
        <FaExclamationTriangle />
      </ErrorIcon>
      <ErrorTitle>404</ErrorTitle>
      <ErrorMessage>Page Not Found</ErrorMessage>
      <ErrorDescription>
        The page you are looking for might have been removed, 
        had its name changed, or is temporarily unavailable.
      </ErrorDescription>
      <BackLink to="/console">
        <FaHome />
        Back to Console
      </BackLink>
    </NotFoundContainer>
  );
};

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 2rem;
  background-color: var(--bg-primary);
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 5rem;
  color: var(--warning);
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h1`
  font-size: 6rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin: 0 0 1rem 0;
`;

const ErrorMessage = styled.h2`
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
`;

const ErrorDescription = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 0 2rem 0;
  line-height: 1.5;
`;

const BackLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius-md);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--accent-secondary);
    text-decoration: none;
    color: var(--text-invert);
  }
`;

export default NotFound;
