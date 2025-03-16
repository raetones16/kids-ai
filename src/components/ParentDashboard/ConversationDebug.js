import React from "react";
import { ConversationApi } from "../../services/ApiService";

// This is a simple debug component to inspect database conversations
const ConversationDebug = ({ childId }) => {
  const [conversations, setConversations] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchDirectFromDatabase = async () => {
    setLoading(true);
    try {
      // Use the API directly to bypass any mapping/transforms
      const result = await ConversationApi.getConversationsByChildId(childId);
      console.log("Direct database result:", result);
      
      // If the backend is using the new pagination format
      const convsArray = result.conversations || result;
      setConversations(convsArray);
    } catch (err) {
      console.error("Error fetching conversations directly:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
      <h3 className="text-lg font-bold mb-2">Conversation Debug</h3>
      
      <button 
        className="px-4 py-2 bg-gray-200 rounded mb-4"
        onClick={fetchDirectFromDatabase}
        disabled={loading}
      >
        {loading ? "Loading..." : "Fetch Directly From Database"}
      </button>
      
      {error && (
        <div className="p-2 bg-red-100 text-red-800 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
        {conversations.length > 0 
          ? JSON.stringify(conversations.slice(0, 3), null, 2) + "\n..."
          : "No conversations fetched yet"}
      </pre>
      
      <div className="mt-2">
        <strong>Count:</strong> {conversations.length}
      </div>
    </div>
  );
};

export default ConversationDebug;
