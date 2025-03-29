import React from 'react';
import styled from 'styled-components';
import { useNotification } from '../contexts/NotificationContext';

const Notifications = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <NotificationContainer>
      {notifications.map((notification) => (
        <NotificationItem 
          key={notification.id} 
          type={notification.type}
          onClick={() => removeNotification(notification.id)}
        >
          <NotificationMessage>{notification.message}</NotificationMessage>
          <CloseButton>&times;</CloseButton>
        </NotificationItem>
      ))}
    </NotificationContainer>
  );
};

const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
`;

const NotificationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--border-radius-md);
  background-color: ${({ type }) => {
    switch (type) {
      case 'success':
        return 'rgba(3, 218, 198, 0.2)';
      case 'error':
        return 'rgba(207, 102, 121, 0.2)';
      case 'warning':
        return 'rgba(255, 183, 77, 0.2)';
      default:
        return 'rgba(0, 184, 212, 0.2)';
    }
  }};
  border-left: 4px solid ${({ type }) => {
    switch (type) {
      case 'success':
        return 'var(--success)';
      case 'error':
        return 'var(--error)';
      case 'warning':
        return 'var(--warning)';
      default:
        return 'var(--accent-primary)';
    }
  }};
  box-shadow: var(--box-shadow);
  cursor: pointer;
  animation: slideIn 0.3s ease-out forwards;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const NotificationMessage = styled.div`
  color: var(--text-primary);
  font-size: 0.9rem;
  margin-right: 10px;
`;

const CloseButton = styled.div`
  color: var(--text-secondary);
  font-size: 1.2rem;
  line-height: 1;
  
  &:hover {
    color: var(--text-primary);
  }
`;

export default Notifications;
