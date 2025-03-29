import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  return (
    <LayoutContainer>
      <Header>
        <Logo to="/">WhisperWire</Logo>
        <Nav>
          <NavLink 
            to="/console" 
            className={location.pathname === '/console' ? 'active' : ''}
          >
            Console
          </NavLink>
          
          {currentUser?.isAdmin && (
            <NavLink 
              to="/admin" 
              className={location.pathname === '/admin' ? 'active' : ''}
            >
              Admin
            </NavLink>
          )}
          
          {currentUser?.isAdmin && (
            <NavLink 
              to="/setup" 
              className={location.pathname === '/setup' ? 'active' : ''}
            >
              Setup
            </NavLink>
          )}
        </Nav>
        <UserSection>
          <UserName>{currentUser?.name}</UserName>
          <LogoutButton onClick={logout}>Logout</LogoutButton>
        </UserSection>
      </Header>
      
      <MainContent>
        <Outlet />
      </MainContent>
      
      <Footer>
        <FooterText>
          WhisperWire &copy; {new Date().getFullYear()} - Low-Latency Audio Communications
        </FooterText>
      </Footer>
    </LayoutContainer>
  );
};

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--bg-secondary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
  }
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent-primary);
  text-decoration: none;
  
  &:hover {
    color: var(--accent-primary);
    text-decoration: none;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    gap: 1rem;
    margin: 0.5rem 0;
  }
`;

const NavLink = styled(Link)`
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
  
  &:hover {
    color: var(--text-primary);
    text-decoration: none;
  }
  
  &.active {
    color: var(--accent-primary);
    border-bottom: 2px solid var(--accent-primary);
    padding-bottom: 2px;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserName = styled.span`
  color: var(--text-primary);
  font-weight: 500;
`;

const LogoutButton = styled.button`
  background: none;
  color: var(--text-secondary);
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: var(--error);
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Footer = styled.footer`
  padding: 1rem 2rem;
  background-color: var(--bg-secondary);
  text-align: center;
`;

const FooterText = styled.p`
  color: var(--text-secondary);
  font-size: 0.875rem;
`;

export default Layout;
