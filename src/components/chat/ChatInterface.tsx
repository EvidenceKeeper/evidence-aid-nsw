import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Brain, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { IntelligentQuickReplies } from "./IntelligentQuickReplies";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeFileName } from "@/lib/utils";

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

export function ChatInterface({ isModal = false, onClose }: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: historyMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error loading chat history:", error);
        return;
      }

      if (historyMessages && historyMessages.length > 0) {
        const formattedMessages = historyMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          citations: (msg.citations as any[]) || [],
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error in loadChatHistory:", error);
    }
  };

  const sendMessage = async (text?: string) => {
    const textToSend = text || input.trim();
    if (!textToSend && !showFileUpload) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save user message to database
      await supabase.from('messages').insert({
        user_id: user.id,
        role: 'user',
        content: textToSend,
        citations: []
      });

      const { data } = await supabase.functions.invoke('assistant-chat', {
        body: { 
          message: textToSend,
          conversation_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (data?.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          citations: data.citations || [],
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Save assistant message to database
        await supabase.from('messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: data.response,
          citations: data.citations || []
        });
      }
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
        toast({
          title: "Authentication Required",
          description: "Please log in to upload files securely.",
          variant: "destructive"
        });
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

      setMessages(prev => [...prev, uploadMessage]);

      // Upload files to Supabase storage
      const uploadResults = await Promise.all(
        files.map(async (file, index) => {
          const sanitizedName = sanitizeFileName(file.name);
          const path = `${uid}/${Date.now()}-${sanitizedName}`;
          
          const { error } = await supabase.storage
            .from("evidence")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || "application/octet-stream",
            });
          
          if (error) throw error;

          // Update file status to processing
          setMessages(prev => prev.map((msg, msgIndex) => 
            msgIndex === prev.length - 1 ? {
              ...msg,
              files: msg.files?.map((f, fIndex) => 
                fIndex === index ? { ...f, status: "processing" as const } : f
              )
            } : msg
          ));

          // Auto-process the file
          const { error: processError } = await supabase.functions.invoke("ingest-file", {
            body: { path }
          });
          
          if (processError) {
            console.warn("Auto-processing failed:", processError);
            throw processError;
          }
          
          return { name: file.name, path };
        })
      );

      // Update file status to ready
      setMessages(prev => prev.map((msg, msgIndex) => 
        msgIndex === prev.length - 1 ? {
          ...msg,
          files: msg.files?.map(f => ({ ...f, status: "ready" as const }))
        } : msg
      ));

      // Save upload message to database
      await supabase.from('messages').insert({
        user_id: uid,
        role: 'user',
        content: uploadMessage.content,
        citations: []
      });

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${uploadResults.length} files! They're being processed automatically.`,
      });

      // Add assistant response about the uploaded files
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've received your ${uploadResults.length} file${uploadResults.length !== 1 ? 's' : ''} and they're being processed for analysis. Once processing is complete, I'll be able to reference and analyze this evidence in our conversation. How can I help you understand or organize this evidence?`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from('messages').insert({
        user_id: uid,
        role: 'assistant',
        content: assistantMessage.content,
        citations: []
      });

    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Update file status to error
      setMessages(prev => prev.map((msg, msgIndex) => 
        msgIndex === prev.length - 1 ? {
          ...msg,
          files: msg.files?.map(f => ({ ...f, status: "error" as const }))
        } : msg
      ));

      toast({
        title: "Upload Failed",
        description: `Upload failed: ${error?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
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
        </div>
        
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

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Brain className="w-12 h-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-medium mb-2">Welcome to Veronica</h3>
              <p className="text-sm">Your NSW legal assistant for coercive control cases. How can I help you today?</p>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

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