import React from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorDisplay = ({ message, onRetry }) => {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-6 text-red-800">
      <div className="flex items-start gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-lg mb-2">Error</h3>
          <p>{message}</p>
        </div>
      </div>
      <Button 
        onClick={onRetry} 
        variant="outline" 
        className="mt-2 flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
};

export default ErrorDisplay;
