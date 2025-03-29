import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUser, FaUserPlus, FaEdit, FaTrash, FaSearch, FaCheck, FaTimes, FaUserCog } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { clientsAPI } from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  
  const { socket, channels } = useSocket();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      const response = await clientsAPI.getAll();
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showNotification('Failed to load user list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (userData) => {
    try {
      await clientsAPI.create(userData);
      showNotification(`User "${userData.name}" created successfully`, 'success');
      setShowAddUserModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      showNotification(`Failed to create user: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      await clientsAPI.update(userId, userData);
      showNotification(`User "${userData.name}" updated successfully`, 'success');
      setShowEditUserModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      showNotification(`Failed to update user: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await clientsAPI.delete(userId);
      showNotification('User deleted successfully', 'success');
      setPendingDeleteUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      showNotification(`Failed to delete user: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const confirmDeleteUser = (user) => {
    setPendingDeleteUser(user);
  };

  const cancelDeleteUser = () => {
    setPendingDeleteUser(null);
  };

  const openEditUserModal = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  return (
    <Container>
      <Header>
        <Title>
          <FaUserCog />
          User Management
        </Title>
        
        <SearchBox>
          <SearchIcon>
            <FaSearch />
          </SearchIcon>
          <SearchInput 
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBox>
        
        <AddButton onClick={() => setShowAddUserModal(true)}>
          <FaUserPlus />
          Add User
        </AddButton>
      </Header>
      
      <Content>
        {isLoading ? (
          <LoadingMessage>Loading users...</LoadingMessage>
        ) : filteredUsers.length > 0 ? (
          <UserList>
            <UserListHeader>
              <UserColumn width="40%">Name</UserColumn>
              <UserColumn width="20%">Role</UserColumn>
              <UserColumn width="20%">Status</UserColumn>
              <UserColumn width="20%">Actions</UserColumn>
            </UserListHeader>
            
            {filteredUsers.map((user) => (
              <UserItem key={user.id}>
                <UserColumn width="40%">
                  <UserName>
                    <UserIcon>
                      <FaUser />
                    </UserIcon>
                    {user.name}
                  </UserName>
                </UserColumn>
                
                <UserColumn width="20%">
                  <UserRole>{user.role}</UserRole>
                </UserColumn>
                
                <UserColumn width="20%">
                  <UserStatus active={user.isActive}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </UserStatus>
                </UserColumn>
                
                <UserColumn width="20%">
                  <ActionButtons>
                    <ActionButton 
                      title="Edit User"
                      onClick={() => openEditUserModal(user)}
                    >
                      <FaEdit />
                    </ActionButton>
                    
                    <ActionButton 
                      title="Delete User"
                      onClick={() => confirmDeleteUser(user)}
                      danger
                    >
                      <FaTrash />
                    </ActionButton>
                  </ActionButtons>
                </UserColumn>
              </UserItem>
            ))}
          </UserList>
        ) : (
          <EmptyMessage>
            {searchTerm 
              ? `No users found matching "${searchTerm}"`
              : 'No users available'
            }
          </EmptyMessage>
        )}
      </Content>
      
      {/* Add User Modal */}
      {showAddUserModal && (
        <UserFormModal
          title="Add New User"
          channels={channels}
          onClose={() => setShowAddUserModal(false)}
          onSubmit={handleAddUser}
        />
      )}
      
      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <UserFormModal
          title={`Edit User: ${selectedUser.name}`}
          user={selectedUser}
          channels={channels}
          onClose={() => setShowEditUserModal(false)}
          onSubmit={(userData) => handleUpdateUser(selectedUser.id, userData)}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {pendingDeleteUser && (
        <ConfirmationModal
          title="Delete User"
          message={`Are you sure you want to delete user "${pendingDeleteUser.name}"? This action cannot be undone.`}
          onConfirm={() => handleDeleteUser(pendingDeleteUser.id)}
          onCancel={cancelDeleteUser}
        />
      )}
    </Container>
  );
};

// User Form Modal Component
const UserFormModal = ({ title, user, channels, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    password: '',
    role: user?.role || 'client',
    isActive: user?.isActive ?? true,
    channelPermissions: user?.channelPermissions || {}
  });
  
  const [errors, setErrors] = useState({});
  
  // Initialize channel permissions if not set
  useEffect(() => {
    if (channels.length > 0) {
      const updatedPermissions = { ...formData.channelPermissions };
      
      channels.forEach(channel => {
        if (!updatedPermissions[channel.id]) {
          updatedPermissions[channel.id] = {
            canJoin: false,
            canSpeak: false,
            canListen: false
          };
        }
      });
      
      setFormData(prev => ({
        ...prev,
        channelPermissions: updatedPermissions
      }));
    }
  }, [channels]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleChannelPermissionChange = (channelId, permission, value) => {
    setFormData(prev => ({
      ...prev,
      channelPermissions: {
        ...prev.channelPermissions,
        [channelId]: {
          ...prev.channelPermissions[channelId],
          [permission]: value
        }
      }
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password is required for new users';
    }
    
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      // Remove password if it's empty (for edits where password isn't changing)
      const userData = { ...formData };
      if (!userData.password) {
        delete userData.password;
      }
      
      onSubmit(userData);
    }
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>
        
        <ModalContent>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Username</Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
              />
              {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
            </FormGroup>
            
            <FormGroup>
              <Label>{user ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />
              {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
            </FormGroup>
            
            <FormGroup>
              <Label>Role</Label>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="client">Client</option>
                <option value="admin">Administrator</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                Active Account
              </CheckboxLabel>
            </FormGroup>
            
            <PermissionsSection>
              <SectionTitle>Channel Permissions</SectionTitle>
              
              {channels.length > 0 ? (
                <ChannelPermissions>
                  <PermissionsHeader>
                    <PermissionColumn width="40%">Channel</PermissionColumn>
                    <PermissionColumn width="20%">Join</PermissionColumn>
                    <PermissionColumn width="20%">Speak</PermissionColumn>
                    <PermissionColumn width="20%">Listen</PermissionColumn>
                  </PermissionsHeader>
                  
                  {channels.map(channel => (
                    <PermissionRow key={channel.id}>
                      <PermissionColumn width="40%">
                        {channel.name}
                      </PermissionColumn>
                      
                      <PermissionColumn width="20%">
                        <CheckboxLabel>
                          <Checkbox
                            type="checkbox"
                            checked={formData.channelPermissions[channel.id]?.canJoin || false}
                            onChange={(e) => handleChannelPermissionChange(channel.id, 'canJoin', e.target.checked)}
                          />
                        </CheckboxLabel>
                      </PermissionColumn>
                      
                      <PermissionColumn width="20%">
                        <CheckboxLabel>
                          <Checkbox
                            type="checkbox"
                            checked={formData.channelPermissions[channel.id]?.canSpeak || false}
                            onChange={(e) => handleChannelPermissionChange(channel.id, 'canSpeak', e.target.checked)}
                          />
                        </CheckboxLabel>
                      </PermissionColumn>
                      
                      <PermissionColumn width="20%">
                        <CheckboxLabel>
                          <Checkbox
                            type="checkbox"
                            checked={formData.channelPermissions[channel.id]?.canListen || false}
                            onChange={(e) => handleChannelPermissionChange(channel.id, 'canListen', e.target.checked)}
                          />
                        </CheckboxLabel>
                      </PermissionColumn>
                    </PermissionRow>
                  ))}
                </ChannelPermissions>
              ) : (
                <EmptyMessage>No channels available</EmptyMessage>
              )}
            </PermissionsSection>
            
            <ModalFooter>
              <CancelButton type="button" onClick={onClose}>
                Cancel
              </CancelButton>
              <SubmitButton type="submit">
                {user ? 'Update User' : 'Create User'}
              </SubmitButton>
            </ModalFooter>
          </Form>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

// Confirmation Modal Component
const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => {
  return (
    <ModalOverlay>
      <ConfirmationContainer>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onCancel}>×</CloseButton>
        </ModalHeader>
        
        <ConfirmationContent>
          <ConfirmationMessage>{message}</ConfirmationMessage>
        </ConfirmationContent>
        
        <ModalFooter>
          <CancelButton onClick={onCancel}>
            <FaTimes />
            Cancel
          </CancelButton>
          <DeleteButton onClick={onConfirm}>
            <FaCheck />
            Confirm Delete
          </DeleteButton>
        </ModalFooter>
      </ConfirmationContainer>
    </ModalOverlay>
  );
};

// Styled Components
const Container = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 1rem;
  background-color: var(--bg-tertiary);
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  
  @media (max-width: 768px) {
    margin-bottom: 0.5rem;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-md);
  padding: 0 0.5rem;
  flex: 1;
  max-width: 300px;
  
  @media (max-width: 768px) {
    max-width: 100%;
    margin-bottom: 0.5rem;
  }
`;

const SearchIcon = styled.div`
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  margin-right: 0.5rem;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  color: var(--text-primary);
  padding: 0.5rem 0;
  width: 100%;
  
  &:focus {
    outline: none;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: var(--accent-secondary);
  }
  
  @media (max-width: 768px) {
    align-self: flex-end;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const UserListHeader = styled.div`
  display: flex;
  padding: 0.5rem 1rem;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
`;

const UserItem = styled.div`
  display: flex;
  padding: 0.75rem 1rem;
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-sm);
  align-items: center;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--bg-hover);
  }
`;

const UserColumn = styled.div`
  width: ${props => props.width || 'auto'};
  padding: 0 0.5rem;
`;

const UserName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
`;

const UserIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--bg-tertiary);
  border-radius: 50%;
  color: var(--accent-primary);
`;

const UserRole = styled.div`
  color: var(--text-secondary);
  text-transform: capitalize;
  font-size: 0.9rem;
`;

const UserStatus = styled.div`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.active ? 'rgba(0, 150, 0, 0.15)' : 'rgba(150, 0, 0, 0.15)'};
  color: ${props => props.active ? 'var(--success)' : 'var(--error)'};
  border-radius: var(--border-radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: ${props => props.danger ? 'rgba(150, 0, 0, 0.1)' : 'var(--bg-tertiary)'};
  color: ${props => props.danger ? 'var(--error)' : 'var(--text-secondary)'};
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.danger ? 'rgba(150, 0, 0, 0.2)' : 'var(--bg-hover)'};
    color: ${props => props.danger ? 'var(--error)' : 'var(--text-primary)'};
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
  font-style: italic;
`;

const EmptyMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
  font-style: italic;
`;

// Modal Components
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
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ConfirmationContainer = styled(ModalContainer)`
  max-width: 450px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--bg-primary);
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: var(--text-primary);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  
  &:hover {
    color: var(--text-primary);
  }
`;

const ModalContent = styled.div`
  padding: 1rem;
  overflow-y: auto;
`;

const ConfirmationContent = styled(ModalContent)`
  padding: 1.5rem 1rem;
`;

const ConfirmationMessage = styled.p`
  margin: 0;
  color: var(--text-primary);
  line-height: 1.5;
  text-align: center;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  gap: 0.75rem;
  background-color: var(--bg-tertiary);
  border-top: 1px solid var(--bg-primary);
`;

// Form Components
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid ${props => props.error ? 'var(--error)' : 'var(--bg-tertiary)'};
  border-radius: var(--border-radius-md);
  
  &:focus {
    outline: none;
    border-color: ${props => props.error ? 'var(--error)' : 'var(--accent-primary)'};
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
  
  option {
    background-color: var(--bg-tertiary);
  }
`;

const ErrorMessage = styled.div`
  color: var(--error);
  font-size: 0.8rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const PermissionsSection = styled.div`
  margin-top: 1rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  font-size: 1rem;
  border-bottom: 1px solid var(--bg-tertiary);
  padding-bottom: 0.5rem;
`;

const ChannelPermissions = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid var(--bg-tertiary);
  border-radius: var(--border-radius-md);
  overflow: hidden;
`;

const PermissionsHeader = styled.div`
  display: flex;
  background-color: var(--bg-tertiary);
  padding: 0.5rem;
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.9rem;
`;

const PermissionRow = styled.div`
  display: flex;
  padding: 0.5rem;
  border-top: 1px solid var(--bg-tertiary);
  
  &:nth-child(odd) {
    background-color: var(--bg-primary);
  }
`;

const PermissionColumn = styled.div`
  width: ${props => props.width || 'auto'};
  display: flex;
  align-items: center;
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: var(--accent-secondary);
  }
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  
  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--error);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: var(--error-dark, #c92a2a);
  }
`;

export default UserManagement;
