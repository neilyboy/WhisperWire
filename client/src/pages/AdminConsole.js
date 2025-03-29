import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { FaPlus, FaTrash, FaPen, FaSave, FaTimes, FaUsersCog } from 'react-icons/fa';

const AdminConsole = () => {
  const [activeTab, setActiveTab] = useState('channels');
  const [channels, setChannels] = useState([]);
  const [clients, setClients] = useState([]);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientPermissions, setClientPermissions] = useState({});
  
  const { channels: socketChannels, clients: socketClients, 
          createChannel, updateChannel, deleteChannel,
          updateClientPermissions } = useSocket();
  const { showNotification } = useNotification();

  // Update local state when socket data changes
  useEffect(() => {
    if (socketChannels) {
      setChannels(socketChannels);
    }
  }, [socketChannels]);

  useEffect(() => {
    if (socketClients) {
      setClients(socketClients);
    }
  }, [socketClients]);

  // Handle channel creation
  const handleCreateChannel = () => {
    if (!newChannel.name.trim()) {
      showNotification('Channel name is required', 'error');
      return;
    }

    createChannel(newChannel)
      .then(() => {
        setNewChannel({ name: '', description: '' });
        showNotification('Channel created successfully', 'success');
      })
      .catch(error => {
        showNotification(`Failed to create channel: ${error.message}`, 'error');
      });
  };

  // Handle channel update
  const handleUpdateChannel = (channel) => {
    if (!channel.name.trim()) {
      showNotification('Channel name is required', 'error');
      return;
    }

    updateChannel(channel.id, channel)
      .then(() => {
        setEditingChannel(null);
        showNotification('Channel updated successfully', 'success');
      })
      .catch(error => {
        showNotification(`Failed to update channel: ${error.message}`, 'error');
      });
  };

  // Handle channel deletion
  const handleDeleteChannel = (channelId) => {
    if (window.confirm('Are you sure you want to delete this channel?')) {
      deleteChannel(channelId)
        .then(() => {
          showNotification('Channel deleted successfully', 'success');
        })
        .catch(error => {
          showNotification(`Failed to delete channel: ${error.message}`, 'error');
        });
    }
  };

  // Open permissions modal for a client
  const openPermissionsModal = (client) => {
    setSelectedClient(client);
    
    // Initialize permissions matrix
    const permissions = {};
    channels.forEach(channel => {
      permissions[channel.id] = {
        canListen: client.permissions?.[channel.id]?.canListen || false,
        canTalk: client.permissions?.[channel.id]?.canTalk || false
      };
    });
    
    setClientPermissions(permissions);
    setShowPermissionsModal(true);
  };

  // Save client permissions
  const saveClientPermissions = () => {
    if (!selectedClient) return;
    
    updateClientPermissions(selectedClient.id, clientPermissions)
      .then(() => {
        setShowPermissionsModal(false);
        showNotification('Client permissions updated successfully', 'success');
      })
      .catch(error => {
        showNotification(`Failed to update permissions: ${error.message}`, 'error');
      });
  };

  // Toggle a permission value
  const togglePermission = (channelId, permission) => {
    setClientPermissions(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [permission]: !prev[channelId][permission]
      }
    }));
  };

  // Start editing a channel
  const startEditChannel = (channel) => {
    setEditingChannel({...channel});
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingChannel(null);
  };

  return (
    <AdminContainer>
      <AdminHeader>
        <Title>Admin Console</Title>
        <TabsContainer>
          <TabButton 
            active={activeTab === 'channels'} 
            onClick={() => setActiveTab('channels')}
          >
            Channels
          </TabButton>
          <TabButton 
            active={activeTab === 'clients'} 
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </TabButton>
        </TabsContainer>
      </AdminHeader>
      
      <Content>
        {activeTab === 'channels' ? (
          <ChannelsTab>
            <SectionHeader>
              <h2>Manage Channels</h2>
            </SectionHeader>
            
            <NewChannelForm>
              <FormGroup>
                <label>Channel Name</label>
                <input 
                  type="text"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({...newChannel, name: e.target.value})}
                  placeholder="Enter channel name"
                />
              </FormGroup>
              
              <FormGroup>
                <label>Description</label>
                <input 
                  type="text"
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({...newChannel, description: e.target.value})}
                  placeholder="Enter channel description"
                />
              </FormGroup>
              
              <CreateButton onClick={handleCreateChannel}>
                <FaPlus /> Create Channel
              </CreateButton>
            </NewChannelForm>
            
            <ChannelList>
              {channels.map(channel => (
                <ChannelItem key={channel.id}>
                  {editingChannel && editingChannel.id === channel.id ? (
                    <EditChannelForm>
                      <FormGroup>
                        <label>Channel Name</label>
                        <input 
                          type="text"
                          value={editingChannel.name}
                          onChange={(e) => setEditingChannel({...editingChannel, name: e.target.value})}
                        />
                      </FormGroup>
                      
                      <FormGroup>
                        <label>Description</label>
                        <input 
                          type="text"
                          value={editingChannel.description}
                          onChange={(e) => setEditingChannel({...editingChannel, description: e.target.value})}
                        />
                      </FormGroup>
                      
                      <ButtonGroup>
                        <SaveButton onClick={() => handleUpdateChannel(editingChannel)}>
                          <FaSave /> Save
                        </SaveButton>
                        <CancelButton onClick={cancelEdit}>
                          <FaTimes /> Cancel
                        </CancelButton>
                      </ButtonGroup>
                    </EditChannelForm>
                  ) : (
                    <>
                      <ChannelDetails>
                        <ChannelName>{channel.name}</ChannelName>
                        <ChannelDescription>{channel.description}</ChannelDescription>
                      </ChannelDetails>
                      
                      <ChannelActions>
                        <ActionButton title="Edit" onClick={() => startEditChannel(channel)}>
                          <FaPen />
                        </ActionButton>
                        <ActionButton title="Delete" onClick={() => handleDeleteChannel(channel.id)}>
                          <FaTrash />
                        </ActionButton>
                      </ChannelActions>
                    </>
                  )}
                </ChannelItem>
              ))}
              
              {channels.length === 0 && (
                <EmptyState>No channels created yet</EmptyState>
              )}
            </ChannelList>
          </ChannelsTab>
        ) : (
          <ClientsTab>
            <SectionHeader>
              <h2>Manage Clients</h2>
            </SectionHeader>
            
            <ClientList>
              {clients.map(client => (
                <ClientItem key={client.id}>
                  <ClientDetails>
                    <ClientName>{client.name}</ClientName>
                    <ClientStatus connected={client.connected}>
                      {client.connected ? 'Online' : 'Offline'}
                    </ClientStatus>
                  </ClientDetails>
                  
                  <ClientActions>
                    <PermissionsButton 
                      onClick={() => openPermissionsModal(client)}
                      title="Manage Permissions"
                    >
                      <FaUsersCog /> Permissions
                    </PermissionsButton>
                  </ClientActions>
                </ClientItem>
              ))}
              
              {clients.length === 0 && (
                <EmptyState>No clients connected yet</EmptyState>
              )}
            </ClientList>
          </ClientsTab>
        )}
      </Content>
      
      {/* Permissions Modal */}
      {showPermissionsModal && selectedClient && (
        <ModalOverlay>
          <PermissionsModal>
            <ModalHeader>
              <h3>Permissions for {selectedClient.name}</h3>
              <CloseButton onClick={() => setShowPermissionsModal(false)}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            
            <ModalContent>
              <PermissionsTable>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Can Listen</th>
                    <th>Can Talk</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map(channel => (
                    <tr key={channel.id}>
                      <td>{channel.name}</td>
                      <td>
                        <Checkbox 
                          checked={clientPermissions[channel.id]?.canListen || false}
                          onChange={() => togglePermission(channel.id, 'canListen')}
                        />
                      </td>
                      <td>
                        <Checkbox 
                          checked={clientPermissions[channel.id]?.canTalk || false}
                          onChange={() => togglePermission(channel.id, 'canTalk')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PermissionsTable>
            </ModalContent>
            
            <ModalFooter>
              <SaveButton onClick={saveClientPermissions}>
                <FaSave /> Save Permissions
              </SaveButton>
              <CancelButton onClick={() => setShowPermissionsModal(false)}>
                <FaTimes /> Cancel
              </CancelButton>
            </ModalFooter>
          </PermissionsModal>
        </ModalOverlay>
      )}
    </AdminContainer>
  );
};

const AdminContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
`;

const AdminHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const TabButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${({ active }) => 
    active ? 'var(--accent-primary)' : 'var(--bg-tertiary)'};
  color: ${({ active }) => 
    active ? 'var(--text-invert)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ active }) => 
      active ? 'var(--accent-secondary)' : 'var(--bg-primary)'};
  }
`;

const Content = styled.div`
  flex: 1;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SectionHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--bg-tertiary);
  
  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-primary);
  }
`;

const ChannelsTab = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const ClientsTab = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const NewChannelForm = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FormGroup = styled.div`
  flex: 1;
  min-width: 200px;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--bg-primary);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border-radius: var(--border-radius-sm);
    
    &:focus {
      border-color: var(--accent-primary);
      outline: none;
    }
  }
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--accent-secondary);
  }
`;

const ChannelList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const ChannelItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  margin-bottom: 1rem;
`;

const ChannelDetails = styled.div`
  flex: 1;
`;

const ChannelName = styled.div`
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

const ChannelDescription = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const ChannelActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
`;

const EditChannelForm = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--success);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--success-dark);
  }
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--error);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--error-dark);
  }
`;

const ClientList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const ClientItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  margin-bottom: 1rem;
`;

const ClientDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ClientName = styled.div`
  font-weight: 500;
  color: var(--text-primary);
`;

const ClientStatus = styled.div`
  font-size: 0.8rem;
  color: ${({ connected }) => 
    connected ? 'var(--success)' : 'var(--warning)'};
`;

const ClientActions = styled.div``;

const PermissionsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--accent-secondary);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PermissionsModal = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--bg-tertiary);
  
  h3 {
    margin: 0;
    color: var(--text-primary);
  }
`;

const ModalContent = styled.div`
  padding: 1rem;
  overflow-y: auto;
  max-height: 60vh;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--bg-tertiary);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--text-primary);
  }
`;

const PermissionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--bg-tertiary);
  }
  
  th {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  td {
    color: var(--text-secondary);
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: var(--text-secondary);
  font-style: italic;
`;

export default AdminConsole;
