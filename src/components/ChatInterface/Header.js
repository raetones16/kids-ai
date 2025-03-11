import React from 'react';

const Header = ({ childName, onLogout }) => {
  return (
    <div className="interface-header">
      <h1>Hi, {childName}!</h1>
      <button className="logout-button" onClick={onLogout}>
        Sign Out
      </button>
    </div>
  );
};

export default Header;
