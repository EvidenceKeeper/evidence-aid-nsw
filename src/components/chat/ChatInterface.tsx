import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Brain, Loader2, Search, Download, Share2, Upload, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { ActionSuggestions } from "./ActionSuggestions";
import { TypingIndicator } from "./TypingIndicator";
import { VoiceInput } from "./VoiceInput";
import { ChatSearchBar } from "./ChatSearchBar";
import { SearchResultHighlighter } from "./SearchResultHighlighter";
import { ConversationExporter } from "./ConversationExporter";
import { EvidencePreview } from "./EvidencePreview";
import { CaseShareDialog } from "@/components/case/CaseShareDialog";
import { CollaborationIndicators } from "@/components/case/CollaborationIndicators";
import { LiveCaseInsights } from "@/components/case/LiveCaseInsights";

import { useChatOrganization } from "@/hooks/useChatOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeFileName } from "@/lib/utils";
import { errorHandler } from "@/utils/errorHandler";
import type { 
  ChatMessage as ChatMessageType, 
  ConversationHistory, 
  AssistantResponse,
  QuickReply,
  MessageCitation
} from "@/types/chat";
import type { DatabaseUser } from "@/types/supabase";

// Using centralized types
type Message = ChatMessageType;

interface EnhancedChatInterfaceProps {
  isModal?: boolean;
  onClose?: () => void;  
}

export function ChatInterface({ isModal = false, onClose }: EnhancedChatInterfaceProps) {
  const MAX_INPUT_LENGTH = 2000;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<'sending' | 'waiting' | 'streaming' | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [typingMessage, setTypingMessage] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  // Removed: processingFiles, unprocessedFiles state (no longer needed with simplified pipeline)
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    searchMessages,
    clearSearch,
    toggleBookmark,
    addTag,
    removeTag,
    getMessageOrganization,
    searchResults,
    searchQuery,
    isSearching
  } = useChatOrganization();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on mount and subscribe to realtime updates
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    // Load draft from localStorage
    const draft = localStorage.getItem('chat-draft');
    if (draft) setInput(draft);
    
    const initializeChat = async () => {
      setLoading(true);
      
      // Load initial history
      if (mounted) {
        await loadChatHistory();
      }
      
      if (mounted) {
        setLoading(false);
      }
      
      // Set up realtime subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      
      console.log('🔔 Subscribing to realtime message updates...');
      channel = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('📩 New message received via realtime:', payload.new);
            const newMsg = payload.new as any;
            
            // Only show assistant messages (proactive analysis messages)
            if (newMsg.role === 'assistant') {
              const formattedMessage: Message = {
                id: newMsg.id,
                role: newMsg.role as "user" | "assistant",
                content: newMsg.content,
                citations: Array.isArray(newMsg.citations) ? (newMsg.citations as unknown as MessageCitation[]) : [],
                timestamp: new Date(newMsg.created_at),
                confidence_score: newMsg.confidence_score || undefined,
                reasoning: newMsg.reasoning || undefined,
                verification_status: (newMsg.verification_status as 'ai_generated' | 'requires_review' | 'lawyer_verified') || undefined,
                source_references: (newMsg.source_references as any) || undefined,
                is_legal_advice: newMsg.is_legal_advice || undefined
              };
              
              console.log('🎯 Proactive assistant message received!');
              toast({
                title: "Evidence Analyzed",
                description: "AI has analyzed your evidence and provided insights",
              });
              
              // Append new message to the end
              setMessages(prev => [...prev, formattedMessage]);
            }
          }
        )
        .subscribe();
    };
    
    initializeChat();
    
    return () => {
      mounted = false;
      if (channel) {
        console.log('🔕 Unsubscribing from realtime updates');
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Save draft to localStorage
  useEffect(() => {
    if (input) {
      localStorage.setItem('chat-draft', input);
    } else {
      localStorage.removeItem('chat-draft');
    }
  }, [input]);

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ No authenticated user, skipping chat history load');
        return;
      }

      // Load newest 50 messages, then reverse to show oldest-to-newest
      const { data: historyMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        errorHandler.handleDbError(error, 'select', 'messages');
        return;
      }

      if (historyMessages && historyMessages.length > 0) {
        const formattedMessages: Message[] = historyMessages
          .map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            citations: Array.isArray(msg.citations) ? (msg.citations as unknown as MessageCitation[]) : [],
            timestamp: new Date(msg.created_at),
            confidence_score: msg.confidence_score || undefined,
            reasoning: msg.reasoning || undefined,
            verification_status: (msg.verification_status as 'ai_generated' | 'requires_review' | 'lawyer_verified') || undefined,
            source_references: (msg.source_references as any) || undefined,
            is_legal_advice: msg.is_legal_advice || undefined
          }))
          .reverse(); // Reverse to show oldest first in UI
        
        console.log(`📨 Loaded ${formattedMessages.length} messages (showing newest 50)`);
        setMessages(formattedMessages);
      } else {
        console.log('💬 No messages found - starting fresh conversation');
        setMessages([]);
      }
    } catch (error) {
      errorHandler.handleChatError(
        error instanceof Error ? error : new Error('Failed to load chat history')
      );
    }
  };

  // Exponential backoff retry helper
  const retryWithBackoff = async (
    fn: () => Promise<Response>,
    maxRetries: number = 3
  ): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Success or non-429 error - return immediately
        if (result.ok || result.status !== 429) {
          return result;
        }
        
        // Rate limit hit - calculate backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`⏱️ Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        lastError = new Error('Rate limit exceeded');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Network error - don't retry
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('🌐 Network error. Check your connection and try again.');
        }
        
        // Last attempt - throw the error
        if (attempt === maxRetries - 1) throw lastError;
        
        // Wait before retry
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`⚠️ Error on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    throw lastError || new Error('⏱️ Rate limit persists. Please wait a few minutes.');
  };

  const sendMessage = async (text?: string) => {
    const textToSend = text || input.trim();
    if (!textToSend && !showFileUpload) return;

    // Clear draft when sending
    localStorage.removeItem('chat-draft');

    // Optimistic UI: Show user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    scrollToBottom();

    setInput("");
    setLoading(true);
    setLoadingState('sending');
    setTypingMessage("Sending message...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to chat');

      // Create placeholder for streaming assistant message
      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setLoadingState('waiting');
      setTypingMessage("Waiting for response...");

      console.log('🤖 Calling chat-gemini with streaming...');

      // Call with exponential backoff for rate limits
      let response = await retryWithBackoff(
        () => fetch(
          `https://kwsbzfvvmazyhmjgxryo.supabase.co/functions/v1/chat-gemini`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: textToSend })
          }
        )
      );

      // Helper to build structured error
      const buildErr = async (resp: Response) => {
        let code = 'UNKNOWN';
        let msg = `Request failed with status ${resp.status}`;
        let ts: string | undefined;

        try {
          const j = await resp.json();
          msg = j?.error || msg;
          code = j?.code || code;
          ts = j?.timestamp;
        } catch {
          try {
            const t = await resp.text();
            if (t) msg = t.slice(0, 500);
          } catch { /* ignore */ }
        }

        const ref = ts ? new Date(ts).toLocaleTimeString() : new Date().toLocaleTimeString();
        return new Error(`${msg}\n\nError Code: ${code}\nRef: ${ref}`);
      };

      // Handle error responses with specific messages
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('⏱️ Rate limit exceeded. Please wait 30 seconds and try again.');
        }
        if (response.status === 402) {
          throw new Error('💳 AI credits depleted. Add credits in Settings → Workspace → Usage.');
        }

        // Single retry for transient 500-class errors
        if (response.status >= 500) {
          console.log('⚠️ 500 error detected, retrying once...');
          await new Promise(r => setTimeout(r, 800));
          
          const retry = await fetch(
            `https://kwsbzfvvmazyhmjgxryo.supabase.co/functions/v1/chat-gemini`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ message: textToSend })
            }
          );
          
          if (retry.ok) {
            console.log('✅ Retry succeeded');
            response = retry; // Use the retry response for streaming
          } else {
            throw await buildErr(retry);
          }
        } else {
          throw await buildErr(response);
        }
      }

      setLoadingState('streaming');
      setTypingMessage("Streaming response...");

      // Stream response token by token
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream available');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              
              // Update assistant message with streaming content
              setMessages((prev) => 
                prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
              scrollToBottom();
            }
          } catch (e) {
            console.warn('⚠️ Failed to parse SSE chunk:', data);
          }
        }
      }

      console.log('✅ Streaming complete');
      
    } catch (error: any) {
      console.error('❌ Chat error:', error);
      
      // Remove placeholder assistant message on error
      setMessages((prev) => prev.filter(m => m.role !== 'assistant' || m.content));
      
      toast({
        title: "Chat Error",
        description: (
          <div className="space-y-1">
            <p>{(error?.message || 'Failed to send message').split('\n')[0]}</p>
            {error?.message?.includes('Error Code:') && (
              <p className="text-xs opacity-70 mt-1 font-mono">
                {error.message.split('\n').slice(1).join(' · ')}
              </p>
            )}
          </div>
        ),
        variant: "destructive",
      });
      
      errorHandler.handleChatError(
        error instanceof Error ? error : new Error('Failed to send message'),
        { textToSend, conversationLength: messages.length }
      );
    } finally {
      setLoading(false);
      setLoadingState(null);
      setTypingMessage("");
    }
  };

  const handleQuickReply = async (reply: QuickReply) => {
    if (reply.requiresProcessing) {
      await sendMessage(reply.text);
    } else {
      switch (reply.id) {
        case 'upload-evidence':
          setShowFileUpload(true);
          break;
        default:
          await sendMessage(reply.text);
      }
    }
  };

  const handleActionClick = (actionText: string) => {
    sendMessage(actionText);
  };

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        errorHandler.error(
          'Authentication required for file upload',
          'FileUpload'
        );
        return;
      }

      const uid = session.user.id;
      
      // Add user message about uploading files
      const uploadMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `Uploading ${files.length} file${files.length !== 1 ? 's' : ''}: ${files.map(f => f.name).join(', ')}`,
        timestamp: new Date(),
        files: files.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          name: file.name,
          status: "uploading" as const
        }))
      };

      const uploadMsgId = uploadMessage.id;

      setMessages(prev => [...prev, uploadMessage]);

      // Upload and process each file independently
      const results = await Promise.allSettled(
        files.map(async (file, index) => {
          const fileLocalId = uploadMessage.files![index].id;
          const sanitizedName = sanitizeFileName(file.name);
          const path = `${uid}/${Date.now()}-${sanitizedName}`;

          const { error: uploadError } = await supabase.storage
            .from("evidence")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || "application/octet-stream",
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            toast({
              title: "Upload failed",
              description: `${file.name}: ${uploadError.message}`,
              variant: "destructive"
            });
            throw uploadError;
          }

          // Mark this file as processing
          setMessages(prev => prev.map(msg =>
            msg.id === uploadMsgId
              ? {
                  ...msg,
                  files: msg.files?.map(f =>
                    f.id === fileLocalId ? { ...f, status: "processing" as const } : f
                  )
                }
              : msg
          ));

          // Process the file with new simplified function
          const { data: processData, error: processError } = await supabase.functions.invoke("process-file", {
            body: { path }
          });

          if (processError) {
            console.error('Ingest-file error:', processError);
            toast({
              title: "Processing failed",
              description: `${file.name}: ${processError.message}`,
              variant: "destructive"
            });
            throw processError;
          }

          // Check for function-level errors in response
          if (processData?.error) {
            const errMsg = processData.details || processData.error;
            console.error('Ingest-file function error:', errMsg);
            toast({
              title: "Processing failed",
              description: `${file.name}: ${errMsg}`,
              variant: "destructive"
            });
            throw new Error(errMsg);
          }

          // Mark this file as ready
          setMessages(prev => prev.map(msg =>
            msg.id === uploadMsgId
              ? {
                  ...msg,
                  files: msg.files?.map(f =>
                    f.id === fileLocalId ? { ...f, status: "ready" as const } : f
                  )
                }
              : msg
          ));

          return { name: file.name, path };
        })
      );

      // Mark any failed files as error
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          const fileLocalId = uploadMessage.files![i].id;
          setMessages(prev => prev.map(msg =>
            msg.id === uploadMsgId
              ? {
                  ...msg,
                  files: msg.files?.map(f =>
                    f.id === fileLocalId ? { ...f, status: "error" as const } : f
                  )
                }
              : msg
          ));
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      // Save upload message to database
      await supabase.from('messages').insert({
        user_id: uid,
        role: 'user',
        content: uploadMessage.content,
        citations: []
      });

      if (successCount > 0) {
        errorHandler.info(
          `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`,
          'FileUpload',
          { successCount }
        );

        // Add assistant response about the uploaded files
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I've received ${successCount} file${successCount !== 1 ? 's' : ''}. I'll reference them once processing completes.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        await supabase.from('messages').insert({
          user_id: uid,
          role: 'assistant',
          content: assistantMessage.content,
          citations: []
        });
      }

      if (failureCount > 0) {
        errorHandler.error(
          `${failureCount} file${failureCount !== 1 ? 's' : ''} failed to upload`,
          'FileUpload',
          undefined,
          { failureCount }
        );
      }

    } catch (error) {
      errorHandler.handleUploadError(
        error instanceof Error ? error : new Error('Upload failed'),
        files.map(f => f.name).join(', ')
      );

      // Update all file statuses to error for this upload message
      setMessages(prev => prev.map(msg =>
        msg.id === prev[prev.length - 1]?.id
          ? { ...msg, files: msg.files?.map(f => ({ ...f, status: "error" as const })) }
          : msg
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setInput(text);
    // Auto-send voice messages after short delay
    setTimeout(() => {
      if (text.trim()) {
        sendMessage(text);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Friendly Header */}
      <div className="border-b border-border/10 bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Your Legal Assistant</h2>
              <p className="text-sm text-muted-foreground">Here to guide you step-by-step</p>
            </div>
            <CollaborationIndicators />
          </div>
          
          <div className="flex items-center gap-2">
            <CaseShareDialog>
              <Button variant="outline" size="sm" className="gap-2 h-8 rounded-xl">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </CaseShareDialog>
            
            <ConversationExporter 
              messages={messages} 
              caseTitle="Case Discussion"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="h-8 rounded-xl"
            >
              <Search className="w-4 h-4 mr-1" />
              Search
            </Button>
            
            {isModal && onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <ChatSearchBar
          onSearch={searchMessages}
          onClear={() => {
            clearSearch();
            setShowSearch(false);
          }}
          isSearching={isSearching}
        />
      )}

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-6">
        <div className="space-y-6">
          
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Brain className="w-12 h-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-medium mb-2">Welcome to Veronica</h3>
              <p className="text-sm">Your NSW legal assistant for coercive control cases. How can I help you today?</p>
            </div>
          )}
          
          {messages
            .filter(message => 
              !searchResults.length || searchResults.includes(message.id)
            )
            .map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                onActionClick={handleActionClick}
                searchQuery={searchQuery}
                organization={getMessageOrganization(message.id)}
                onBookmarkToggle={toggleBookmark}
                onTagAdd={addTag}
                onTagRemove={removeTag}
              />
            ))}
          
          {loading && (
            <TypingIndicator 
              message={
                loadingState === 'sending' ? 'Sending message...' :
                loadingState === 'waiting' ? 'Waiting for response...' :
                loadingState === 'streaming' ? 'Receiving response...' :
                typingMessage || 'Veronica is thinking...'
              } 
            />
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

        {/* Live Case Insights Sidebar - Desktop Only */}
        <div className="hidden lg:block w-80 border-l overflow-y-auto p-4 space-y-4">
          <LiveCaseInsights />
        </div>
      </div>

      {/* Evidence Preview Modal */}
      {selectedEvidenceId && (
        <EvidencePreview
          fileId={selectedEvidenceId}
          fileName="Evidence"
          trigger={null}
        />
      )}

      {/* Dynamic Action Suggestions */}
      {messages.length > 0 && !loading && messages[messages.length - 1]?.role === 'assistant' && (
        <div className="px-4 pb-2">
          <ActionSuggestions 
            content={messages[messages.length - 1].content}
            onActionClick={(actionText) => sendMessage(actionText)}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/10 bg-background/95 backdrop-blur-sm">
        <div className="p-4 md:p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_INPUT_LENGTH) {
                    setInput(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind... I'm here to help 💙"
                className="min-h-[80px] max-h-32 resize-none rounded-2xl border-border/30 bg-background/80 focus:bg-background text-[15px] leading-relaxed"
                disabled={loading}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {input.length}/{MAX_INPUT_LENGTH}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                size="lg"
                className="h-[80px] w-14 rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <VoiceInput 
              onTranscription={handleVoiceTranscription}
              disabled={loading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="gap-2 rounded-xl"
            >
              <Upload className="h-4 w-4" />
              Upload Evidence
            </Button>
          </div>
          
          {showFileUpload && (
            <div className="mt-4 p-4 border border-border/20 rounded-2xl bg-muted/20">
              <FileUpload 
                onUpload={handleFileUpload} 
                onClose={() => setShowFileUpload(false)} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}