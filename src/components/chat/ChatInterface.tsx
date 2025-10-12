import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Brain, Loader2, Search, Download, Share2, Upload, Mic, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { IntelligentQuickReplies } from "./IntelligentQuickReplies";
import { TypingIndicator } from "./TypingIndicator";
import { VoiceInput } from "./VoiceInput";
import { ChatSearchBar } from "./ChatSearchBar";
import { SearchResultHighlighter } from "./SearchResultHighlighter";
import { SmartEvidenceSuggestions } from "./SmartEvidenceSuggestions";
import { ConversationExporter } from "./ConversationExporter";
import { EvidencePreview } from "./EvidencePreview";
import { EvidenceDiagnostics } from "./EvidenceDiagnostics";
import { CaseShareDialog } from "@/components/case/CaseShareDialog";
import { CollaborationIndicators } from "@/components/case/CollaborationIndicators";
import { LiveCaseInsights } from "@/components/case/LiveCaseInsights";
import { ProcessingStatusBar } from "./ProcessingStatusBar";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [typingMessage, setTypingMessage] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [processingFiles, setProcessingFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [unprocessedFiles, setUnprocessedFiles] = useState<Array<{ id: string; name: string }>>([]);
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
    
    const initializeChat = async () => {
      setLoading(true);
      
      // Load initial history
      if (mounted) {
        await loadChatHistory();
        await checkUnprocessedFiles();
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
            const formattedMessage: Message = {
              id: newMsg.id,
              role: newMsg.role as "user" | "assistant",
              content: newMsg.content,
              citations: Array.isArray(newMsg.citations) ? (newMsg.citations as unknown as MessageCitation[]) : [],
              timestamp: new Date(newMsg.created_at)
            };
            
            // Append new message to the end
            setMessages(prev => [...prev, formattedMessage]);
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
            timestamp: new Date(msg.created_at)
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

  const checkUnprocessedFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find files that are processed but don't have embeddings
      const { data: files } = await supabase
        .from('files')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'processed');

      if (!files || files.length === 0) return;

      const unprocessed = [];
      for (const file of files) {
        const { data: chunks } = await supabase
          .from('chunks')
          .select('embedding')
          .eq('file_id', file.id)
          .limit(1);

        if (!chunks || chunks.length === 0 || !chunks[0].embedding) {
          unprocessed.push(file);
        }
      }

      setUnprocessedFiles(unprocessed);
    } catch (error) {
      console.error('Error checking unprocessed files:', error);
    }
  };

  const processAllEvidence = async () => {
    if (unprocessedFiles.length === 0) return;

    toast({
      title: "Processing evidence",
      description: `Starting processing for ${unprocessedFiles.length} file(s)...`,
    });

    for (const file of unprocessedFiles) {
      try {
        setProcessingFiles(prev => [...prev, file]);
        
        const { error } = await supabase.functions.invoke('enhanced-memory-processor', {
          body: { file_id: file.id }
        });

        if (error) throw error;
      } catch (error: any) {
        console.error(`Failed to process ${file.name}:`, error);
        toast({
          title: "Processing error",
          description: `Failed to process ${file.name}: ${error.message}`,
          variant: "destructive"
        });
      }
    }

    setUnprocessedFiles([]);
  };

  const sendMessage = async (text?: string) => {
    const textToSend = text || input.trim();
    if (!textToSend && !showFileUpload) return;

    // Show user message immediately
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
    setTypingMessage("Veronica is thinking...");

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
      setTypingMessage("");

      console.log('🤖 Calling chat-gemini with streaming...');

      // Call new streaming edge function
      const response = await fetch(
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

      // Handle error responses with specific messages
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('⏱️ Rate limit exceeded. Please wait 30 seconds and try again.');
        }
        if (response.status === 402) {
          throw new Error('💳 AI credits depleted. Add credits in Settings → Workspace → Usage.');
        }
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

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
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      errorHandler.handleChatError(
        error instanceof Error ? error : new Error('Failed to send message'),
        { textToSend, conversationLength: messages.length }
      );
    } finally {
      setLoading(false);
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

          // Auto-process the file
          const { data: ingestData, error: processError } = await supabase.functions.invoke("ingest-file", {
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
          if (ingestData?.error) {
            const errMsg = ingestData.details || ingestData.error;
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
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-gradient-to-br from-background to-muted/20">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/10 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Veronica Legal Assistant</h3>
            <p className="text-sm text-muted-foreground">NSW Coercive Control Evidence Expert</p>
          </div>
          <CollaborationIndicators />
          {unprocessedFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={processAllEvidence}
              className="gap-2 ml-4"
            >
              <Zap className="h-3 w-3" />
              Process {unprocessedFiles.length} file(s)
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <CaseShareDialog>
            <Button variant="outline" size="sm" className="gap-2 h-8">
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
            className="h-8"
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

      {/* Evidence Diagnostics */}
      <div className="px-4 pt-2">
        <EvidenceDiagnostics onRefresh={checkUnprocessedFiles} />
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Processing Status */}
          {processingFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {processingFiles.map(file => (
                <ProcessingStatusBar
                  key={file.id}
                  fileId={file.id}
                  fileName={file.name}
                  onComplete={() => {
                    setProcessingFiles(prev => prev.filter(f => f.id !== file.id));
                    checkUnprocessedFiles();
                  }}
                />
              ))}
            </div>
          )}
          
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
                searchQuery={searchQuery}
                organization={getMessageOrganization(message.id)}
                onBookmarkToggle={toggleBookmark}
                onTagAdd={addTag}
                onTagRemove={removeTag}
              />
            ))}
          
          {loading && (
            <TypingIndicator message={typingMessage} />
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

        {/* Live Case Insights Sidebar - Desktop Only */}
        <div className="hidden lg:block w-80 border-l overflow-y-auto p-4">
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

      {/* Smart Evidence Suggestions */}
      {messages.length > 0 && !loading && (
        <div className="px-4 pb-2">
          <SmartEvidenceSuggestions 
            recentMessages={messages.slice(-3)}
            onSelectEvidence={(fileId) => setSelectedEvidenceId(fileId)}
          />
        </div>
      )}

      {/* Intelligent Quick Replies */}
      {messages.length > 0 && !loading && (
        <div className="px-4 pb-2">
          <IntelligentQuickReplies 
            conversationContext={{
              lastMessages: messages.slice(-3),
              currentStage: "evidence_gathering",
              hasEvidence: false,
              needsLegalAdvice: true
            }}
            caseMemory={{
              case_strength_score: 0.5,
              evidence_index: [],
              key_facts: []
            }}
            onReplySelect={handleQuickReply}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/10 bg-background/80 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your case, evidence, or legal options..."
                className="min-h-[60px] max-h-32 resize-none pr-12 border-border/20 bg-background/50"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                size="sm"
                className="h-[60px] w-12 p-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              <VoiceInput 
                onTranscription={handleVoiceTranscription}
                disabled={loading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="h-6 w-12 p-0 text-xs"
              >
                📎
              </Button>
            </div>
          </div>
          
          {showFileUpload && (
            <div className="mt-4 p-4 border border-border/20 rounded-lg bg-muted/20">
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