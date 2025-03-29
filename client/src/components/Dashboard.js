import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  FaServer, 
  FaUsers, 
  FaComments, 
  FaMicrophone, 
  FaChartBar, 
  FaMemory, 
  FaNetworkWired, 
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';
import { serverAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: 0,
    activeConnections: 0,
    totalSessions: 0,
    activeChannels: 0,
    totalChannels: 0,
    networkStats: {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0
    },
    warnings: []
  });
  
  const [chartData, setChartData] = useState({
    cpu: Array(20).fill(0),
    memory: Array(20).fill(0),
    network: {
      in: Array(20).fill(0),
      out: Array(20).fill(0)
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { socket, channels, connectedClients } = useSocket();
  const { showNotification } = useNotification();

  // Initial load and setup refresh timer
  useEffect(() => {
    fetchMetrics();
    
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchMetrics();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Set up socket listener for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('server:metrics-update', handleMetricsUpdate);
      
      return () => {
        socket.off('server:metrics-update', handleMetricsUpdate);
      };
    }
  }, [socket]);

  const fetchMetrics = async () => {
    try {
      const response = await serverAPI.getMetrics();
      
      if (response.data) {
        setMetrics(response.data);
        updateChartData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch server metrics:', error);
      showNotification('Failed to load server metrics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetricsUpdate = (data) => {
    setMetrics(data);
    updateChartData(data);
  };

  const updateChartData = (newMetrics) => {
    setChartData(prev => {
      // Add new data points and remove oldest
      const newCpu = [...prev.cpu.slice(1), newMetrics.cpuUsage];
      const newMemory = [...prev.memory.slice(1), newMetrics.memoryUsage];
      const newNetworkIn = [...prev.network.in.slice(1), newMetrics.networkStats.bytesIn];
      const newNetworkOut = [...prev.network.out.slice(1), newMetrics.networkStats.bytesOut];
      
      return {
        cpu: newCpu,
        memory: newMemory,
        network: {
          in: newNetworkIn,
          out: newNetworkOut
        }
      };
    });
  };

  const handleRefreshIntervalChange = (e) => {
    setRefreshInterval(Number(e.target.value));
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const getFormattedUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>System Dashboard</Title>
        
        <RefreshControls>
          <RefreshIntervalSelect 
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            disabled={!autoRefresh}
          >
            <option value="1">1 second</option>
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
          </RefreshIntervalSelect>
          
          <RefreshToggle 
            active={autoRefresh}
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </RefreshToggle>
          
          <RefreshButton onClick={fetchMetrics}>
            Refresh Now
          </RefreshButton>
        </RefreshControls>
      </DashboardHeader>
      
      {isLoading ? (
        <LoadingMessage>Loading system metrics...</LoadingMessage>
      ) : (
        <DashboardContent>
          {/* System warnings */}
          {metrics.warnings.length > 0 && (
            <WarningsPanel>
              <WarningHeader>
                <FaExclamationTriangle />
                System Warnings
              </WarningHeader>
              <WarningList>
                {metrics.warnings.map((warning, index) => (
                  <WarningItem key={index}>
                    <FaExclamationTriangle />
                    {warning.message}
                  </WarningItem>
                ))}
              </WarningList>
            </WarningsPanel>
          )}
          
          {/* Quick stats */}
          <QuickStatsGrid>
            <StatCard>
              <StatIcon color="#4CAF50">
                <FaServer />
              </StatIcon>
              <StatContent>
                <StatValue>{getFormattedUptime(metrics.uptime)}</StatValue>
                <StatLabel>Server Uptime</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon color="#2196F3">
                <FaUsers />
              </StatIcon>
              <StatContent>
                <StatValue>{metrics.activeConnections}</StatValue>
                <StatLabel>Active Connections</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon color="#9C27B0">
                <FaComments />
              </StatIcon>
              <StatContent>
                <StatValue>{metrics.activeChannels} / {metrics.totalChannels}</StatValue>
                <StatLabel>Active Channels</StatLabel>
              </StatContent>
            </StatCard>
            
            <StatCard>
              <StatIcon color="#FF9800">
                <FaMicrophone />
              </StatIcon>
              <StatContent>
                <StatValue>{connectedClients.filter(c => c.isSpeaking).length}</StatValue>
                <StatLabel>Currently Speaking</StatLabel>
              </StatContent>
            </StatCard>
          </QuickStatsGrid>
          
          {/* System metrics */}
          <MetricsGrid>
            <MetricPanel>
              <MetricHeader>
                <MetricTitle>
                  <FaChartBar />
                  CPU Usage
                </MetricTitle>
                <MetricValue>{Math.round(metrics.cpuUsage * 100)}%</MetricValue>
              </MetricHeader>
              <MetricChart>
                <ChartContainer>
                  {chartData.cpu.map((value, index) => (
                    <ChartBar 
                      key={index}
                      height={value * 100}
                      color={value > 0.8 ? 'var(--error)' : value > 0.6 ? 'var(--warning)' : 'var(--accent-primary)'}
                    />
                  ))}
                </ChartContainer>
              </MetricChart>
            </MetricPanel>
            
            <MetricPanel>
              <MetricHeader>
                <MetricTitle>
                  <FaMemory />
                  Memory Usage
                </MetricTitle>
                <MetricValue>{Math.round(metrics.memoryUsage * 100)}%</MetricValue>
              </MetricHeader>
              <MetricChart>
                <ChartContainer>
                  {chartData.memory.map((value, index) => (
                    <ChartBar 
                      key={index}
                      height={value * 100}
                      color={value > 0.8 ? 'var(--error)' : value > 0.6 ? 'var(--warning)' : 'var(--accent-primary)'}
                    />
                  ))}
                </ChartContainer>
              </MetricChart>
            </MetricPanel>
            
            <MetricPanel>
              <MetricHeader>
                <MetricTitle>
                  <FaNetworkWired />
                  Network Traffic
                </MetricTitle>
                <MetricValue>
                  IN: {formatBytes(metrics.networkStats.bytesIn)} | 
                  OUT: {formatBytes(metrics.networkStats.bytesOut)}
                </MetricValue>
              </MetricHeader>
              <MetricChart>
                <ChartContainerDual>
                  <ChartLegend>
                    <LegendItem>
                      <LegendColor color="rgba(33, 150, 243, 0.6)" />
                      Incoming
                    </LegendItem>
                    <LegendItem>
                      <LegendColor color="rgba(156, 39, 176, 0.6)" />
                      Outgoing
                    </LegendItem>
                  </ChartLegend>
                  
                  <DualChartContainer>
                    {chartData.network.in.map((valueIn, index) => {
                      const valueOut = chartData.network.out[index];
                      const maxValue = Math.max(...chartData.network.in, ...chartData.network.out);
                      const normalizedIn = maxValue > 0 ? valueIn / maxValue : 0;
                      const normalizedOut = maxValue > 0 ? valueOut / maxValue : 0;
                      
                      return (
                        <DualChartBarGroup key={index}>
                          <ChartBar 
                            height={normalizedIn * 100}
                            color="rgba(33, 150, 243, 0.6)"
                          />
                          <ChartBar 
                            height={normalizedOut * 100}
                            color="rgba(156, 39, 176, 0.6)"
                          />
                        </DualChartBarGroup>
                      );
                    })}
                  </DualChartContainer>
                </ChartContainerDual>
              </MetricChart>
            </MetricPanel>
            
            <MetricPanel>
              <MetricHeader>
                <MetricTitle>
                  <FaClock />
                  System Information
                </MetricTitle>
              </MetricHeader>
              <SystemInfoContainer>
                <SystemInfoTable>
                  <tbody>
                    <SystemInfoRow>
                      <SystemInfoLabel>Packets In:</SystemInfoLabel>
                      <SystemInfoValue>{metrics.networkStats.packetsIn}</SystemInfoValue>
                    </SystemInfoRow>
                    <SystemInfoRow>
                      <SystemInfoLabel>Packets Out:</SystemInfoLabel>
                      <SystemInfoValue>{metrics.networkStats.packetsOut}</SystemInfoValue>
                    </SystemInfoRow>
                    <SystemInfoRow>
                      <SystemInfoLabel>Total Sessions:</SystemInfoLabel>
                      <SystemInfoValue>{metrics.totalSessions}</SystemInfoValue>
                    </SystemInfoRow>
                    <SystemInfoRow>
                      <SystemInfoLabel>Active Users:</SystemInfoLabel>
                      <SystemInfoValue>{connectedClients.length}</SystemInfoValue>
                    </SystemInfoRow>
                    <SystemInfoRow>
                      <SystemInfoLabel>Active Channels:</SystemInfoLabel>
                      <SystemInfoValue>{metrics.activeChannels}</SystemInfoValue>
                    </SystemInfoRow>
                  </tbody>
                </SystemInfoTable>
              </SystemInfoContainer>
            </MetricPanel>
          </MetricsGrid>
          
          {/* Active users */}
          <ActiveUsersPanel>
            <PanelHeader>
              <FaUsers />
              Active Connections
            </PanelHeader>
            
            {connectedClients.length > 0 ? (
              <ActiveUsersList>
                <ActiveUsersHeader>
                  <ActiveUserColumn width="30%">User</ActiveUserColumn>
                  <ActiveUserColumn width="25%">Channel</ActiveUserColumn>
                  <ActiveUserColumn width="15%">Role</ActiveUserColumn>
                  <ActiveUserColumn width="15%">Status</ActiveUserColumn>
                  <ActiveUserColumn width="15%">Connected</ActiveUserColumn>
                </ActiveUsersHeader>
                
                {connectedClients.map(client => {
                  const clientChannel = channels.find(c => c.id === client.channelId);
                  
                  return (
                    <ActiveUserItem key={client.id}>
                      <ActiveUserColumn width="30%">
                        <UserName>{client.name}</UserName>
                      </ActiveUserColumn>
                      
                      <ActiveUserColumn width="25%">
                        {clientChannel ? clientChannel.name : 'Not connected'}
                      </ActiveUserColumn>
                      
                      <ActiveUserColumn width="15%">
                        <UserRole>{client.role}</UserRole>
                      </ActiveUserColumn>
                      
                      <ActiveUserColumn width="15%">
                        <UserStatus speaking={client.isSpeaking}>
                          {client.isSpeaking ? 'Speaking' : 'Listening'}
                        </UserStatus>
                      </ActiveUserColumn>
                      
                      <ActiveUserColumn width="15%">
                        {client.connectedSince ? formatTimeDifference(client.connectedSince) : 'Unknown'}
                      </ActiveUserColumn>
                    </ActiveUserItem>
                  );
                })}
              </ActiveUsersList>
            ) : (
              <NoUsersMessage>No active connections</NoUsersMessage>
            )}
          </ActiveUsersPanel>
        </DashboardContent>
      )}
    </DashboardContainer>
  );
};

// Helper function to format time difference
const formatTimeDifference = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffInSeconds = Math.floor((now - then) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d`;
  }
};

const DashboardContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  min-height: 600px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const Title = styled.h2`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
`;

const RefreshControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
  }
`;

const RefreshIntervalSelect = styled.select`
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  padding: 0.5rem;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RefreshToggle = styled.button`
  background-color: ${props => props.active ? 'var(--accent-primary)' : 'var(--bg-primary)'};
  color: ${props => props.active ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--accent-secondary)' : 'var(--bg-hover)'};
  }
`;

const RefreshButton = styled.button`
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
`;

const DashboardContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
  font-style: italic;
`;

const WarningsPanel = styled.div`
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  border-left: 4px solid var(--warning);
  padding: 1rem;
  margin-bottom: 1rem;
`;

const WarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--warning);
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const WarningList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const WarningItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 0.5rem;
  background-color: rgba(255, 193, 7, 0.1);
  border-radius: var(--border-radius-sm);
  
  svg {
    color: var(--warning);
  }
`;

const QuickStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${props => `${props.color}20`};
  color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-primary);
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const MetricPanel = styled.div`
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
`;

const MetricTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
`;

const MetricValue = styled.div`
  color: var(--accent-primary);
  font-weight: 700;
  font-family: monospace;
`;

const MetricChart = styled.div`
  padding: 1rem;
  height: 150px;
`;

const ChartContainer = styled.div`
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 2px;
`;

const ChartBar = styled.div`
  height: ${props => `${props.height}%`};
  background-color: ${props => props.color || 'var(--accent-primary)'};
  flex: 1;
  min-height: 1px;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
`;

const ChartContainerDual = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0.5rem;
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
`;

const LegendColor = styled.div`
  width: 12px;
  height: 12px;
  background-color: ${props => props.color};
  border-radius: 2px;
`;

const DualChartContainer = styled.div`
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 2px;
`;

const DualChartBarGroup = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
  align-items: flex-end;
  gap: 1px;
`;

const SystemInfoContainer = styled.div`
  padding: 1rem;
`;

const SystemInfoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const SystemInfoRow = styled.tr`
  &:not(:last-child) td {
    border-bottom: 1px solid var(--bg-tertiary);
  }
`;

const SystemInfoLabel = styled.td`
  padding: 0.75rem 0;
  color: var(--text-secondary);
`;

const SystemInfoValue = styled.td`
  padding: 0.75rem 0;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
`;

const ActiveUsersPanel = styled.div`
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 500;
`;

const ActiveUsersList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ActiveUsersHeader = styled.div`
  display: flex;
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.9rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const ActiveUserItem = styled.div`
  display: flex;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--bg-tertiary);
  
  &:hover {
    background-color: var(--bg-hover);
  }
`;

const ActiveUserColumn = styled.div`
  width: ${props => props.width || 'auto'};
  display: flex;
  align-items: center;
`;

const UserName = styled.div`
  color: var(--text-primary);
  font-weight: 500;
`;

const UserRole = styled.div`
  text-transform: capitalize;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const UserStatus = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  background-color: ${props => props.speaking ? 'rgba(76, 175, 80, 0.15)' : 'rgba(33, 150, 243, 0.15)'};
  color: ${props => props.speaking ? 'var(--success)' : 'var(--accent-primary)'};
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.speaking ? 'var(--success)' : 'var(--accent-primary)'};
    margin-right: 0.5rem;
  }
`;

const NoUsersMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: var(--text-secondary);
  font-style: italic;
`;

export default Dashboard;
