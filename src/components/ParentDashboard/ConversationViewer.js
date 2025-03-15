import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Search, X } from 'lucide-react';
import { StorageService } from '../../services/StorageService';
import { Skeleton } from '../ui/skeleton';

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
        
        console.log(`Loading conversations for child ID ${childId} and name: ${childName}`);
        
        // Load all conversations for this child
        const childConversations = await storageService.getConversationsByChildId(childId);
        console.log('Loaded conversations:', childConversations);
        
        // Ensure all conversations have proper date fields
        const processedConversations = await Promise.all(
          childConversations.map(async (conversation) => {
            // Verify this conversation belongs to the current child
            if ((conversation.childId !== childId && conversation.child_id !== childId) ||
                (!conversation.childId && !conversation.child_id)) {
              console.error(`Conversation ${conversation.id} has wrong/missing child ID:`, 
                conversation.childId || conversation.child_id);
              return null; // Skip this conversation
            }
            
            // Make sure we have messages loaded for each conversation
            if (!conversation.messages || conversation.messages.length === 0) {
              try {
                // Load messages if they're not already included
                const messages = await storageService.getConversationMessages(conversation.id);
                conversation.messages = messages || [];
              } catch (err) {
                console.error(`Failed to load messages for conversation ${conversation.id}:`, err);
                conversation.messages = [];
              }
            }
            
            // Fix date fields
            const startDate = conversation.started_at || conversation.startedAt || new Date().toISOString();
            const lastActivityDate = conversation.last_activity_at || conversation.lastActivityAt || startDate;
            
            return {
              ...conversation,
              childId: childId, // Ensure the childId is set correctly
              startedAt: startDate,
              lastActivityAt: lastActivityDate
            };
          })
        );
        
        // Filter out any null values (conversations that don't belong to this child)
        const validConversations = processedConversations.filter(conv => conv !== null);
        
        // Sort conversations by last activity date
        const sortedConversations = validConversations.sort((a, b) => {
          const dateA = new Date(a.lastActivityAt || a.last_activity_at || 0);
          const dateB = new Date(b.lastActivityAt || b.last_activity_at || 0);
          return dateB - dateA;
        });
        
        console.log('Final processed conversations:', sortedConversations);
        setConversations(sortedConversations);
        setFilteredConversations(sortedConversations);
        
        // Auto-select the most recent conversation
        if (sortedConversations.length > 0) {
          const mostRecent = sortedConversations[0];
          setSelectedConversationId(mostRecent.id);
          setSelectedConversation(mostRecent);
        } else {
          setSelectedConversationId(null);
          setSelectedConversation(null);
        }
        
        // Load usage statistics
        const stats = await storageService.getChildUsageStats(childId);
        setUsageStats(stats);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading conversations:', err);
        setError('Failed to load conversation history. Try again later.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [childId, childName]);
  
  // Handle conversation selection
  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    const selected = conversations.find(c => c.id === conversationId);
    setSelectedConversation(selected);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    try {
      // Handle invalid or missing dates
      if (!dateString || dateString === 'Invalid Date') {
        return 'Unknown date';
      }
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Unknown date';
      }
      
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Unknown date';
    }
  };
  
  // Get a shorter date format for conversation list
  const formatShortDate = (dateString) => {
    try {
      // Handle invalid or missing dates
      if (!dateString || dateString === 'Invalid Date') {
        return 'Unknown';
      }
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid short date string:', dateString);
        return 'Unknown';
      }
      
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
    } catch (error) {
      console.error('Error formatting short date:', error, dateString);
      return 'Unknown';
    }
  };

  // Skeleton loader for stats cards
  const StatsCardsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex flex-col items-center">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Skeleton loader for conversation list
  const ConversationListSkeleton = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b">
        <h3 className="font-medium">Recent Conversations</h3>
      </div>
      <div className="overflow-y-auto h-[calc(100%-44px)]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-3 w-10 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );

  // Skeleton loader for conversation details
  const ConversationDetailSkeleton = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b">
        <h3 className="font-medium">Conversation Details</h3>
        <Skeleton className="h-3 w-40 mt-1" />
      </div>
      
      <div className="overflow-y-auto p-4 h-[calc(100%-64px)] space-y-4">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className={`p-3 rounded-lg max-w-[85%] ${i % 2 === 0 ? 'ml-auto' : ''}`}
          >
            <div className="flex justify-between mb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            {i % 2 === 0 && <Skeleton className="h-4 w-3/4" />}
          </div>
        ))}
      </div>
    </div>
  );
  
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
            disabled={loading}
          />
          {searchQuery && (
            <button 
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              disabled={loading}
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
      
      {/* Stats Summary - Show skeleton while loading */}
      {loading ? (
        <StatsCardsSkeleton />
      ) : (
        usageStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">{usageStats.totalConversations}</div>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">{usageStats.totalMessages}</div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">{usageStats.totalUserMessages}</div>
                <p className="text-sm text-muted-foreground">Child Messages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">{usageStats.averageMessagesPerConversation}</div>
                <p className="text-sm text-muted-foreground">Avg. Messages/Conv.</p>
              </CardContent>
            </Card>
          </div>
        )
      )}
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-350px)]">
          {/* Conversation List Skeleton */}
          <div className="md:col-span-1">
            <ConversationListSkeleton />
          </div>
          
          {/* Conversation Detail Skeleton */}
          <div className="md:col-span-2">
            <ConversationDetailSkeleton />
          </div>
        </div>
      ) : filteredConversations.length === 0 && searchQuery ? (
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
