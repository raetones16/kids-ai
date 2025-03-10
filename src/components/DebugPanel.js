import React, { useState, useEffect, useRef } from 'react';
import './DebugPanel.css';
import Logger from '../utils/Logger';

/**
 * Debug panel component to display logs and system information
 */
const DebugPanel = () => {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [systemInfo, setSystemInfo] = useState({});
  const refreshIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Initialize system info
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      onLine: navigator.onLine,
      webGL: !!document.createElement('canvas').getContext('webgl'),
      webAudio: !!window.AudioContext || !!window.webkitAudioContext,
      speechRecognition: !!window.SpeechRecognition || !!window.webkitSpeechRecognition,
      speechSynthesis: !!window.speechSynthesis,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    setSystemInfo(info);
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update logs when panel is visible
  useEffect(() => {
    if (isVisible) {
      // Fetch logs immediately
      setLogs(Logger.getLogHistory());
      
      // Set up interval to refresh logs
      const interval = setInterval(() => {
        if (isMountedRef.current) {
          setLogs(Logger.getLogHistory());
        }
      }, 1000);
      
      refreshIntervalRef.current = interval;
      
      return () => {
        clearInterval(interval);
        refreshIntervalRef.current = null;
      };
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, [isVisible]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const clearLogs = () => {
    Logger.clearLogHistory();
    setLogs([]);
  };

  const downloadLogs = () => {
    const logText = Logger.exportLogs();
    const blob = new Blob([logText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kids-ai-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Toggle button always visible in corner
  return (
    <>
      <button className="debug-toggle" onClick={toggleVisibility}>
        {isVisible ? 'Hide Debug' : 'Debug'}
      </button>
      
      {isVisible && (
        <div className="debug-panel">
          <div className="debug-header">
            <h3>Debug Panel</h3>
            <div className="debug-actions">
              <button onClick={clearLogs}>Clear Logs</button>
              <button onClick={downloadLogs}>Download Logs</button>
            </div>
          </div>
          
          <div className="debug-content">
            <div className="debug-section">
              <h4>System Information</h4>
              <div className="system-info">
                <div><strong>Browser:</strong> {systemInfo.userAgent}</div>
                <div><strong>Platform:</strong> {systemInfo.platform}</div>
                <div><strong>Viewport:</strong> {systemInfo.viewport?.width}x{systemInfo.viewport?.height}</div>
                <div><strong>Online:</strong> {systemInfo.onLine ? 'Yes' : 'No'}</div>
                <div><strong>WebGL:</strong> {systemInfo.webGL ? 'Supported' : 'Not Supported'}</div>
                <div><strong>Speech Recognition:</strong> {systemInfo.speechRecognition ? 'Supported' : 'Not Supported'}</div>
                <div><strong>Speech Synthesis:</strong> {systemInfo.speechSynthesis ? 'Supported' : 'Not Supported'}</div>
              </div>
            </div>
            
            <div className="debug-section">
              <h4>Logs ({logs.length})</h4>
              <div className="logs-container">
                {logs.length === 0 ? (
                  <div className="empty-logs">No logs to display</div>
                ) : (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`log-entry log-${log.level.toLowerCase()}`}
                    >
                      <span className="log-timestamp">{log.timestamp.substring(11, 19)}</span>
                      <span className="log-level">{log.level}</span>
                      <span className="log-component">{log.component}</span>
                      <span className="log-message">{log.message}</span>
                      {log.data && (
                        <div className="log-data">
                          {typeof log.data === 'object' 
                            ? JSON.stringify(log.data) 
                            : log.data.toString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugPanel;
