import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaSearch, FaDownload, FaTrash, FaFilter, FaClock } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const logsEndRef = useRef(null);
  const { getLogs, clearLogs } = useSocket();
  const { showNotification } = useNotification();

  // Load logs on component mount
  useEffect(() => {
    loadLogs();
    
    // Set up a log refresh interval
    const intervalId = setInterval(() => {
      loadLogs();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Filter logs when filter or logLevel changes
  useEffect(() => {
    filterLogs();
  }, [filter, logLevel, logs]);

  // Auto-scroll to bottom when filteredLogs change
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const loadLogs = async () => {
    setIsLoading(true);
    
    try {
      const systemLogs = await getLogs();
      if (systemLogs) {
        setLogs(systemLogs);
      }
    } catch (error) {
      showNotification('Failed to load system logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    // Filter by log level
    if (logLevel !== 'all') {
      filtered = filtered.filter(log => log.level === logLevel);
    }
    
    // Filter by search term
    if (filter) {
      const searchTerm = filter.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        log.source.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredLogs(filtered);
  };

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      try {
        await clearLogs();
        setLogs([]);
        showNotification('Logs cleared successfully', 'success');
      } catch (error) {
        showNotification(`Failed to clear logs: ${error.message}`, 'error');
      }
    }
  };

  const handleDownloadLogs = () => {
    const logsText = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whisperwire-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return 'var(--error)';
      case 'warn': return 'var(--warning)';
      case 'info': return 'var(--accent-primary)';
      case 'debug': return 'var(--success)';
      default: return 'var(--text-primary)';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <LogsContainer>
      <LogsHeader>
        <Title>System Logs</Title>
        <LogControls>
          <RefreshButton onClick={loadLogs} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh Logs'}
          </RefreshButton>
          <ActionButton onClick={handleDownloadLogs} title="Download Logs">
            <FaDownload />
          </ActionButton>
          <ActionButton onClick={handleClearLogs} title="Clear Logs">
            <FaTrash />
          </ActionButton>
        </LogControls>
      </LogsHeader>
      
      <FilterContainer>
        <SearchBox>
          <SearchIcon>
            <FaSearch />
          </SearchIcon>
          <SearchInput 
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search logs..."
          />
        </SearchBox>
        
        <FilterGroup>
          <FilterIcon>
            <FaFilter />
          </FilterIcon>
          <FilterSelect
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </FilterSelect>
        </FilterGroup>
        
        <AutoScrollToggle>
          <AutoScrollIcon>
            <FaClock />
          </AutoScrollIcon>
          <AutoScrollLabel>
            <AutoScrollCheckbox
              type="checkbox"
              checked={autoScroll}
              onChange={() => setAutoScroll(!autoScroll)}
            />
            Auto-scroll
          </AutoScrollLabel>
        </AutoScrollToggle>
      </FilterContainer>
      
      <LogsContent empty={filteredLogs.length === 0}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => (
            <LogEntry key={index} level={log.level}>
              <LogTime>{formatTimestamp(log.timestamp)}</LogTime>
              <LogLevel level={log.level}>
                {log.level.toUpperCase()}
              </LogLevel>
              <LogSource>{log.source}</LogSource>
              <LogMessage>{log.message}</LogMessage>
            </LogEntry>
          ))
        ) : (
          <EmptyLogsMessage>
            {filter || logLevel !== 'all' 
              ? 'No logs match the current filters'
              : 'No logs available'
            }
          </EmptyLogsMessage>
        )}
        <div ref={logsEndRef} />
      </LogsContent>
      
      <LogsFooter>
        <LogCount>
          Showing {filteredLogs.length} of {logs.length} logs
        </LogCount>
      </LogsFooter>
    </LogsContainer>
  );
};

const LogsContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  height: 100%;
  min-height: 400px;
`;

const LogsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const Title = styled.h3`
  margin: 0;
  color: var(--text-primary);
`;

const LogControls = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 0.9rem;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-secondary);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  
  &:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
`;

const SearchIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-secondary);
`;

const SearchInput = styled.input`
  flex: 1;
  background-color: transparent;
  border: none;
  color: var(--text-primary);
  padding: 0.5rem;
  
  &:focus {
    outline: none;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
`;

const FilterIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-secondary);
`;

const FilterSelect = styled.select`
  background-color: transparent;
  border: none;
  color: var(--text-primary);
  padding: 0.5rem;
  padding-left: 0;
  min-width: 120px;
  
  &:focus {
    outline: none;
  }
  
  option {
    background-color: var(--bg-tertiary);
  }
`;

const AutoScrollToggle = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
`;

const AutoScrollIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
`;

const AutoScrollLabel = styled.label`
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  cursor: pointer;
`;

const AutoScrollCheckbox = styled.input`
  margin-right: 0.5rem;
  cursor: pointer;
`;

const LogsContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ empty }) => empty ? '2rem 1rem' : '0'};
  background-color: var(--bg-primary);
`;

const LogEntry = styled.div`
  display: grid;
  grid-template-columns: auto auto 1fr;
  grid-template-areas: 
    "time level source"
    "message message message";
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--bg-secondary);
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: var(--bg-secondary);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: auto 1fr;
    grid-template-areas: 
      "time level"
      "source source"
      "message message";
  }
`;

const LogTime = styled.div`
  grid-area: time;
  color: var(--text-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
`;

const LogLevel = styled.div`
  grid-area: level;
  color: ${({ level }) => getLogLevelColor(level)};
  background-color: ${({ level }) => `${getLogLevelColor(level)}20`};
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
`;

const LogSource = styled.div`
  grid-area: source;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
`;

const LogMessage = styled.div`
  grid-area: message;
  color: var(--text-primary);
  font-family: monospace;
  word-break: break-word;
  white-space: pre-wrap;
`;

const EmptyLogsMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-secondary);
  font-style: italic;
`;

const LogsFooter = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const LogCount = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
`;

export default SystemLogs;
