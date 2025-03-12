import React, { useState } from 'react';
import SearchTest from './SearchTest';
import './DebugPanel.css';

const DebugPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  return (
    <div className={`debug-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="debug-toggle" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? '× Close Debug' : '⚙️ Debug'}
      </div>
      
      {isExpanded && (
        <div className="debug-content">
          <div className="debug-tabs">
            <button
              className={activeTab === 'logs' ? 'active' : ''}
              onClick={() => setActiveTab('logs')}
            >
              Logs
            </button>
            <button
              className={activeTab === 'search' ? 'active' : ''}
              onClick={() => setActiveTab('search')}
            >
              Search Test
            </button>
          </div>
          
          <div className="debug-tab-content">
            {activeTab === 'logs' && (
              <div className="logs-tab">
                <h3>Development Logs</h3>
                <p>Console logs and debugging information would be shown here.</p>
                <div className="debug-actions">
                  <button onClick={() => console.clear()}>Clear Console</button>
                </div>
              </div>
            )}
            
            {activeTab === 'search' && (
              <div className="search-tab">
                <SearchTest />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
