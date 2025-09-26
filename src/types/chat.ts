export interface MessageCitation {
  index: number;
  file_id: string;
  file_name: string;
  seq: number;
  excerpt: string;
  meta: Record<string, any>;
}

export interface MessageFile {
  id: string;
  name: string;
  status: "uploading" | "processing" | "ready" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: MessageCitation[];
  timestamp: Date;
  files?: MessageFile[];
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