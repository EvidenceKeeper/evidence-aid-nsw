import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Brain, Loader2, MessageCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { IntelligentQuickReplies } from "./IntelligentQuickReplies";
import { ConversationContinuity } from "./ConversationContinuity";
import { useConversationMemory } from "@/hooks/useConversationMemory";
import { useEnhancedMemory } from "@/hooks/useEnhancedMemory";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    index: number;
    file_id: string;
    file_name: string;
    seq: number;
    excerpt: string;
    meta: any;
  }>;
  timestamp: Date;
  files?: Array<{
    id: string;
    name: string;
    status: "uploading" | "processing" | "ready" | "error";
  }>;
}

interface EnhancedChatInterfaceProps {
  isModal?: boolean;
  onClose?: () => void;  
}

export function EnhancedChatInterface({ isModal = false, onClose }: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [hasShownContinuity, setHasShownContinuity] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Enhanced memory hooks
  const { 
    currentThread, 
    conversationContext, 
    isLoadingThread,
    updateThread,
    generateConversationSummary,
    getContinuityMessage 
  } = useConversationMemory();
  
  const { caseMemory, updateThreadSummary } = useEnhancedMemory();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation history with enhanced context
  const loadChatHistory = useCallback(async () => {
    if (!currentThread) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .eq("thread_id", currentThread.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        citations: Array.isArray(msg.citations) ? msg.citations : [],
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);

      // Generate conversation summary for memory
      if (formattedMessages.length > 0) {
        await generateConversationSummary(formattedMessages);
      }

      console.log(`💬 Loaded ${formattedMessages.length} messages for thread ${currentThread.id}`);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, [currentThread, generateConversationSummary]);

  useEffect(() => {
    if (currentThread && !isLoadingThread) {
      loadChatHistory();
    }
  }, [currentThread, isLoadingThread, loadChatHistory]);

  // Show conversation continuity for returning users
  useEffect(() => {
    if (conversationContext && 
        conversationContext.conversationGaps > 1 && 
        !hasShownContinuity && 
        messages.length > 0) {
      setHasShownContinuity(true);
    }
  }, [conversationContext, hasShownContinuity, messages.length]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use the assistant.",
          variant: "destructive"
        });
        return;
      }

      // Enhanced assistant call with conversation context
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: { 
          prompt: textToSend,
          conversationContext: conversationContext,
          threadId: currentThread?.id,
          messages: messages.slice(-10) // Send recent context
        }
      });

      if (error) {
        const msg = String(error.message ?? "");
        toast({
          title: "Request failed",
          description: msg || "Unexpected error",
          variant: "destructive"
        });
        return;
      }

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data?.response || "",
        citations: Array.isArray(data?.citations) ? data.citations : [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation thread
      if (currentThread) {
        await updateThread({
          last_message_at: new Date().toISOString(),
          message_count: (currentThread.message_count || 0) + 2
        });
      }

      // Update memory systems
      await updateThreadSummary(`User: "${textToSend}" | Assistant: "${data?.response?.slice(0, 100)}..."`);

      console.log("📝 Enhanced message exchange completed");
    } catch (error) {
      console.error("Enhanced chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = async (reply: any) => {
    if (reply.requiresProcessing) {
      // These replies need backend processing
      await sendMessage(reply.text);
    } else {
      // These are UI actions
      switch (reply.id) {
        case 'upload-evidence':
          setShowFileUpload(true);
          break;
        default:
          await sendMessage(reply.text);
      }
    }
  };

  const handleContinueConversation = async (action: string) => {
    setHasShownContinuity(true);
    await sendMessage(action);
  };

  const handleStartFresh = () => {
    setHasShownContinuity(true);
    setMessages([]);
    // Could also create a new conversation thread here
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoadingThread) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading conversation memory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[800px] bg-background">
      {/* Enhanced Header with Conversation Info */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Legal Assistant</h2>
          </div>
          {currentThread && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Stage {currentThread.progress_indicators?.stage || 1}
              {conversationContext?.conversationGaps > 1 && (
                <span className="text-xs">
                  • {conversationContext.conversationGaps < 24 ? 'Today' : 
                    conversationContext.conversationGaps < 168 ? 'This week' : 'Previous session'}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          {isModal && onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Conversation Continuity */}
      {conversationContext && !hasShownContinuity && conversationContext.conversationGaps > 1 && (
        <div className="p-4">
          <ConversationContinuity
            conversationContext={conversationContext}
            currentThread={currentThread}
            onContinueConversation={handleContinueConversation}
            onStartFresh={handleStartFresh}
          />
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onActionClick={sendMessage}
            />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Brain className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Intelligent Quick Replies */}
      {!loading && messages.length > 0 && (
        <div className="p-4 border-t border-border/20">
          <IntelligentQuickReplies
            onReplySelect={handleQuickReply}
            conversationContext={conversationContext}
            caseMemory={caseMemory}
            isLoading={loading}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your legal matter..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={loading}
            />
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            size="sm"
            className="h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* File Upload Toggle */}
        <div className="flex items-center justify-between mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="text-xs text-muted-foreground"
          >
            {showFileUpload ? 'Hide' : 'Show'} File Upload
          </Button>
        </div>

        {showFileUpload && (
          <div className="mt-3">
            <FileUpload />
          </div>
        )}
      </div>
    </div>
  );
}