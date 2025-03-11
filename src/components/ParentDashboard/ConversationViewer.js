import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Search, X } from 'lucide-react';
import { StorageService } from '../../services/StorageService';

const storageService = new StorageService();

const ConversationViewer = ({ childId, childName }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  // Filter conversations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = conversations.filter(conversation => {
      // Search in conversation messages
      if (conversation.messages) {
        return conversation.messages.some(message => 
          message.content.toLowerCase().includes(query)
        );
      }
      return false;
    });
    
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);
  
  // Load conversations when child id changes
  useEffect(() => {
    if (!childId) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load all conversations for this child
        const childConversations = await storageService.getConversationsByChildId(childId);
        
        // Sort conversations by last activity date
        const sortedConversations = childConversations.sort((a, b) => 
          new Date(b.lastActivityAt) - new Date(a.lastActivityAt)
        );
        
        setConversations(sortedConversations);
        setFilteredConversations(sortedConversations);
        
        // Auto-select the most recent conversation
        if (sortedConversations.length > 0 && !selectedConversationId) {
          const mostRecent = sortedConversations[0];
          setSelectedConversationId(mostRecent.id);
          setSelectedConversation(mostRecent);
        }
        
        // Load usage statistics
        const stats = await storageService.getChildUsageStats(childId);
        setUsageStats(stats);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading conversations:', err);
        setError('Failed to load conversation history');
        setLoading(false);
      }
    };
    
    loadData();
  }, [childId, selectedConversationId]);
  
  // Handle conversation selection
  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    const selected = conversations.find(c => c.id === conversationId);
    setSelectedConversation(selected);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get a shorter date format for conversation list
  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If today, show time only
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday, show "Yesterday"
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // If still loading
  if (loading) {
    return <div className="flex items-center justify-center h-40">Loading conversation history...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{childName}'s Conversations</h2>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search conversations..."
            className="w-full bg-background py-2 pl-8 pr-8 rounded-md border shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Display error if there is one */}
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      {/* Stats Summary */}
      {usageStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-primary">{usageStats.totalConversations}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Conversations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-primary">{usageStats.totalMessages}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total Messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-primary">{usageStats.totalUserMessages}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Child Messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-primary">{usageStats.averageMessagesPerConversation}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Avg. Messages/Conv.</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {filteredConversations.length === 0 && searchQuery ? (
        <div className="bg-muted rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-4">No conversations match your search.</p>
          <Button 
            variant="outline" 
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </Button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-muted rounded-lg p-6 text-center">
          <p className="text-muted-foreground">No conversations yet for {childName}.</p>
          <p className="text-muted-foreground">When {childName} starts chatting with the AI, their conversations will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-350px)]">
          {/* Conversation List */}
          <div className="md:col-span-1 border rounded-lg overflow-hidden">
            <div className="bg-muted p-3 border-b">
              <h3 className="font-medium">Recent Conversations</h3>
            </div>
            <div className="overflow-y-auto h-[calc(100%-44px)]">
              {filteredConversations.map((conversation) => (
                <div 
                  key={conversation.id}
                  className={`border-b p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedConversationId === conversation.id ? 'bg-muted' : ''}`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatShortDate(conversation.startedAt || conversation.lastActivityAt)}
                  </div>
                  <div className="line-clamp-2 text-sm">
                    {conversation.messages && conversation.messages.length > 0 
                      ? conversation.messages[0].content
                      : 'Empty conversation'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {conversation.messages ? conversation.messages.length : 0} messages
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Conversation Detail */}
          <div className="md:col-span-2 border rounded-lg overflow-hidden">
            {selectedConversation ? (
              <>
                <div className="bg-muted p-3 border-b">
                  <h3 className="font-medium">Conversation Details</h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    Started: {formatDate(selectedConversation.startedAt || selectedConversation.lastActivityAt)}
                    <span className="mx-2">•</span>
                    Messages: {selectedConversation.messages ? selectedConversation.messages.length : 0}
                  </div>
                </div>
                
                <div className="overflow-y-auto p-4 h-[calc(100%-64px)] space-y-4">
                  {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((message, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          message.role === 'user' 
                            ? 'ml-auto bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">
                            {message.role === 'user' ? childName : 'AI Assistant'}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground pt-8">
                      No messages in this conversation.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a conversation from the list to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationViewer;
