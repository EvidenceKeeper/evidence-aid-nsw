export interface MessageCitation {
  index: number;
  file_id: string;
  file_name: string;
  seq: number;
  excerpt: string;
  meta: Record<string, unknown>;
}

export interface MessageFile {
  id: string;
  name: string;
  status: "uploading" | "processing" | "ready" | "error";
}

export interface SourceReference {
  type: 'statute' | 'case_law' | 'regulation' | 'practice_direction' | 'rule';
  citation: string;
  url?: string;
  section?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: MessageCitation[];
  timestamp: Date;
  files?: MessageFile[];
  confidence_score?: number;
  reasoning?: string;
  verification_status?: 'ai_generated' | 'requires_review' | 'lawyer_verified';
  source_references?: SourceReference[];
  is_legal_advice?: boolean;
}

export interface ConversationHistory {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantResponse {
  response: string;
  citations?: MessageCitation[];
}

export interface ChatState {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  showFileUpload: boolean;
}

export interface QuickReply {
  id: string;
  text: string;
  requiresProcessing?: boolean;
}