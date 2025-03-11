// This file is kept for backward compatibility
// The functionality has been migrated to the ChatInterface component

import ChatInterface from './ChatInterface';

// Re-export with all the original props
const ChildInterface = (props) => {
  return <ChatInterface {...props} />;
};

export default ChildInterface;
