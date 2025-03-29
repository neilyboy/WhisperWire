import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaCog, FaInfoCircle, FaSave, FaRedo, FaLink, FaUnlink } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';

const ChannelMatrix = () => {
  const [channelMatrix, setChannelMatrix] = useState({});
  const [originalMatrix, setOriginalMatrix] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changesMade, setChangesMade] = useState(false);
  
  const { socket, channels, loadChannelMatrix, updateChannelMatrix } = useSocket();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (socket) {
      fetchChannelMatrix();
    }
  }, [socket, channels]);

  // Track changes to the matrix
  useEffect(() => {
    if (!isLoading && JSON.stringify(channelMatrix) !== JSON.stringify(originalMatrix)) {
      setChangesMade(true);
    } else {
      setChangesMade(false);
    }
  }, [channelMatrix, originalMatrix, isLoading]);

  const fetchChannelMatrix = async () => {
    setIsLoading(true);
    
    try {
      const matrix = await loadChannelMatrix();
      
      if (matrix) {
        setChannelMatrix(matrix);
        setOriginalMatrix(JSON.parse(JSON.stringify(matrix))); // Deep copy
      }
    } catch (error) {
      console.error('Failed to load channel matrix:', error);
      showNotification('Failed to load channel routing matrix', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveChannelMatrix = async () => {
    setIsSaving(true);
    
    try {
      await updateChannelMatrix(channelMatrix);
      setOriginalMatrix(JSON.parse(JSON.stringify(channelMatrix))); // Update original matrix
      showNotification('Channel routing matrix saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save channel matrix:', error);
      showNotification('Failed to save channel routing matrix', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    setChannelMatrix(JSON.parse(JSON.stringify(originalMatrix)));
    showNotification('Channel routing changes discarded', 'info');
  };

  const toggleChannelRoute = (sourceId, destinationId) => {
    if (sourceId === destinationId) return; // Can't route to self
    
    setChannelMatrix(prev => {
      const newMatrix = { ...prev };
      
      // Get current routes or initialize empty array
      const sourceRoutes = newMatrix[sourceId] || [];
      
      // Toggle destination in routes
      const destinationIndex = sourceRoutes.indexOf(destinationId);
      
      if (destinationIndex === -1) {
        // Add new route
        newMatrix[sourceId] = [...sourceRoutes, destinationId];
      } else {
        // Remove existing route
        newMatrix[sourceId] = sourceRoutes.filter(id => id !== destinationId);
        
        // Clean up empty arrays
        if (newMatrix[sourceId].length === 0) {
          delete newMatrix[sourceId];
        }
      }
      
      return newMatrix;
    });
  };

  const isChannelRouted = (sourceId, destinationId) => {
    if (!channelMatrix[sourceId]) return false;
    return channelMatrix[sourceId].includes(destinationId);
  };

  const getMatrixDimensions = () => {
    // Add 1 for channel names row/column
    return {
      rows: channels.length + 1,
      cols: channels.length + 1
    };
  };

  // Set all routing for a source channel (row)
  const setAllRowRouting = (sourceId, enabled) => {
    setChannelMatrix(prev => {
      const newMatrix = { ...prev };
      
      if (enabled) {
        // Enable all routes for this source
        newMatrix[sourceId] = channels
          .map(channel => channel.id)
          .filter(id => id !== sourceId); // Exclude self
      } else {
        // Disable all routes for this source
        delete newMatrix[sourceId];
      }
      
      return newMatrix;
    });
  };

  // Set all routing to a destination channel (column)
  const setAllColumnRouting = (destinationId, enabled) => {
    setChannelMatrix(prev => {
      const newMatrix = { ...prev };
      
      // Process each channel as a potential source
      channels.forEach(channel => {
        if (channel.id === destinationId) return; // Skip self
        
        const sourceId = channel.id;
        const sourceRoutes = newMatrix[sourceId] || [];
        
        if (enabled) {
          // Add this destination if not already present
          if (!sourceRoutes.includes(destinationId)) {
            newMatrix[sourceId] = [...sourceRoutes, destinationId];
          }
        } else {
          // Remove this destination
          if (sourceRoutes.includes(destinationId)) {
            newMatrix[sourceId] = sourceRoutes.filter(id => id !== destinationId);
            
            // Clean up empty arrays
            if (newMatrix[sourceId].length === 0) {
              delete newMatrix[sourceId];
            }
          }
        }
      });
      
      return newMatrix;
    });
  };

  const getChannelById = (channelId) => {
    return channels.find(channel => channel.id === channelId) || null;
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingText>Loading channel routing matrix...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <MatrixContainer>
      <MatrixHeader>
        <Title>
          <TitleIcon>
            <FaCog />
          </TitleIcon>
          Channel Routing Matrix
        </Title>
        
        <InfoText>
          <FaInfoCircle />
          Configure how audio is routed between channels
        </InfoText>
        
        <MatrixActions>
          {changesMade && (
            <ResetButton onClick={resetChanges} disabled={isSaving}>
              <FaRedo />
              Reset
            </ResetButton>
          )}
          
          <SaveButton 
            onClick={saveChannelMatrix} 
            disabled={isSaving || !changesMade}
          >
            <FaSave />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </SaveButton>
        </MatrixActions>
      </MatrixHeader>
      
      <MatrixContent>
        {channels.length === 0 ? (
          <NoChannelsMessage>
            No channels available. Create channels to configure routing.
          </NoChannelsMessage>
        ) : (
          <MatrixGrid dimensions={getMatrixDimensions()}>
            {/* Header cell - top left corner */}
            <MatrixHeaderCell>
              <HeaderLabel>Source / Destination</HeaderLabel>
            </MatrixHeaderCell>
            
            {/* Column headers */}
            {channels.map(channel => (
              <MatrixHeaderCell key={`col-${channel.id}`}>
                <HeaderLabelColumn>
                  <span>{channel.name}</span>
                  <ColumnActionButtons>
                    <LinkAllButton 
                      title="Link all sources to this destination"
                      onClick={() => setAllColumnRouting(channel.id, true)}
                    >
                      <FaLink />
                    </LinkAllButton>
                    <UnlinkAllButton 
                      title="Unlink all sources from this destination"
                      onClick={() => setAllColumnRouting(channel.id, false)}
                    >
                      <FaUnlink />
                    </UnlinkAllButton>
                  </ColumnActionButtons>
                </HeaderLabelColumn>
              </MatrixHeaderCell>
            ))}
            
            {/* Row headers and grid cells */}
            {channels.map(sourceChannel => (
              <React.Fragment key={`row-${sourceChannel.id}`}>
                {/* Row header */}
                <MatrixHeaderCell>
                  <HeaderLabelRow>
                    <span>{sourceChannel.name}</span>
                    <RowActionButtons>
                      <LinkAllButton 
                        title="Link this source to all destinations"
                        onClick={() => setAllRowRouting(sourceChannel.id, true)}
                      >
                        <FaLink />
                      </LinkAllButton>
                      <UnlinkAllButton 
                        title="Unlink this source from all destinations"
                        onClick={() => setAllRowRouting(sourceChannel.id, false)}
                      >
                        <FaUnlink />
                      </UnlinkAllButton>
                    </RowActionButtons>
                  </HeaderLabelRow>
                </MatrixHeaderCell>
                
                {/* Matrix cells */}
                {channels.map(destChannel => {
                  const isDisabled = sourceChannel.id === destChannel.id;
                  const isActive = isChannelRouted(sourceChannel.id, destChannel.id);
                  
                  return (
                    <MatrixCell 
                      key={`cell-${sourceChannel.id}-${destChannel.id}`}
                      disabled={isDisabled}
                      active={isActive}
                      onClick={() => !isDisabled && toggleChannelRoute(sourceChannel.id, destChannel.id)}
                    >
                      {isDisabled ? (
                        <SelfCellText>—</SelfCellText>
                      ) : (
                        isActive && <RoutingIndicator />
                      )}
                    </MatrixCell>
                  );
                })}
              </React.Fragment>
            ))}
          </MatrixGrid>
        )}
      </MatrixContent>
      
      <MatrixLegend>
        <LegendItem>
          <LegendActive />
          <LegendText>Audio Routed</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendInactive />
          <LegendText>No Routing</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendDisabled />
          <LegendText>Not Applicable</LegendText>
        </LegendItem>
      </MatrixLegend>
    </MatrixContainer>
  );
};

const MatrixContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MatrixHeader = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const TitleIcon = styled.span`
  margin-right: 0.5rem;
  color: var(--accent-primary);
`;

const Title = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  color: var(--text-primary);
  flex: 1;
`;

const InfoText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const MatrixActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
  
  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-weight: 500;
  
  &:hover:not(:disabled) {
    background-color: var(--accent-secondary);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    flex: 1;
  }
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    flex: 1;
  }
`;

const MatrixContent = styled.div`
  padding: 1rem;
  overflow: auto;
  flex: 1;
`;

const NoChannelsMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
  font-style: italic;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
`;

const LoadingText = styled.div`
  font-style: italic;
`;

const MatrixGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.dimensions.cols}, minmax(100px, auto));
  grid-template-rows: repeat(${props => props.dimensions.rows}, minmax(50px, auto));
  gap: 2px;
`;

const MatrixHeaderCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
  position: sticky;
  top: 0;
  z-index: 2;
  
  &:first-child {
    z-index: 3;
    left: 0;
  }
`;

const HeaderLabel = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
`;

const HeaderLabelColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.5rem;
  width: 100%;
`;

const HeaderLabelRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.5rem;
  width: 100%;
  
  /* Make row headers sticky */
  position: sticky;
  left: 0;
  z-index: 1;
`;

const ColumnActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const RowActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const LinkAllButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: rgba(0, 150, 0, 0.2);
  color: var(--success);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(0, 150, 0, 0.3);
  }
`;

const UnlinkAllButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: rgba(150, 0, 0, 0.2);
  color: var(--error);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(150, 0, 0, 0.3);
  }
`;

const MatrixCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => 
    props.disabled 
      ? 'var(--bg-tertiary)' 
      : props.active 
        ? 'rgba(0, 150, 0, 0.15)'
        : 'var(--bg-primary)'
  };
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  transition: background-color 0.2s;
  min-height: 40px;
  
  &:hover {
    background-color: ${props => 
      props.disabled 
        ? 'var(--bg-tertiary)' 
        : props.active 
          ? 'rgba(0, 150, 0, 0.25)'
          : 'var(--bg-hover)'
    };
  }
`;

const RoutingIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--success);
`;

const SelfCellText = styled.div`
  color: var(--text-secondary);
  font-weight: bold;
`;

const MatrixLegend = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  justify-content: center;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendActive = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: rgba(0, 150, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--success);
  }
`;

const LegendInactive = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: var(--bg-primary);
`;

const LegendDisabled = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::after {
    content: '—';
    font-size: 10px;
    color: var(--text-secondary);
    font-weight: bold;
  }
`;

const LegendText = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`;

export default ChannelMatrix;
