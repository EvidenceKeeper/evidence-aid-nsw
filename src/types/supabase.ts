// Additional types for Supabase operations
import { MessageCitation } from './chat';

export interface DatabaseMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: MessageCitation[];
  created_at: string;
}

export interface DatabaseUser {
  id: string;
  email?: string;
  created_at: string;
}

export interface SupabaseAuthSession {
  user: DatabaseUser;
  access_token: string;
  refresh_token: string;
}

export interface FileUploadResult {
  path: string;
  name: string;
  error?: string;
}

export interface EdgeFunctionResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    details?: Record<string, unknown>;
  };
}