import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Search, X } from "lucide-react";
import { StorageService } from "../../services/StorageService";
import { Skeleton } from "../ui/skeleton";

const storageService = new StorageService();

const ConversationViewer = ({ childId, childName }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [nextPageToLoad, setNextPageToLoad] = useState(2);
  const [totalPages, setTotalPages] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);
  
  // Calculate if we can load more conversations
  const hasMoreConversations = conversations.length < totalConversations;

  // Filter conversations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = conversations.filter((conversation) => {
      // Search in all conversation attributes
      if (conversation.firstMessageContent) {
        return conversation.firstMessageContent.toLowerCase().includes(query);
      }
      if (conversation.first_message_content) {
        return conversation.first_message_content.toLowerCase().includes(query);
      }
      if (conversation.messages && conversation.messages.length > 0) {
        return conversation.messages.some((message) =>
          message.content.toLowerCase().includes(query)
        );
      }
      return false;
    });

    setFilteredConversations(filtered);
    
    // Reset to page 1 when searching
    setPage(1);
  }, [searchQuery, conversations]);

  // Load conversations with infinite scrolling
  useEffect(() => {
    if (!childId) return;

    const loadData = async () => {
      try {
        if (page === 1) {
          // First page, reset state
          setLoading(true);
          setError(null);
          setConversations([]);
        } else {
          // Show loading indicator for subsequent pages
          setLoading(true);
        }

        console.log(
          `Loading conversations for child ID ${childId} and name: ${childName}, page: ${page}`
        );

        // Load paginated conversations for this child
        try {
          console.log(`Fetching conversations for child ${childId}, page ${page}`);
          const response = await storageService.getConversationsByChildId(childId, page);
          console.log('Response from getConversationsByChildId:', response);
          
          // Extract conversation data with appropriate error handling
          let childConversations = [];
          let pagination = { total: 0, pages: 1, page: 1, limit: 20 };
          
          // Log the raw response to debug
          console.log(`Raw response for page ${page}:`, JSON.stringify(response).substring(0, 100) + '...');
          
          if (response && response.conversations) {
            // New format with pagination
            childConversations = response.conversations;
            pagination = response.pagination;
            console.log(`Page ${page} pagination:`, pagination);
          } else if (Array.isArray(response)) {
            // Old format (array only)
            childConversations = response;
            pagination = { 
              total: response.length, 
              pages: 1,
              page: 1,
              limit: response.length 
            };
          } else {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format from server');
          }
          
          if (childConversations.length > 0) {
            console.log(`Page ${page} first conversation:`, childConversations[0].id);
            console.log(`Page ${page} last conversation:`, childConversations[childConversations.length-1].id);
          }
          console.log(`Page ${page} conversation count:`, childConversations.length);
          
          // Update pagination state
          setTotalPages(pagination.pages || 1);
          setTotalConversations(pagination.total || childConversations.length);
          
          // Process conversations and ensure we have valid objects
          const processedConversations = childConversations
            .filter(conversation => {
              if (!conversation || !conversation.id) {
                console.warn('Filtered out invalid conversation:', conversation);
                return false;
              }
              return true;
            })
            .map(conversation => {
              // Fix date fields
              const startDate =
                conversation.started_at ||
                conversation.startedAt ||
                new Date().toISOString();
              const lastActivityDate =
                conversation.last_activity_at ||
                conversation.lastActivityAt ||
                startDate;

              return {
                ...conversation,
                // Important: preserve original ID exactly as received
                childId: childId,
                startedAt: startDate,
                lastActivityAt: lastActivityDate,
                // Store the message metadata from backend
                messageCount: conversation.message_count || 0,
                firstMessageContent: conversation.first_message_content || "",
                // Initialize with empty messages array for lazy-loading later
                messages: conversation.messages || []
              };
            });

          console.log("Processed conversation count:", processedConversations.length);
          if (processedConversations.length > 0) {
            console.log("First processed conversation ID:", processedConversations[0].id);
          }
          
          if (processedConversations.length === 0) {
            console.warn("No valid conversations found for this child");
          }

          // Sort conversations by last activity date
          const sortedConversations = processedConversations.sort((a, b) => {
            const dateA = new Date(a.lastActivityAt || a.last_activity_at || 0);
            const dateB = new Date(b.lastActivityAt || b.last_activity_at || 0);
            return dateB - dateA;
          });

          console.log("Final processed conversations count:", sortedConversations.length);
          
          // For infinite scrolling, we append to existing conversations for page > 1
          if (page === 1) {
            setConversations(sortedConversations);
            setFilteredConversations(sortedConversations);
          } else {
            // When appending, make sure we don't add duplicates
            const existingIds = new Set(conversations.map(c => c.id));
            const newConversations = sortedConversations.filter(c => !existingIds.has(c.id));
            
            console.log(`Adding ${newConversations.length} new unique conversations from page ${page}`);
            console.log('New conversation IDs:', newConversations.map(c => c.id));
            
            if (newConversations.length > 0) {
              setConversations(prev => [...prev, ...newConversations]);
              setFilteredConversations(prev => [...prev, ...newConversations]);
            } else {
              console.log('No new conversations to add - might be duplicate page or empty result');
            }
          }

          // Auto-select the most recent conversation (only for first page)
          if (sortedConversations.length > 0 && page === 1) {
            const mostRecent = sortedConversations[0];
            console.log('Auto-selecting first conversation:', mostRecent.id);
            setSelectedConversationId(mostRecent.id);
            
            // Force immediate messages loading for first conversation
            // Need to set the selected conversation first with loading state
            setSelectedConversation({...mostRecent, messagesLoading: true});
            
            // Then load the messages
            storageService.getConversationMessages(mostRecent.id)
              .then(messages => {
                console.log("Auto-loaded first conversation messages:", messages?.length || 0);
                
                // Update with messages
                const conversationWithMessages = {
                  ...mostRecent,
                  messages: messages || [],
                  messagesLoading: false
                };
                
                // Update all conversation lists with messages
                setSelectedConversation(conversationWithMessages);
                setConversations(prev => {
                  return prev.map(c => c.id === mostRecent.id ? conversationWithMessages : c);
                });
                setFilteredConversations(prev => {
                  return prev.map(c => c.id === mostRecent.id ? conversationWithMessages : c);
                });
              })
              .catch(err => {
                console.error("Error auto-loading first conversation messages:", err);
                setSelectedConversation({...mostRecent, messagesError: true, messagesLoading: false});
              });
          } else if (sortedConversations.length === 0 && page === 1) {
            setSelectedConversationId(null);
            setSelectedConversation(null);
          }

          // Load usage statistics
          try {
            const stats = await storageService.getChildUsageStats(childId);
            setUsageStats(stats);
          } catch (statsError) {
            console.error("Error loading usage stats:", statsError);
            // Don't fail the whole page load if stats fail
            setUsageStats({
              totalConversations: pagination.total || 0,
              totalMessages: 0,
              totalUserMessages: 0,
              totalAssistantMessages: 0,
              averageMessagesPerConversation: '0'
            });
          }

          setLoading(false);
        } catch (fetchError) {
          console.error("Error fetching conversations:", fetchError);
          setError("Failed to load conversation history. Try again later.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading conversations:", err);
        setError("Failed to load conversation history. Try again later.");
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, childName, page]);

  // Handle conversation selection with lazy loading of messages
  const handleSelectConversation = async (conversationId) => {
    console.log("Selecting conversation:", conversationId);
    setSelectedConversationId(conversationId);
    
    // Find the conversation in our list
    const selected = conversations.find(c => c.id === conversationId);
    console.log("Found conversation:", selected);
    
    if (!selected) {
      console.error(`Conversation with ID ${conversationId} not found in list (${conversations.length} conversations total)`);
      if (conversations.length > 0) {
        console.log("Available conversation IDs:", conversations.slice(0, 5).map(c => c.id));
      }
      return;
    }
    
    // If we already have messages for this conversation, use them
    if (selected && selected.messages && selected.messages.length > 0) {
      console.log("Using existing messages:", selected.messages.length);
      setSelectedConversation(selected);
      return;
    }
    
    // Show loading state for conversation panel only
    setSelectedConversation({...selected, messagesLoading: true});
    
    try {
      // Fetch messages only for this selected conversation
      console.log("Fetching messages for conversation:", conversationId);
      const messages = await storageService.getConversationMessages(conversationId);
      console.log("Fetched messages count:", messages ? messages.length : 0);
      
      // Create updated conversation object with messages
      const conversationWithMessages = {
        ...selected,
        messages: messages || [],
        messagesLoading: false
      };
      
      // Update the selected conversation
      setSelectedConversation(conversationWithMessages);
      
      // Also update the conversation in our conversation list
      setConversations(prev => {
        return prev.map(c => c.id === conversationId ? conversationWithMessages : c);
      });
      
      // Update filtered conversations too if we're searching
      if (searchQuery) {
        setFilteredConversations(prev => {
          return prev.map(c => c.id === conversationId ? conversationWithMessages : c);
        });
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error);
      setError("Failed to load conversation messages. Try again later.");
      // Update selected conversation to show error state
      setSelectedConversation({...selected, messagesError: true, messagesLoading: false});
    }
  };

  // Handle loading more conversations
  const handleLoadMore = () => {
    console.log(`Loading more conversations. Current next page: ${nextPageToLoad}`);
    setPage(nextPageToLoad);
    setNextPageToLoad(prev => prev + 1);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      // Handle invalid or missing dates
      if (!dateString || dateString === "Invalid Date") {
        return "Unknown date";
      }

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "Unknown date";
      }

      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "Unknown date";
    }
  };

  // Get a shorter date format for conversation list
  const formatShortDate = (dateString) => {
    try {
      // Handle invalid or missing dates
      if (!dateString || dateString === "Invalid Date") {
        return "Unknown";
      }

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid short date string:", dateString);
        return "Unknown";
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // If today, show time only
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // If yesterday, show "Yesterday"
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }

      // Otherwise show date
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    } catch (error) {
      console.error("Error formatting short date:", error, dateString);
      return "Unknown";
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
      <div className="bg-primary-foreground p-3 border-b">
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
      <div className="bg-primary-foreground p-3 border-b">
        <h3 className="font-medium">Conversation Details</h3>
        <Skeleton className="h-3 w-40 mt-1" />
      </div>

      <div className="overflow-y-auto p-4 h-[calc(100%-64px)] space-y-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[85%] ${
              i % 2 === 0 ? "ml-auto" : ""
            }`}
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

  // Determine if we have actually loaded conversations
  const hasConversations = Array.isArray(conversations) && conversations.length > 0;

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
              onClick={() => setSearchQuery("")}
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
      {loading && page === 1 ? (
        <StatsCardsSkeleton />
      ) : (
        usageStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">
                  {usageStats.totalConversations}
                </div>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">
                  {usageStats.totalMessages}
                </div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">
                  {usageStats.totalUserMessages}
                </div>
                <p className="text-sm text-muted-foreground">Child Messages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-primary">
                  {usageStats.averageMessagesPerConversation}
                </div>
                <p className="text-sm text-muted-foreground">Avg. Messages</p>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {loading && page === 1 ? (
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
          <p className="text-muted-foreground mb-4">
            No conversations match your search.
          </p>
          <Button variant="outline" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      ) : !hasConversations ? (
        <div className="bg-muted rounded-lg p-6 text-center">
          <p className="text-muted-foreground">
            No conversations yet for {childName}.
          </p>
          <p className="text-muted-foreground">
            When {childName} starts chatting with the AI, their conversations
            will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-350px)]">
          {/* Conversation List */}
          <div className="md:col-span-1 border rounded-lg overflow-hidden">
            <div className="bg-primary-foreground p-3 border-b">
              <h3 className="font-medium">Recent Conversations</h3>
            </div>
            <div className="overflow-y-auto h-[calc(100%-44px)]">
              {filteredConversations.map((conversation) => (
                <div
                  key={`${conversation.id}-${page}`}
                  className={`border-b p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversationId === conversation.id ? "bg-muted" : ""
                  }`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatShortDate(
                      conversation.startedAt || conversation.lastActivityAt
                    )}
                  </div>
                  <div className="line-clamp-2 text-sm">
                    {conversation.first_message_content || conversation.firstMessageContent || "Empty conversation"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {conversation.message_count || conversation.messageCount || 0}{" "}
                    messages
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              {!loading && totalConversations > conversations.length && (
                <div className="flex justify-center mt-4 mb-2">
                  <Button 
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="w-full mx-4"
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                        Loading more...
                      </>
                    ) : (
                      <>Load More ({conversations.length} of {totalConversations} conversations)</>  
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Conversation Detail */}
          <div className="md:col-span-2 border rounded-lg overflow-hidden">
            {selectedConversation ? (
              <>
                <div className="bg-primary-foreground p-3 border-b">
                  <h3 className="font-medium">Conversation Details</h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    Started:{" "}
                    {formatDate(
                      selectedConversation.startedAt ||
                        selectedConversation.lastActivityAt
                    )}
                    <span className="mx-2">•</span>
                    Messages:{" "}
                    {selectedConversation.message_count || 
                     selectedConversation.messageCount || 
                     (selectedConversation.messages ? selectedConversation.messages.length : 0)}
                  </div>
                </div>

                <div className="overflow-y-auto p-4 h-[calc(100%-64px)] space-y-4">
                  {selectedConversation.messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : selectedConversation.messagesError ? (
                    <div className="text-center text-red-500 pt-8">
                      Error loading messages. Try selecting the conversation again.
                    </div>
                  ) : selectedConversation.messages &&
                  selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          message.role === "user"
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">
                            {message.role === "user"
                              ? childName
                              : "AI Assistant"}
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
