import React, { useState } from 'react';
import styled from 'styled-components';
import { FaQuestionCircle, FaMicrophone, FaHeadphones, FaVolumeMute, FaVolumeUp, FaUsers, FaCog } from 'react-icons/fa';

const HelpDocumentation = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <FaQuestionCircle />,
      content: (
        <>
          <p>
            Welcome to WhisperWire, a low-latency, real-time audio communication system designed for live production environments.
          </p>
          <p>
            This help guide will walk you through the key features and how to use the WhisperWire system effectively.
          </p>
          <p>
            To begin, make sure you've been provided login credentials by your system administrator. If you haven't received credentials, please contact your administrator.
          </p>
        </>
      )
    },
    {
      id: 'audio-controls',
      title: 'Audio Controls',
      icon: <FaMicrophone />,
      content: (
        <>
          <h4>Communication Modes</h4>
          <p>
            WhisperWire offers two primary modes of communication:
          </p>
          <ul>
            <li>
              <strong>Push-to-Talk (PTT)</strong>: Hold the designated button to speak. Release to stop transmitting. This is ideal for environments with background noise or when multiple users need to speak without interrupting each other.
            </li>
            <li>
              <strong>Duplex Mode</strong>: Always-on communication that works like a phone call. Enable this mode when you need hands-free operation or continuous communication.
            </li>
          </ul>
          
          <h4>Microphone Controls</h4>
          <p>
            To ensure optimal audio quality:
          </p>
          <ul>
            <li>Use the microphone test feature to check your input levels</li>
            <li>Adjust microphone sensitivity in the settings menu</li>
            <li>Position your microphone consistently for uniform volume</li>
          </ul>
          
          <h4>Speaking Indicators</h4>
          <p>
            The system provides visual feedback when you or others are speaking:
          </p>
          <ul>
            <li>Green highlight indicates you are transmitting audio</li>
            <li>Blue icons indicate other users who are currently speaking</li>
            <li>User names will appear in the speaking list while active</li>
          </ul>
        </>
      )
    },
    {
      id: 'channels',
      title: 'Channel Management',
      icon: <FaHeadphones />,
      content: (
        <>
          <h4>Joining Channels</h4>
          <p>
            WhisperWire organizes communication into separate channels:
          </p>
          <ul>
            <li>Click on a channel name to join</li>
            <li>You may be authorized to join multiple channels</li>
            <li>Some channels may require specific permissions to access</li>
          </ul>
          
          <h4>Channel Controls</h4>
          <p>
            Each channel has individual controls:
          </p>
          <ul>
            <li>
              <IconWrapper><FaVolumeUp /></IconWrapper> 
              Volume slider to adjust incoming audio level from the channel
            </li>
            <li>
              <IconWrapper><FaVolumeMute /></IconWrapper> 
              Mute button to temporarily silence incoming audio
            </li>
            <li>Colored indicators show channel status (active, muted, etc.)</li>
          </ul>
          
          <h4>Channel Types</h4>
          <p>
            Channels may have different permission models:
          </p>
          <ul>
            <li><strong>Talk/Listen</strong>: Full duplex communication</li>
            <li><strong>Listen Only</strong>: You can hear but not speak</li>
            <li><strong>Talk Only</strong>: You can speak but not hear others</li>
          </ul>
        </>
      )
    },
    {
      id: 'users',
      title: 'User Management',
      icon: <FaUsers />,
      content: (
        <>
          <h4>User Status</h4>
          <p>
            WhisperWire shows you who is currently online:
          </p>
          <ul>
            <li>Online users appear in the users list</li>
            <li>Speaking users have a visual indicator</li>
            <li>Administrators are marked with a special icon</li>
          </ul>
          
          <h4>User Permissions</h4>
          <p>
            Different users may have different capabilities:
          </p>
          <ul>
            <li><strong>Regular Users</strong>: Can join authorized channels and communicate</li>
            <li><strong>Administrators</strong>: Can manage channels, users, and system settings</li>
          </ul>
          
          <h4>Direct Communication</h4>
          <p>
            In some configurations, you may be able to:
          </p>
          <ul>
            <li>Send direct messages to specific users</li>
            <li>Initiate private audio channels with select users</li>
            <li>Request assistance from administrators</li>
          </ul>
        </>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      icon: <FaCog />,
      content: (
        <>
          <h4>Audio Settings</h4>
          <p>
            Configure your audio devices:
          </p>
          <ul>
            <li>Select microphone input device</li>
            <li>Select headphone/speaker output device</li>
            <li>Adjust noise cancellation and audio processing</li>
            <li>Configure Push-to-Talk key bindings</li>
          </ul>
          
          <h4>Interface Settings</h4>
          <p>
            Customize your experience:
          </p>
          <ul>
            <li>Toggle between dark and light themes</li>
            <li>Adjust text size and interface scaling</li>
            <li>Set notification preferences</li>
            <li>Configure keyboard shortcuts</li>
          </ul>
          
          <h4>Connection Settings</h4>
          <p>
            Optimize for your network:
          </p>
          <ul>
            <li>Select bandwidth mode (low, medium, high)</li>
            <li>Configure connection timeout settings</li>
            <li>Set auto-reconnect preferences</li>
          </ul>
        </>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <FaQuestionCircle />,
      content: (
        <>
          <h4>Common Issues</h4>
          
          <h5>Audio Problems</h5>
          <ul>
            <li>
              <strong>No audio input/output</strong>: Check device selection in settings and browser permissions
            </li>
            <li>
              <strong>Echo or feedback</strong>: Use headphones instead of speakers or adjust noise cancellation settings
            </li>
            <li>
              <strong>Distorted audio</strong>: Check microphone placement and input level
            </li>
          </ul>
          
          <h5>Connection Issues</h5>
          <ul>
            <li>
              <strong>Cannot connect</strong>: Check your internet connection and server status
            </li>
            <li>
              <strong>Frequent disconnects</strong>: Try a more stable network connection
            </li>
            <li>
              <strong>High latency</strong>: Switch to a lower bandwidth mode in settings
            </li>
          </ul>
          
          <h4>Support Contact</h4>
          <p>
            If you continue to experience issues:
          </p>
          <ul>
            <li>Contact your system administrator</li>
            <li>Check the system status page</li>
            <li>Refer to detailed documentation at <a href="#">docs.whisperwire.com</a></li>
          </ul>
        </>
      )
    }
  ];

  return (
    <HelpContainer>
      <HelpHeader>
        <HelpTitle>
          <FaQuestionCircle />
          Help & Documentation
        </HelpTitle>
      </HelpHeader>
      
      <HelpContent>
        <SideNavigation>
          {sections.map(section => (
            <NavItem 
              key={section.id}
              active={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{section.title}</span>
            </NavItem>
          ))}
        </SideNavigation>
        
        <ContentArea>
          {sections.map(section => (
            <Section 
              key={section.id}
              active={activeSection === section.id}
            >
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>
                {section.content}
              </SectionContent>
            </Section>
          ))}
        </ContentArea>
      </HelpContent>
    </HelpContainer>
  );
};

const HelpContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const HelpHeader = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
`;

const HelpTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
  
  svg {
    color: var(--accent-primary);
  }
`;

const HelpContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const SideNavigation = styled.div`
  width: 250px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--bg-tertiary);
  padding: 1rem 0;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    width: 100px;
  }
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${props => props.active ? 'var(--bg-secondary)' : 'transparent'};
  color: ${props => props.active ? 'var(--accent-primary)' : 'var(--text-secondary)'};
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
  
  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
  
  svg {
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 0.5rem;
    
    span {
      font-size: 0.8rem;
    }
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
`;

const Section = styled.div`
  display: ${props => props.active ? 'block' : 'none'};
`;

const SectionTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--bg-tertiary);
  padding-bottom: 0.5rem;
`;

const SectionContent = styled.div`
  color: var(--text-primary);
  line-height: 1.6;
  
  h4 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: var(--accent-primary);
  }
  
  h5 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  p {
    margin-bottom: 1rem;
  }
  
  ul {
    margin-bottom: 1.5rem;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.5rem;
    }
  }
  
  a {
    color: var(--accent-primary);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.25rem;
  vertical-align: middle;
`;

export default HelpDocumentation;
