import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";

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

interface ChatInterfaceProps {
  isModal?: boolean;
  onClose?: () => void;
}

export function ChatInterface({ isModal = false, onClose }: ChatInterfaceProps) {
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

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        citations: Array.isArray(msg.citations) ? msg.citations as Array<{
          index: number;
          file_id: string;
          file_name: string;
          seq: number;
          excerpt: string;
          meta: any;
        }> : [],
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: input.trim(),
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

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: { prompt: input.trim() }
      });

      if (error) {
        const msg = String(error.message ?? "");
        if (msg.toLowerCase().includes("rate limit")) {
          toast({
            title: "Too many requests",
            description: "Please wait a minute and try again.",
            variant: "destructive"
          });
        } else if (msg.toLowerCase().includes("unauthorized")) {
          toast({
            title: "Please sign in",
            description: "Login is required to use the assistant.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Request failed",
            description: msg || "Unexpected error",
            variant: "destructive"
          });
        }
        return;
      }

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data?.generatedText || "",
        citations: Array.isArray(data?.citations) ? data.citations : [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Persist messages
      const uid = sessionData?.session?.user?.id;
      if (uid) {
        const inserts = [
          {
            user_id: uid,
            role: "user",
            content: userMessage.content
          },
          {
            user_id: uid,
            role: "assistant",
            content: assistantMessage.content,
            citations: assistantMessage.citations
          }
        ];
        
        const { error: insertErr } = await supabase.from("messages").insert(inserts);
        if (insertErr) console.warn("message insert failed", insertErr);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: `Uploaded ${files.length} file(s): ${files.map(f => f.name).join(", ")}`,
      timestamp: new Date(),
      files: files.map(f => ({
        id: Math.random().toString(36).substring(7),
        name: f.name,
        status: "uploading" as const,
      })),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to upload files.",
          variant: "destructive"
        });
        return;
      }

      for (const file of files) {
        // Update file status to processing
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? {
                ...msg,
                files: msg.files?.map(f => 
                  f.name === file.name ? { ...f, status: "processing" } : f
                )
              }
            : msg
        ));

        // Upload to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create file record
        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .insert({
            name: file.name,
            storage_path: fileName,
            mime_type: file.type,
            size: file.size,
            user_id: sessionData.session.user.id,
          })
          .select()
          .single();

        if (fileError) throw fileError;

        // Index the file
        await supabase.functions.invoke("ingest-file", {
          body: { file_id: fileData.id }
        });

        // Categorize the file
        await supabase.functions.invoke("categorize-file", {
          body: { file_id: fileData.id }
        });

        // Update file status to ready
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? {
                ...msg,
                files: msg.files?.map(f => 
                  f.name === file.name ? { ...f, status: "ready" } : f
                )
              }
            : msg
        ));
      }

      toast({
        title: "Files uploaded",
        description: `Successfully uploaded and indexed ${files.length} file(s).`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
      
      // Update file status to error
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? {
              ...msg,
              files: msg.files?.map(f => ({ ...f, status: "error" }))
            }
          : msg
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background ${isModal ? "max-h-[80vh]" : "min-h-screen"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/60 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold">Veronica, Legal Assistant</h1>
          <p className="text-sm text-muted-foreground">NSW Family Law & Domestic Violence Specialist</p>
        </div>
        {isModal && onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-4">👋 Hi! I'm Veronica, your NSW legal assistant.</p>
            <p className="text-sm">Upload files or ask me about your case to get started.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {loading && (
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Veronica is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload */}
      {showFileUpload && (
        <div className="p-4 border-t">
          <FileUpload onUpload={handleFileUpload} onClose={() => setShowFileUpload(false)} />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-card/60 backdrop-blur">
        <div className="flex items-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your NSW case, upload evidence, or get legal guidance..."
            className="min-h-[60px] max-h-32 resize-none"
            disabled={loading}
          />
          
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}