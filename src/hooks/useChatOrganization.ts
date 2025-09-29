import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConversationTag {
  id: string;
  name: string;
  color: string;
}

interface MessageOrganization {
  messageId: string;
  isBookmarked: boolean;
  tags: ConversationTag[];
}

interface ChatOrganizationState {
  bookmarkedMessages: Set<string>;
  messageTags: Map<string, ConversationTag[]>;
  searchResults: string[];
  searchQuery: string;
  isSearching: boolean;
}

export function useChatOrganization() {
  const [state, setState] = useState<ChatOrganizationState>({
    bookmarkedMessages: new Set(),
    messageTags: new Map(),
    searchResults: [],
    searchQuery: "",
    isSearching: false
  });
  const { toast } = useToast();

  // Load organization data on mount
  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    try {
      // For now, we'll store organization data in memory
      // In a real app, you'd want to persist this to the database
      console.log('Loading organization data...');
    } catch (error) {
      console.error('Failed to load organization data:', error);
    }
  };

  const toggleBookmark = async (messageId: string, bookmarked: boolean) => {
    setState(prev => {
      const newBookmarked = new Set(prev.bookmarkedMessages);
      if (bookmarked) {
        newBookmarked.add(messageId);
      } else {
        newBookmarked.delete(messageId);
      }
      return { ...prev, bookmarkedMessages: newBookmarked };
    });

    // Persist to database in the future
    // await persistOrganizationData();
  };

  const addTag = async (messageId: string, tag: ConversationTag) => {
    setState(prev => {
      const newTags = new Map(prev.messageTags);
      const currentTags = newTags.get(messageId) || [];
      const updatedTags = [...currentTags.filter(t => t.id !== tag.id), tag];
      newTags.set(messageId, updatedTags);
      return { ...prev, messageTags: newTags };
    });
  };

  const removeTag = async (messageId: string, tagId: string) => {
    setState(prev => {
      const newTags = new Map(prev.messageTags);
      const currentTags = newTags.get(messageId) || [];
      const updatedTags = currentTags.filter(t => t.id !== tagId);
      
      if (updatedTags.length === 0) {
        newTags.delete(messageId);
      } else {
        newTags.set(messageId, updatedTags);
      }
      
      return { ...prev, messageTags: newTags };
    });
  };

  const searchMessages = async (query: string, filters: any) => {
    setState(prev => ({ ...prev, isSearching: true, searchQuery: query }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Build search query
      let searchQuery = supabase
        .from('messages')
        .select('id, content, role, created_at')
        .eq('user_id', user.id)
        .ilike('content', `%${query}%`);

      // Apply filters
      if (filters.messageType && filters.messageType !== 'all') {
        if (filters.messageType === 'evidence') {
          searchQuery = searchQuery.or('content.ilike.%upload%,content.ilike.%file%,content.ilike.%evidence%');
        } else {
          searchQuery = searchQuery.eq('role', filters.messageType);
        }
      }

      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        searchQuery = searchQuery.gte('created_at', startDate.toISOString());
      }

      const { data: results, error } = await searchQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        searchResults: results?.map(r => r.id) || [],
        isSearching: false
      }));

    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: "Unable to search messages. Please try again.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isSearching: false }));
    }
  };

  const clearSearch = () => {
    setState(prev => ({
      ...prev,
      searchResults: [],
      searchQuery: "",
      isSearching: false
    }));
  };

  const getMessageOrganization = (messageId: string): MessageOrganization => ({
    messageId,
    isBookmarked: state.bookmarkedMessages.has(messageId),
    tags: state.messageTags.get(messageId) || []
  });

  return {
    searchMessages,
    clearSearch,
    toggleBookmark,
    addTag,
    removeTag,
    getMessageOrganization,
    searchResults: state.searchResults,
    searchQuery: state.searchQuery,
    isSearching: state.isSearching,
    isMessageBookmarked: (messageId: string) => state.bookmarkedMessages.has(messageId),
    getMessageTags: (messageId: string) => state.messageTags.get(messageId) || []
  };
}