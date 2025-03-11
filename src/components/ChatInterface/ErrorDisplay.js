import React from 'react';

const ErrorDisplay = ({ message, onRetry }) => {
  return (
    <div className="error-container">
      <div className="error-message">{message}</div>
      <button className="retry-button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
};

export default ErrorDisplay;
