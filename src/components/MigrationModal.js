import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/StorageService';

/**
 * Modal component that checks for backend availability and offers to migrate data
 */
const MigrationModal = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);
  
  const storageServiceRef = useRef(new StorageService());

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Check if migration has already been completed
        const migrationCompleted = localStorage.getItem('kids-ai.migration-completed') === 'true';
        if (migrationCompleted) {
          // Skip migration dialog if already done
          console.log('Migration already completed, skipping dialog');
          onComplete(true);
          return;
        }
        
        // Check if backend is available
        const isAvailable = await storageServiceRef.current.checkBackendAvailability();
        
        if (isAvailable) {
          // Show the migration dialog
          setIsVisible(true);
          setStatus('ready');
        } else {
          // No backend available, continue with localStorage
          console.log('Backend not available, continuing with localStorage');
          onComplete(false);
        }
      } catch (err) {
        console.error('Error checking backend:', err);
        onComplete(false);
      }
    };

    checkBackend();
  }, [onComplete]);

  const handleMigrate = async () => {
    try {
      setStatus('migrating');
      setError(null);
      
      // Perform migration
      const success = await storageServiceRef.current.migrateToBackend();
      
      if (success) {
        setStatus('success');
      } else {
        setStatus('error');
        setError('Migration failed for an unknown reason.');
      }
    } catch (err) {
      console.error('Migration error:', err);
      setStatus('error');
      setError(err.message || 'An unexpected error occurred during migration.');
    }
  };

  const handleSkip = () => {
    console.log('User skipped migration, continuing with localStorage');
    setIsVisible(false);
    onComplete(false);
  };

  const handleContinue = () => {
    // Set flag to remember migration was completed
    localStorage.setItem('kids-ai.migration-completed', 'true');
    setIsVisible(false);
    onComplete(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Data Migration</h2>
        
        {status === 'checking' && (
          <div className="text-center py-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Checking backend connection...</p>
          </div>
        )}
        
        {status === 'ready' && (
          <>
            <p className="mb-4">
              A database connection is available. Would you like to migrate your locally stored data to the server?
              This will allow your data to be accessible across different devices.
            </p>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleSkip}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Skip
              </button>
              <button
                onClick={handleMigrate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Migrate Data
              </button>
            </div>
          </>
        )}
        
        {status === 'migrating' && (
          <div className="text-center py-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Migrating your data to the server...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment. Please don't close the window.</p>
          </div>
        )}
        
        {status === 'success' && (
          <>
            <div className="mb-4 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-lg font-medium">Migration Successful!</p>
              <p className="text-sm text-gray-500 mt-1">
                Your data has been successfully migrated to the server.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleContinue}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Continue
              </button>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="mb-4 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p className="text-lg font-medium">Migration Failed</p>
              <p className="text-sm text-gray-500 mt-1">
                {error || 'There was an error migrating your data. You can continue using localStorage.'}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSkip}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Continue with Local Storage
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MigrationModal;
