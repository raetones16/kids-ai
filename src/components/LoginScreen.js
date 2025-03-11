import React from 'react';
import './LoginScreen.css';

const LoginScreen = ({ childProfiles, onChildLogin, onParentLogin }) => {
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

  return (
    <div className="login-screen">
      <div className="logo">Kids AI</div>
      
      <div className="login-header">
        <h2>Who's talking today?</h2>
        <button className="parent-login-button" onClick={onParentLogin}>
          <span className="parent-login-icon">👤</span>
          <span className="parent-login-text">Parent</span>
        </button>
      </div>
      
      {childProfiles.length > 0 ? (
        <div className="profile-grid">
          {childProfiles.map(profile => (
            <button
              key={profile.id}
              className="profile-button"
              onClick={() => onChildLogin(profile.id)}
            >
              <div className="profile-circle" style={{ backgroundColor: generateColorFromName(profile.name) }}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-name">{profile.name}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No child profiles have been created yet.</p>
          <p>Parents need to create profiles through the Parent Dashboard.</p>
        </div>
      )}

      {/* Parent Help Text */}
      <div className="parent-help">
        <p>Parents: Click the "Parent" button above to access the dashboard</p>
      </div>
    </div>
  );
};

export default LoginScreen;
