import { formatDistanceToNow } from "date-fns";
import { Bot, User, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CitationAwareResponse from "@/components/legal/CitationAwareResponse";
import { ActionSuggestions } from "./ActionSuggestions";
import { ConversationOrganizer } from "./ConversationOrganizer";
import { SearchResultHighlighter } from "./SearchResultHighlighter";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { LegalDisclaimerAlert } from "./LegalDisclaimerAlert";
import { ResponseReasoning } from "./ResponseReasoning";

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
  confidence_score?: number;
  reasoning?: string;
  verification_status?: 'ai_generated' | 'requires_review' | 'lawyer_verified';
  source_references?: Array<{
    type: 'statute' | 'case_law' | 'regulation' | 'practice_direction' | 'rule';
    citation: string;
    url?: string;
    section?: string;
  }>;
  is_legal_advice?: boolean;
}

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

interface ChatMessageProps {
  message: Message;
  onActionClick?: (actionText: string) => void;
  searchQuery?: string;
  organization?: MessageOrganization;
  onBookmarkToggle?: (messageId: string, bookmarked: boolean) => void;
  onTagAdd?: (messageId: string, tag: ConversationTag) => void;
  onTagRemove?: (messageId: string, tagId: string) => void;
}

export function ChatMessage({ 
  message, 
  onActionClick, 
  searchQuery = "",
  organization,
  onBookmarkToggle,
  onTagAdd,
  onTagRemove 
}: ChatMessageProps) {
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
    <div 
      className={`flex w-full min-w-0 gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      role="article"
      aria-label={`Message from ${message.role === 'user' ? 'you' : 'legal assistant'} ${formatDistanceToNow(message.timestamp, { addSuffix: true })}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={`max-w-[80%] min-w-0 space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        <Card className={`
          ${isUser 
            ? "bg-primary text-primary-foreground border-primary/20 shadow-sm" 
            : "bg-card border-border/20 shadow-sm"
          } 
          rounded-2xl transition-all hover:shadow-md
        `}>
          <CardContent className="p-4 md:p-5" id={`message-content-${message.id}`}>
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
              <SearchResultHighlighter 
                text={message.content}
                searchTerm={searchQuery}
                className="whitespace-pre-wrap break-words text-[15px] leading-relaxed block"
              />
            )}

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2" role="list" aria-label="Source citations">
                <p className="text-xs font-medium opacity-80">Sources:</p>
                <div className="space-y-1">
                  {message.citations.map((citation) => (
                    <Button
                      key={`${citation.file_id}-${citation.seq}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => openCitation(citation)}
                      className="h-auto p-2 text-left justify-start text-xs whitespace-normal break-words"
                      aria-label={`Open citation ${citation.index}: ${citation.file_name}`}
                      role="listitem"
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

            {/* Action Suggestions - Only for assistant messages */}
            {!isUser && onActionClick && (
              <ActionSuggestions 
                content={message.content} 
                onActionClick={onActionClick}
              />
            )}

            {/* Confidence Badge - Only for assistant messages */}
            {!isUser && (message.confidence_score || message.verification_status) && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <ConfidenceBadge 
                  score={message.confidence_score} 
                  verificationStatus={message.verification_status}
                />
              </div>
            )}

            {/* Response Reasoning - Only for assistant messages */}
            {!isUser && (
              <ResponseReasoning 
                reasoning={message.reasoning}
                sourceReferences={message.source_references}
              />
            )}
          </CardContent>
        </Card>

        {/* Legal Disclaimer - Only for assistant messages with legal advice */}
        {!isUser && (
          <LegalDisclaimerAlert 
            isLegalAdvice={message.is_legal_advice}
            verificationStatus={message.verification_status}
          />
        )}
        
        <div className={`flex items-center justify-between text-xs text-muted-foreground ${isUser ? "flex-row-reverse" : ""}`}>
          <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
          
          {organization && onBookmarkToggle && onTagAdd && onTagRemove && (
            <ConversationOrganizer
              messageId={message.id}
              isBookmarked={organization.isBookmarked}
              tags={organization.tags}
              onBookmarkToggle={onBookmarkToggle}
              onTagAdd={onTagAdd}
              onTagRemove={onTagRemove}
            />
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-hidden="true">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}