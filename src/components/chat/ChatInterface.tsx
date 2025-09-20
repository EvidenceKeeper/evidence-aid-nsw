import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Settings, ChevronLeft, ChevronRight, Brain, Loader2, Upload, TrendingUp, FileText, Calendar } from 'lucide-react';
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { CaseStrengthDisplay } from "@/components/memory/CaseStrengthDisplay";
import { EvidenceIndexDisplay } from "@/components/memory/EvidenceIndexDisplay";
import { MemoryAwareChat } from "@/components/memory/MemoryAwareChat";
import { useTelepathicContext } from "@/components/memory/TelepathicContextProvider";
import { TelepathicAnnouncementBanner } from "@/components/memory/TelepathicAnnouncementBanner";
import { GoalLockDisplay } from "@/components/memory/GoalLockDisplay";
import { TelepathicModeToggle } from "@/components/memory/TelepathicModeToggle";
import { HallucinationGuard } from "@/components/memory/HallucinationGuard";
import { SpeedQualitySelector } from "@/components/memory/SpeedQualitySelector";
import { TelepathicResponseTemplates } from "@/components/memory/TelepathicResponseTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedMemory } from "@/hooks/useEnhancedMemory";
import { useToast } from "@/hooks/use-toast";
import { useCaseSnapshot } from "@/hooks/useCaseSnapshot";
import { generateDeepDiveAnalysis } from "@/utils/deepDiveAnalysis";
import { useEnhancedMemoryContext } from "@/components/memory/EnhancedMemoryProvider";

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
  const [responseMode, setResponseMode] = useState<'fast' | 'balanced' | 'detailed'>('balanced');
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [mode, setMode] = useState<'user' | 'lawyer'>('user');
  const [memorySidebarOpen, setMemorySidebarOpen] = useState(false);
  const [proactiveTriggersActive, setProactiveTriggersActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { snapshot, refreshSnapshot } = useCaseSnapshot();
  const { caseMemory, updateThreadSummary, runProactiveMemoryTriggers } = useEnhancedMemory();
  const { isMemoryEnabled, announceMemoryUpdate } = useEnhancedMemoryContext();
  const { telepathicMode, addAnnouncement } = useTelepathicContext();

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

    const trimmedInput = input.trim();
    
    // Check for deep dive trigger
    if (trimmedInput.toLowerCase().includes('deep dive')) {
      await handleDeepDive();
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Run proactive memory triggers if enabled
    if (isMemoryEnabled && caseMemory) {
      setProactiveTriggersActive(true);
      try {
        setMemoryLoading(true);
        const proactiveContext = await runProactiveMemoryTriggers(trimmedInput, []);
        if (proactiveContext) {
          announceMemoryUpdate("Found relevant context from your case memory");
        }
      } catch (error) {
        console.error("Proactive memory trigger failed:", error);
      } finally {
        setMemoryLoading(false);
        setProactiveTriggersActive(false);
      }
    }

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
        body: { 
          prompt: trimmedInput, 
          mode,
          responseMode,
          telepathicMode
        }
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

      // Process telepathic announcements from response
      if (data?.announcements && telepathicMode) {
        data.announcements.forEach((announcement: any) => {
          addAnnouncement(announcement);
        });
      }

      // Update thread summary with conversation context
      if (isMemoryEnabled) {
        setMemoryLoading(true);
        try {
          await updateThreadSummary(`Asked: "${trimmedInput}". Response about ${data?.generatedText?.slice(0, 50)}...`);
          announceMemoryUpdate("Conversation context updated in case memory");
        } catch (error) {
          console.error("Failed to update thread summary:", error);
        } finally {
          setMemoryLoading(false);
        }
      }

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

  const handleDeepDive = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const analysis = await generateDeepDiveAnalysis(sessionData.session.user.id);
      
      if (!analysis) {
        const message: Message = {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: "I don't have enough evidence to provide a deep dive analysis yet. Upload some documents or evidence first, and I'll be able to give you a comprehensive overview.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, message]);
        return;
      }

      const deepDiveContent = `**DEEP DIVE ANALYSIS**

**Timeline Spine:**
${analysis.timelineSpine.map(item => `• ${item}`).join('\n')}

**Behavior Patterns:**
${analysis.behaviorPatterns.map(item => `• ${item}`).join('\n')}

**Possible Breaches:**
${analysis.possibleBreaches.map(item => `• ${item}`).join('\n')}

**Risks:**
${analysis.risks.map(item => `• ${item}`).join('\n')}

**Gaps & Quick Fixes:**
${analysis.gapsAndFixes.map(item => `• ${item}`).join('\n')}

**Next Step:** ${analysis.nextStep}`;

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: deepDiveContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Persist message
      await supabase.from("messages").insert({
        user_id: sessionData.session.user.id,
        role: "assistant",
        content: assistantMessage.content,
        citations: []
      });
    } catch (error) {
      console.error("Deep dive analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not generate deep dive analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendPostUploadPrompt = async (userId: string, uploadedFiles: File[], timelineResults: any[], analysisResults: any[]) => {
    try {
      // Get user's goal from case memory for context
      const { data: caseMemory } = await supabase
        .from("case_memory")
        .select("primary_goal")
        .eq("user_id", userId)
        .single();
        
      // Acknowledge file names
      const fileNames = uploadedFiles.map(f => f.name).join(", ");
      
      // Get actual content summary from analysis
      const contentSummary = analysisResults.length > 0 
        ? analysisResults.map(a => a.case_impact || "Evidence processed").join(". ")
        : "Documents processed and analyzed";
      
      // Timeline announcement
      const timelineAnnouncement = timelineResults.length > 0 
        ? `I added ${timelineResults.length} new event(s) from ${uploadedFiles.length === 1 ? uploadedFiles[0].name : 'your files'} to your timeline.`
        : `No new dated events found in ${uploadedFiles.length === 1 ? 'this file' : 'these files'}—kept for your records.`;

      // Create goal-aware intelligent prompt
      let content = "";
      if (caseMemory?.primary_goal) {
        content = `Building on your goal of ${caseMemory.primary_goal}, I've analyzed ${fileNames}. ${contentSummary}. ${timelineAnnouncement}`;
      } else {
        content = `I've processed ${fileNames}. ${contentSummary}. ${timelineAnnouncement}`;
      }
      
      // Add timeline details if events found
      if (timelineResults.length > 0) {
        const eventsList = timelineResults.slice(0, 3).map(e => 
          `${e.event_date}: ${e.title}`
        ).join('\n• ');
        content += `\n\nKey events detected:\n• ${eventsList}`;
        
        if (timelineResults.length > 1) {
          content += "\n\nAdd these to your timeline now?";
        }
      }

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Persist assistant message
      await supabase.from("messages").insert({
        user_id: userId,
        role: "assistant",
        content: assistantMessage.content,
        citations: []
      });

      // Refresh case snapshot after processing
      setTimeout(async () => {
        await refreshSnapshot();
        
        // Offer case snapshot update
        const snapshotMessage: Message = {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: "I've updated your case snapshot with the latest evidence. Want a quick 6-line overview, or jump straight to the next step for your goal?",
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, snapshotMessage]);
        
        await supabase.from("messages").insert({
          user_id: userId,
          role: "assistant",
          content: snapshotMessage.content,
          citations: []
        });
      }, 2000);

    } catch (error) {
      console.error("Post-upload prompt error:", error);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload files.",
        variant: "destructive"
      });
      return;
    }

    const userId = sessionData.session.user.id;
    
    // Get timeline events count before upload
    const { count: timelineBeforeCount } = await supabase
      .from("timeline_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
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

        // Upload to storage with user ID path
        const fileName = `${userId}/${Date.now()}-${file.name}`;
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
            user_id: userId,
          })
          .select()
          .single();

        if (fileError) throw fileError;

        // Index the file using the storage path
        await supabase.functions.invoke("ingest-file", {
          body: { 
            path: fileName,
            bucket: "evidence"
          }
        });

        // Categorize the file
        await supabase.functions.invoke("categorize-file", {
          body: { file_id: fileData.id }
        });

        // Extract timeline events
        await supabase.functions.invoke("extract-timeline", {
          body: { file_id: fileData.id }
        });

        // Start comprehensive evidence analysis
        await supabase.functions.invoke("evidence-intelligence-orchestrator", {
          body: { 
            trigger_type: 'upload',
            file_id: fileData.id 
          }
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

      // Wait a moment for processing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get new timeline events
      const { data: newEvents, count: timelineAfterCount } = await supabase
        .from("timeline_events")
        .select("event_date, title, description, category")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 120000).toISOString()) // Events created in last 2 minutes
        .order("event_date", { ascending: false });
      
      const timelineResults = newEvents || [];
      
      // Get analysis results for content summary
      const { data: analysisResults } = await supabase
        .from("evidence_comprehensive_analysis")
        .select("case_impact, key_insights, synthesis")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 120000).toISOString())
        .order("created_at", { ascending: false });

      // Check for email corpus analysis proactive messages
      const emailAnalysis = analysisResults?.find(a => 
        a.synthesis && 
        typeof a.synthesis === 'object' &&
        a.synthesis !== null
      );

      if (emailAnalysis && emailAnalysis.synthesis) {
        // Send proactive email corpus message
        const synthesis = emailAnalysis.synthesis as any;
        let emailMessage = '';
        
        if (synthesis.behavior_patterns?.length > 0) {
          emailMessage += `I found ${synthesis.behavior_patterns.length} behavior patterns in your email corpus.\n\n`;
        }
        
        if (synthesis.lawyer_summary && typeof synthesis.lawyer_summary === 'string') {
          emailMessage += synthesis.lawyer_summary + '\n\n';
        }
        
        if (timelineResults.length > 0) {
          emailMessage += `I can add ${timelineResults.length} dated events to your timeline now. Proceed?`;
        }
        
        if (emailMessage) {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: emailMessage,
              citations: [],
              timestamp: new Date()
            }
          ]);
        }
      } else {
        // Send intelligent post-upload prompt to assistant for non-email files
        await sendPostUploadPrompt(userId, files, timelineResults, analysisResults || []);
      }

      const timelineMessage = timelineResults.length > 0 
        ? `Found ${timelineResults.length} timeline events.`
        : "No specific dated events found.";

      toast({
        title: "Files uploaded and analyzed",
        description: `Successfully processed ${files.length} file(s). ${timelineMessage}`,
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      // Text files
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/rtf': ['.rtf'],
      // Documents
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      // Images
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.svg'],
      // Audio
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'],
      // Video
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
      // Email files
      'application/vnd.ms-outlook': ['.msg'],
      'message/rfc822': ['.eml'],
      // Archives
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
    },
    multiple: true,
    noClick: true,
  });

  return (
    <div 
      {...getRootProps()}
      className={`flex h-screen bg-background overflow-hidden ${
        isDragActive ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
      }`}
    >
      <input {...getInputProps()} />
      
      {/* Main Chat Area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${memorySidebarOpen ? 'mr-80' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card/60 backdrop-blur shrink-0">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              Veronica, Legal Assistant
              <Brain className={`h-4 w-4 transition-colors ${
                memoryLoading || proactiveTriggersActive ? 'text-primary animate-pulse' : 'text-primary'
              }`} />
              {(memoryLoading || proactiveTriggersActive) && (
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              NSW Family Law & Domestic Violence Specialist • Enhanced Memory {isMemoryEnabled ? 'Active' : 'Disabled'}
            </p>
            {caseMemory?.primary_goal && (
              <p className="text-xs text-primary mt-1">
                Working toward: {caseMemory.primary_goal}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Speed/Quality Selector */}
            {telepathicMode && (
              <SpeedQualitySelector 
                mode={responseMode} 
                onModeChange={setResponseMode}
              />
            )}
            
            {/* Telepathic Mode Toggle */}
            <TelepathicModeToggle />
            
            {/* Memory Sidebar Toggle */}
            {!isModal && isMemoryEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMemorySidebarOpen(!memorySidebarOpen)}
                className="flex items-center gap-2"
              >
                {memorySidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                Memory
              </Button>
            )}
            
            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mode:</span>
              <div className="flex rounded-lg border p-1">
                <button
                  onClick={() => setMode('user')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    mode === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  User
                </button>
                <button
                  onClick={() => setMode('lawyer')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    mode === 'lawyer' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Lawyer
                </button>
              </div>
            </div>
            {isModal && onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Telepathic Announcements */}
        <TelepathicAnnouncementBanner />

        {/* Goal Lock Display */}
        {!isModal && telepathicMode && (
          <div className="p-4 border-b">
            <GoalLockDisplay />
          </div>
        )}
        {!isModal && caseMemory && isMemoryEnabled && (
          <div className="bg-muted/30 border-b px-4 py-2 shrink-0">
            <div className="flex items-center gap-4 text-xs">
              {caseMemory.case_strength_score && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span>Strength: {Math.round(caseMemory.case_strength_score)}%</span>
                </div>
              )}
              {caseMemory.evidence_index?.length && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-blue-600" />
                  <span>{caseMemory.evidence_index.length} exhibits indexed</span>
                </div>
              )}
              {caseMemory.timeline_summary?.length && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-purple-600" />
                  <span>{caseMemory.timeline_summary.length} timeline events</span>
                </div>
              )}
              {proactiveTriggersActive && (
                <div className="flex items-center gap-1 text-primary">
                  <Brain className="h-3 w-3 animate-pulse" />
                  <span>Analyzing context...</span>
                </div>
              )}
              <div className="ml-auto">
                <MemoryAwareChat 
                  onSendMessage={(message) => {
                    setInput(message);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  userQuery={input}
                />
              </div>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {isDragActive && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium text-primary">Drop files to upload</p>
              <p className="text-sm text-muted-foreground">Audio, video, documents, images, and more</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <TelepathicResponseTemplates 
          complexity={messages.length > 10 ? 'complex' : messages.length > 3 ? 'moderate' : 'simple'}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-4">👋 Hi! I'm Veronica, your NSW legal assistant with enhanced memory.</p>
              <p className="text-sm mb-2">Upload files or ask me about your case to get started.</p>
              
              {caseMemory?.primary_goal ? (
                <div className="bg-primary/10 rounded-lg p-4 mb-4 max-w-md mx-auto">
                  <p className="text-sm font-medium text-primary mb-2">I remember your goal:</p>
                  <p className="text-sm">{caseMemory.primary_goal}</p>
                  {caseMemory.case_strength_score && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Current case strength: {Math.round(caseMemory.case_strength_score)}%
                    </p>
                  )}
                </div>
              ) : isMemoryEnabled ? (
                <div className="bg-muted/50 rounded-lg p-4 mb-4 max-w-md mx-auto">
                  <p className="text-sm mb-2">🎯 <strong>Enhanced Memory Features:</strong></p>
                  <div className="text-xs text-left space-y-1">
                    <p>• Vector search across all your evidence</p>
                    <p>• Proactive timeline and person detection</p>
                    <p>• Case strength monitoring with boosters</p>
                    <p>• Goal-focused conversation continuity</p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 mb-4 max-w-md mx-auto">
                  <p className="text-sm mb-2">💡 <strong>Memory System Disabled</strong></p>
                  <p className="text-xs">Enable enhanced memory in settings for advanced features.</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                Supports: Documents, Audio, Video, Images, Emails, Archives
              </p>
              <div className="text-xs text-muted-foreground">
                <p><strong>User Mode:</strong> Warm, supportive guidance focused on one goal</p>
                <p><strong>Lawyer Mode:</strong> Professional analysis with structured findings</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <ChatMessage message={message} />
              {message.role === 'assistant' && telepathicMode && (
                <HallucinationGuard 
                  confidence={0.85} // This would come from AI response metadata
                  sources={message.citations?.length || 0}
                  onRequestClarification={() => {
                    setInput("Can you clarify that last response?");
                  }}
                />
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Veronica is thinking...</span>
              {memoryLoading && (
                <span className="text-xs text-primary">• Memory active</span>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} />
          </div>
        </TelepathicResponseTemplates>

        {/* Input */}
        <div className="p-4 border-t bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-end space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                caseMemory?.primary_goal 
                  ? `Ask about your ${caseMemory.primary_goal} goal, upload evidence, or get legal guidance...`
                  : isMemoryEnabled 
                    ? "Ask about your NSW case, upload evidence, or get legal guidance..."
                    : "Ask about your NSW case or upload evidence..."
              }
              className="min-h-[60px] max-h-32 resize-none"
              disabled={loading}
            />
            
            <div className="flex space-x-1 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                multiple
                accept=".txt,.csv,.rtf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp,.svg,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.avi,.webm,.mkv,.msg,.eml,.zip,.rar"
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
                disabled={loading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Sidebar */}
      {!isModal && isMemoryEnabled && memorySidebarOpen && (
        <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-40 transition-transform duration-300">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Enhanced Memory
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMemorySidebarOpen(false)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Case Strength Display */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Case Strength</h4>
                <CaseStrengthDisplay />
              </div>
              
              {/* Evidence Index Display */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Evidence Index</h4>
                <EvidenceIndexDisplay />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}