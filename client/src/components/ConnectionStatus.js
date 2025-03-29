import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FaSignal, 
  FaWifi, 
  FaMicrophone, 
  FaHeadphones, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaHistory
} from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useAudio } from '../contexts/AudioContext';

const ConnectionStatus = () => {
  const [status, setStatus] = useState({
    connection: 'disconnected', // disconnected, connecting, connected, unstable
    latency: null,
    audioQuality: 'unknown', // unknown, poor, fair, good, excellent
    networkQuality: 'unknown', // unknown, poor, fair, good, excellent
    jitter: null,
    packetLoss: null,
    warnings: []
  });
  
  const [expanded, setExpanded] = useState(false);
  const [pingHistory, setPingHistory] = useState([]);
  const [pingInterval, setPingIntervalId] = useState(null);
  
  const { socket, connected } = useSocket();
  const { audioReady, micActive } = useAudio();

  // Initialize connection monitoring
  useEffect(() => {
    if (socket && connected) {
      setStatus(prev => ({
        ...prev,
        connection: 'connected'
      }));
      
      // Start ping monitoring
      startPingMonitoring();
      
      // Set up network quality monitoring
      socket.on('networkStats', handleNetworkStats);
    } else {
      setStatus(prev => ({
        ...prev,
        connection: socket ? 'connecting' : 'disconnected',
        latency: null
      }));
      
      // Stop ping monitoring
      if (pingInterval) {
        clearInterval(pingInterval);
        setPingIntervalId(null);
      }
    }
    
    return () => {
      if (socket) {
        socket.off('networkStats', handleNetworkStats);
      }
      
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [socket, connected]);

  // Handle network statistics
  const handleNetworkStats = (stats) => {
    // Calculate audio quality based on jitter and packet loss
    let audioQuality = 'excellent';
    let warnings = [];
    
    if (stats.jitter > 50 || stats.packetLoss > 5) {
      audioQuality = 'poor';
      warnings.push('High audio jitter or packet loss detected');
    } else if (stats.jitter > 30 || stats.packetLoss > 2) {
      audioQuality = 'fair';
      warnings.push('Moderate audio jitter or packet loss detected');
    } else if (stats.jitter > 15 || stats.packetLoss > 0.5) {
      audioQuality = 'good';
    }
    
    // Calculate network quality based on latency and stability
    let networkQuality = 'excellent';
    
    if (status.latency > 300 || stats.stability < 70) {
      networkQuality = 'poor';
      warnings.push('High latency or connection instability detected');
    } else if (status.latency > 150 || stats.stability < 85) {
      networkQuality = 'fair';
      warnings.push('Moderate latency or connection instability detected');
    } else if (status.latency > 75 || stats.stability < 95) {
      networkQuality = 'good';
    }
    
    setStatus(prev => ({
      ...prev,
      audioQuality,
      networkQuality,
      jitter: stats.jitter,
      packetLoss: stats.packetLoss,
      warnings
    }));
  };

  // Start ping monitoring to measure latency
  const startPingMonitoring = () => {
    if (!socket || !connected) return;
    
    const pingServer = () => {
      const start = Date.now();
      
      socket.emit('ping', {}, () => {
        const latency = Date.now() - start;
        
        setStatus(prev => ({
          ...prev,
          latency,
          connection: latency > 300 ? 'unstable' : 'connected'
        }));
        
        // Update ping history
        setPingHistory(prev => {
          const newHistory = [...prev, latency];
          if (newHistory.length > 20) {
            return newHistory.slice(1);
          }
          return newHistory;
        });
      });
    };
    
    // Ping immediately
    pingServer();
    
    // Set up regular pinging
    const intervalId = setInterval(pingServer, 5000);
    setPingIntervalId(intervalId);
    
    return () => clearInterval(intervalId);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'disconnected': return 'var(--error)';
      case 'connecting': return 'var(--warning)';
      case 'unstable': return 'var(--warning)';
      case 'connected': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'poor': return 'var(--error)';
      case 'fair': return 'var(--warning)';
      case 'good': return 'var(--success)';
      case 'excellent': return 'var(--accent-primary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = () => {
    switch (status.connection) {
      case 'disconnected': return <FaSignal />;
      case 'connecting': return <FaWifi />;
      case 'unstable': return <FaExclamationTriangle />;
      case 'connected': return <FaCheckCircle />;
      default: return <FaSignal />;
    }
  };

  const getConnectionStatusText = () => {
    switch (status.connection) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      case 'unstable': return 'Unstable Connection';
      case 'connected': return 'Connected';
      default: return 'Unknown';
    }
  };

  const renderSignalBars = (quality) => {
    const bars = {
      unknown: 0,
      poor: 1,
      fair: 2,
      good: 3,
      excellent: 4
    };
    
    const numberOfBars = bars[quality] || 0;
    
    return (
      <SignalBars>
        {[...Array(4)].map((_, index) => (
          <SignalBar key={index} active={index < numberOfBars} level={index} />
        ))}
      </SignalBars>
    );
  };

  return (
    <StatusContainer expanded={expanded}>
      <StatusHeader onClick={toggleExpanded}>
        <StatusIndicator color={getStatusColor(status.connection)}>
          {getStatusIcon()}
        </StatusIndicator>
        
        <StatusSummary>
          <ConnectionText color={getStatusColor(status.connection)}>
            {getConnectionStatusText()}
          </ConnectionText>
          
          {status.latency && (
            <LatencyText>
              {status.latency}ms
            </LatencyText>
          )}
        </StatusSummary>
        
        <AudioIndicator active={audioReady && micActive}>
          <FaMicrophone />
        </AudioIndicator>
        
        <ExpandToggle expanded={expanded}>
          ⋯
        </ExpandToggle>
      </StatusHeader>
      
      {expanded && (
        <StatusDetails>
          <DetailRow>
            <DetailLabel>
              <FaWifi />
              Network Quality
            </DetailLabel>
            <DetailValue color={getQualityColor(status.networkQuality)}>
              {renderSignalBars(status.networkQuality)}
              <QualityText>{status.networkQuality}</QualityText>
            </DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>
              <FaHeadphones />
              Audio Quality
            </DetailLabel>
            <DetailValue color={getQualityColor(status.audioQuality)}>
              {renderSignalBars(status.audioQuality)}
              <QualityText>{status.audioQuality}</QualityText>
            </DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>
              <FaHistory />
              Latency History
            </DetailLabel>
            <LatencyGraph>
              {pingHistory.map((ping, index) => (
                <LatencyBar 
                  key={index}
                  height={Math.min((ping / 300) * 100, 100)}
                  color={
                    ping > 300 ? 'var(--error)' : 
                    ping > 150 ? 'var(--warning)' : 
                    'var(--success)'
                  }
                />
              ))}
            </LatencyGraph>
          </DetailRow>
          
          {status.warnings.length > 0 && (
            <WarningsPanel>
              {status.warnings.map((warning, index) => (
                <WarningItem key={index}>
                  <FaExclamationTriangle /> {warning}
                </WarningItem>
              ))}
            </WarningsPanel>
          )}
          
          <StatisticsRow>
            <StatItem>
              <StatLabel>Latency</StatLabel>
              <StatValue>{status.latency !== null ? `${status.latency}ms` : 'N/A'}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Jitter</StatLabel>
              <StatValue>{status.jitter !== null ? `${status.jitter.toFixed(1)}ms` : 'N/A'}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Packet Loss</StatLabel>
              <StatValue>{status.packetLoss !== null ? `${status.packetLoss.toFixed(1)}%` : 'N/A'}</StatValue>
            </StatItem>
          </StatisticsRow>
        </StatusDetails>
      )}
    </StatusContainer>
  );
};

const StatusContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: var(--bg-hover);
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => props.color};
  margin-right: 0.75rem;
`;

const StatusSummary = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const ConnectionText = styled.div`
  color: ${props => props.color};
  font-weight: 500;
  font-size: 0.9rem;
`;

const LatencyText = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

const AudioIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 0.5rem;
  color: ${props => props.active ? 'var(--success)' : 'var(--text-secondary)'};
  opacity: ${props => props.active ? 1 : 0.5};
`;

const ExpandToggle = styled.div`
  color: var(--text-secondary);
  transform: ${props => props.expanded ? 'rotate(90deg)' : 'rotate(0)'};
  transition: transform 0.3s ease;
  font-weight: bold;
  font-size: 1.2rem;
`;

const StatusDetails = styled.div`
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--bg-tertiary);
  background-color: var(--bg-primary);
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--bg-tertiary);
  
  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 150px;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const DetailValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  color: ${props => props.color || 'var(--text-primary)'};
  text-transform: capitalize;
  font-weight: 500;
`;

const SignalBars = styled.div`
  display: flex;
  align-items: flex-end;
  height: 16px;
  gap: 2px;
`;

const SignalBar = styled.div`
  width: 4px;
  height: ${({ level }) => `${25 + level * 25}%`};
  background-color: ${({ active, level }) => 
    active ? 
      (level === 0 ? 'var(--error)' : 
       level === 1 ? 'var(--warning)' : 
       level === 2 ? 'var(--success)' : 
       'var(--accent-primary)') :
      'var(--bg-tertiary)'
  };
  border-radius: 1px;
`;

const QualityText = styled.span`
  text-transform: capitalize;
  margin-left: 0.5rem;
`;

const LatencyGraph = styled.div`
  display: flex;
  align-items: flex-end;
  height: 20px;
  gap: 2px;
  flex: 1;
`;

const LatencyBar = styled.div`
  flex: 1;
  height: ${props => `${props.height}%`};
  min-height: 2px;
  background-color: ${props => props.color || 'var(--accent-primary)'};
  border-radius: 1px;
`;

const WarningsPanel = styled.div`
  margin: 0.75rem 0;
  padding: 0.75rem;
  background-color: rgba(255, 193, 7, 0.1);
  border-radius: var(--border-radius-sm);
  border-left: 3px solid var(--warning);
`;

const WarningItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  
  svg {
    color: var(--warning);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatisticsRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bg-tertiary);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  text-align: center;
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  color: var(--text-primary);
  font-family: monospace;
  font-weight: 500;
`;

export default ConnectionStatus;
