import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './globals.css'; // Import the Tailwind CSS
import './components/ui/typography.css'; // Import our typography styles
import App from './App';
import { initializeTheme } from './utils/themeUtils';

// Initialize theme before rendering
initializeTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
