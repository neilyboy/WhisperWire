import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUser, FaKey, FaCheck, FaTimes, FaSave, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { clientsAPI } from '../services/api';

const ProfileSettings = () => {
  const [profile, setProfile] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    darkMode: true,
    pushToTalkKey: 'Space',
    notificationSound: true
  });
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const { currentUser, updateUserProfile } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (currentUser) {
      setProfile(prev => ({
        ...prev,
        name: currentUser.name || '',
        darkMode: localStorage.getItem('darkMode') === 'true',
        pushToTalkKey: localStorage.getItem('pushToTalkKey') || 'Space',
        notificationSound: localStorage.getItem('notificationSound') !== 'false'
      }));
    }
  }, [currentUser]);

  const validateForm = () => {
    const newErrors = {};
    
    // Validate password fields if any are filled
    if (profile.newPassword || profile.confirmPassword || profile.currentPassword) {
      if (!profile.currentPassword) {
        newErrors.currentPassword = 'Current password is required';
      }
      
      if (profile.newPassword && profile.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      
      if (profile.newPassword !== profile.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Prepare data for API
      const profileData = {
        name: profile.name
      };
      
      // Include password data if changing password
      if (profile.newPassword) {
        profileData.currentPassword = profile.currentPassword;
        profileData.newPassword = profile.newPassword;
      }
      
      // Save to API
      await clientsAPI.updateProfile(profileData);
      
      // Save preferences to local storage
      localStorage.setItem('darkMode', profile.darkMode);
      localStorage.setItem('pushToTalkKey', profile.pushToTalkKey);
      localStorage.setItem('notificationSound', profile.notificationSound);
      
      // Update auth context
      updateUserProfile({
        name: profile.name
      });
      
      showNotification('Profile updated successfully', 'success');
      setIsEditing(false);
      
      // Clear password fields
      setProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Failed to update profile:', error);
      showNotification(`Failed to update profile: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    // Reset form
    setProfile(prev => ({
      ...prev,
      name: currentUser.name || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      darkMode: localStorage.getItem('darkMode') === 'true',
      pushToTalkKey: localStorage.getItem('pushToTalkKey') || 'Space',
      notificationSound: localStorage.getItem('notificationSound') !== 'false'
    }));
    
    setErrors({});
    setIsEditing(false);
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'current') {
      setShowCurrentPassword(!showCurrentPassword);
    } else if (field === 'new') {
      setShowNewPassword(!showNewPassword);
    }
  };

  return (
    <ProfileContainer>
      <ProfileHeader>
        <HeaderIcon>
          <FaUser />
        </HeaderIcon>
        <Title>Profile Settings</Title>
      </ProfileHeader>
      
      <ProfileContent>
        <Form onSubmit={handleSubmit}>
          <FormSection>
            <SectionTitle>Account Information</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="name">Username</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={profile.name}
                onChange={handleChange}
                disabled={!isEditing}
                error={errors.name}
              />
              {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
            </FormGroup>
            
            {isEditing && (
              <>
                <FormGroup>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <PasswordInputContainer>
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPassword"
                      name="currentPassword"
                      value={profile.currentPassword}
                      onChange={handleChange}
                      error={errors.currentPassword}
                      placeholder="Enter to change password"
                    />
                    <PasswordToggle 
                      onClick={() => togglePasswordVisibility('current')}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </PasswordToggle>
                  </PasswordInputContainer>
                  {errors.currentPassword && <ErrorMessage>{errors.currentPassword}</ErrorMessage>}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="newPassword">New Password</Label>
                  <PasswordInputContainer>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={profile.newPassword}
                      onChange={handleChange}
                      error={errors.newPassword}
                    />
                    <PasswordToggle 
                      onClick={() => togglePasswordVisibility('new')}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </PasswordToggle>
                  </PasswordInputContainer>
                  {errors.newPassword && <ErrorMessage>{errors.newPassword}</ErrorMessage>}
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={profile.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                  />
                  {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
                </FormGroup>
              </>
            )}
          </FormSection>
          
          <FormSection>
            <SectionTitle>Interface Preferences</SectionTitle>
            
            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  name="darkMode"
                  checked={profile.darkMode}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                Dark Mode
              </CheckboxLabel>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="pushToTalkKey">Push-to-Talk Key</Label>
              <Select
                id="pushToTalkKey"
                name="pushToTalkKey"
                value={profile.pushToTalkKey}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="Space">Space</option>
                <option value="ControlLeft">Left Control</option>
                <option value="ControlRight">Right Control</option>
                <option value="ShiftLeft">Left Shift</option>
                <option value="ShiftRight">Right Shift</option>
                <option value="AltLeft">Left Alt</option>
                <option value="AltRight">Right Alt</option>
                <option value="KeyF">F Key</option>
                <option value="KeyT">T Key</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  name="notificationSound"
                  checked={profile.notificationSound}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                Notification Sounds
              </CheckboxLabel>
            </FormGroup>
          </FormSection>
          
          <FormActions>
            {isEditing ? (
              <>
                <CancelButton 
                  type="button" 
                  onClick={cancelEdit}
                  disabled={isSaving}
                >
                  <FaTimes />
                  Cancel
                </CancelButton>
                <SaveButton 
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : (
                    <>
                      <FaSave />
                      Save Changes
                    </>
                  )}
                </SaveButton>
              </>
            ) : (
              <EditButton 
                type="button" 
                onClick={() => setIsEditing(true)}
              >
                <FaKey />
                Edit Profile
              </EditButton>
            )}
          </FormActions>
        </Form>
      </ProfileContent>
    </ProfileContainer>
  );
};

const ProfileContainer = styled.div`
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--bg-tertiary);
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--accent-primary);
  color: var(--text-invert);
  border-radius: 50%;
`;

const Title = styled.h3`
  margin: 0;
  color: var(--text-primary);
`;

const ProfileContent = styled.div`
  padding: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--bg-tertiary);
  
  &:last-of-type {
    border-bottom: none;
  }
`;

const SectionTitle = styled.h4`
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--bg-tertiary);
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
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const PasswordInputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--text-primary);
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
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
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
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  option {
    background-color: var(--bg-tertiary);
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  @media (max-width: 576px) {
    width: 100%;
  }
`;

const SaveButton = styled(Button)`
  background-color: var(--accent-primary);
  color: var(--text-invert);
  
  &:hover:not(:disabled) {
    background-color: var(--accent-secondary);
  }
`;

const CancelButton = styled(Button)`
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  
  &:hover:not(:disabled) {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }
`;

const EditButton = styled(Button)`
  background-color: var(--accent-primary);
  color: var(--text-invert);
  
  &:hover {
    background-color: var(--accent-secondary);
  }
`;

export default ProfileSettings;
