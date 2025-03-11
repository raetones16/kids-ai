import React, { useState } from 'react';
import './LoginScreen.css';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/StorageService';

const storageService = new StorageService();

const LoginScreen = ({ childProfiles, onChildLogin }) => {
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDob, setNewProfileDob] = useState('');
  const [newProfileInstructions, setNewProfileInstructions] = useState('');

  // Demo profiles for initial setup when none exist
  const createDemoProfiles = async () => {
    const demoProfiles = [
      {
        id: uuidv4(),
        name: 'Emma',
        dob: '2017-05-15', // 7 years old in 2024
        customInstructions: 'Emma loves science and space. She might sometimes ask about these topics.'
      },
      {
        id: uuidv4(),
        name: 'Jack',
        dob: '2015-09-23', // 9 years old in 2024
        customInstructions: 'Jack is interested in dinosaurs and history. He enjoys learning interesting facts.'
      }
    ];

    for (const profile of demoProfiles) {
      await storageService.saveChildProfile(profile);
    }

    // Reload the page to show the new profiles
    window.location.reload();
  };

  // Handle adding a new profile
  const handleAddProfile = async (e) => {
    e.preventDefault();
    
    if (!newProfileName.trim() || !newProfileDob) return;
    
    const newProfile = {
      id: uuidv4(),
      name: newProfileName.trim(),
      dob: newProfileDob,
      customInstructions: newProfileInstructions.trim()
    };
    
    await storageService.saveChildProfile(newProfile);
    
    // Reset form and hide it
    setNewProfileName('');
    setNewProfileDob('');
    setNewProfileInstructions('');
    setShowAddProfile(false);
    
    // Reload the page to show the new profile
    window.location.reload();
  };

  return (
    <div className="login-screen">
      <div className="logo">Kids AI</div>
      
      <h2>Who's talking today?</h2>
      
      {childProfiles.length > 0 ? (
        <div className="profile-grid">
          {childProfiles.map(profile => (
            <button
              key={profile.id}
              className="profile-button"
              onClick={() => onChildLogin(profile.id)}
            >
              <div className="profile-circle" style={{ backgroundColor: generateColorFromName(profile.name) }}></div>
              <div className="profile-name">{profile.name}</div>
            </button>
          ))}
          
          {childProfiles.length < 5 && (
            <button
              className="profile-button add-profile"
              onClick={() => setShowAddProfile(true)}
            >
              <div className="profile-circle add-circle">+</div>
              <div className="profile-name">Add Profile</div>
            </button>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>No profiles yet! Let's create your first profile or use demo profiles.</p>
          <div className="button-group">
            <button className="primary-button" onClick={() => setShowAddProfile(true)}>
              Create Profile
            </button>
            <button className="secondary-button" onClick={createDemoProfiles}>
              Use Demo Profiles
            </button>
          </div>
        </div>
      )}

      {showAddProfile && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Profile</h3>
            <form onSubmit={handleAddProfile}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="dob">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  value={newProfileDob}
                  onChange={(e) => setNewProfileDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} // Can't select future dates
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="instructions">Custom Instructions (Optional)</label>
                <textarea
                  id="instructions"
                  value={newProfileInstructions}
                  onChange={(e) => setNewProfileInstructions(e.target.value)}
                  placeholder="Add any special instructions for the AI"
                  rows="3"
                />
              </div>
              
              <div className="button-group">
                <button type="submit" className="primary-button">Add Profile</button>
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={() => setShowAddProfile(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Generate a consistent color based on the name
const generateColorFromName = (name) => {
  const colors = [
    '#4285F4', // Blue
    '#0F9D58', // Green
    '#DB4437', // Red
    '#F4B400', // Yellow
    '#9C27B0', // Purple
  ];
  
  // Use the first character's code to pick a color
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default LoginScreen;
