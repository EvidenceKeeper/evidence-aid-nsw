import { formatDistanceToNow } from "date-fns";
import { Bot, User, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CitationAwareResponse from "@/components/legal/CitationAwareResponse";

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
  legalCitations?: Array<{
    id: string;
    citation_type: 'statute' | 'case_law' | 'regulation' | 'practice_direction' | 'rule';
    short_citation: string;
    full_citation: string;
    neutral_citation?: string;
    court?: string;
    year?: number;
    jurisdiction: string;
    url?: string;
    confidence_score: number;
    content_preview?: string;
  }>;
  timestamp: Date;
  files?: Array<{
    id: string;
    name: string;
    status: "uploading" | "processing" | "ready" | "error";
  }>;
  userQuery?: string;
  consultationId?: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { toast } = useToast();

  const openCitation = async (citation: {
    file_id: string;
    meta?: any;
  }) => {
    try {
      const { data: fileData, error: fileErr } = await supabase
        .from("files")
        .select("storage_path, mime_type, name")
        .eq("id", citation.file_id)
        .single();

      if (fileErr || !fileData?.storage_path) {
        throw fileErr ?? new Error("File not found");
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from("evidence")
        .createSignedUrl(String(fileData.storage_path), 300);

      if (signErr || !signed?.signedUrl) {
        throw signErr ?? new Error("Failed to create signed URL");
      }

      const page = Number(citation?.meta?.page || 1);
      const url = fileData.mime_type === "application/pdf" 
        ? `${signed.signedUrl}#page=${page}` 
        : signed.signedUrl;
        
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("Open citation failed", e);
      toast({
        title: "Unable to open citation",
        description: e?.message ?? "Unknown error",
        variant: "destructive"
      });
    }
  };

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "processing":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "ready":
        return <CheckCircle className="h-3 w-3 text-primary" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-primary/10 text-primary";
      case "error":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        <Card className={`${isUser ? "bg-primary text-primary-foreground border-primary/20" : "bg-card"}`}>
          <CardContent className="p-3">
            {/* Files */}
            {message.files && message.files.length > 0 && (
              <div className="mb-2 space-y-1">
                {message.files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${getFileStatusColor(file.status)}`}
                  >
                    {getFileStatusIcon(file.status)}
                    <span className="truncate">{file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            {/* Content - Use Citation-Aware Response for assistant messages */}
            {!isUser && message.legalCitations ? (
              <CitationAwareResponse
                content={message.content}
                citations={message.legalCitations}
                userQuery={message.userQuery}
                consultationId={message.consultationId}
                className="border-0 shadow-none p-0"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            )}

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                <p className="text-xs font-medium opacity-80">Sources:</p>
                <div className="space-y-1">
                  {message.citations.map((citation) => (
                    <Button
                      key={`${citation.file_id}-${citation.seq}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => openCitation(citation)}
                      className="h-auto p-2 text-left justify-start text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          [{citation.index}] {citation.file_name}#{citation.seq}
                        </div>
                        <div className="opacity-70 line-clamp-2">
                          {citation.excerpt}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className={`text-xs text-muted-foreground ${isUser ? "text-right" : "text-left"}`}>
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}