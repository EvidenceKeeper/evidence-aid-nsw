# NSW Legal Evidence Manager - Architecture Overview

## System Architecture (2025 - Simplified)

### Core Philosophy
**Simple > Complex**
- Direct text processing (no embeddings)
- Full-text search (no vector similarity)
- Single source of truth (Supabase)
- Streaming responses (real-time UX)

---

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix primitives)
- **State Management**: React Hooks + Context
- **Routing**: React Router v6

### Backend
- **Database**: Supabase Postgres
- **Edge Functions**: Deno (TypeScript)
- **AI**: Lovable AI Gateway (Google Gemini 2.5 Flash)
- **Storage**: Supabase Storage (evidence files)
- **Auth**: Supabase Auth (JWT)

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.54.0",
  "react": "^18.3.1",
  "lucide-react": "^0.462.0",
  "@tanstack/react-query": "^5.83.0"
}
```

---

## System Components

### 1. Chat System (Core Feature)

**Edge Function**: `chat-gemini`
```
User Message → Authenticate → Load Context → Call AI → Stream Response
```

**Context Loaded:**
1. Conversation history (last 50 messages)
2. Case memory (goals, stage, facts)
3. Evidence files (full text, no embeddings)
4. NSW legal sections (full-text search)

**AI Model**: `google/gemini-2.5-flash`
- 2M token context window
- Free during promotional period
- Token-by-token streaming
- ~$0.001 per 1K tokens (after promo)

**Error Handling:**
- 429 → "Rate limit exceeded. Wait 30s."
- 402 → "Credits depleted. Add in Settings."
- 500 → Log full error, show user-friendly message

### 2. File Processing (Evidence)

**Edge Function**: `process-file`
```
File Upload → Download → Extract Text → Store Chunk → Return Success
```

**Supported Formats:**
- ✅ `.txt`, `.md`, `.json` (direct text)
- ✅ `.pdf` (placeholder - recommend conversion)
- ✅ `.docx`, `.xlsx` (future: OCR integration)

**Storage Pattern:**
- Each file → One chunk (seq=0)
- Full text stored in `chunks.text`
- No embeddings generated
- Instant availability (<3 seconds)

### 3. Database Schema (Simplified)

**Core Tables:**

```sql
-- User evidence
files (
  id, user_id, name, storage_path, 
  status, content_type, provenance
)

chunks (
  id, file_id, seq, text, meta
  -- embedding column removed!
)

-- Conversation
messages (
  id, user_id, role, content, 
  created_at
)

-- User journey
case_memory (
  id, user_id, primary_goal, 
  current_stage, key_facts, evidence_index
)

-- NSW legal knowledge
legal_sections (
  id, title, content, citation_reference,
  legal_concepts, tsv -- full-text search
)

legal_chunks (
  id, document_id, chunk_text, 
  citation_references, legal_concepts
  -- embedding column removed!
)
```

**Removed Tables:**
- ❌ `evidence_processing_queue` (no async processing needed)

**Key Indexes:**
```sql
idx_chunks_file_id_seq (file_id, seq)
idx_legal_sections_tsv (tsv) -- GIN index
idx_files_user_status (user_id, status)
```

---

## Data Flow Diagrams

### Chat Flow
```
┌─────────┐
│  User   │
└────┬────┘
     │ Types message
     ▼
┌─────────────┐
│  Frontend   │ Sends message
│ React App   │──────────────┐
└─────────────┘              │
                             ▼
                    ┌─────────────────┐
                    │  chat-gemini    │
                    │  Edge Function  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐       ┌──────────┐
   │ Supabase │        │ Supabase │       │ Lovable  │
   │   DB     │        │ Storage  │       │    AI    │
   │          │        │          │       │ Gateway  │
   └──────────┘        └──────────┘       └──────────┘
         │                   │                   │
         │ Load context      │ Get files         │ Get response
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  SSE Stream     │
                    │  (token by      │
                    │   token)        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────┐
                    │  Frontend   │
                    │  Displays   │
                    │  streaming  │
                    └─────────────┘
```

### File Upload Flow
```
┌─────────┐
│  User   │
└────┬────┘
     │ Selects file
     ▼
┌─────────────┐
│  Frontend   │ Uploads to Storage
└──────┬──────┘
       │
       ▼
┌───────────────┐
│   Supabase    │ Stores file
│   Storage     │
└───────┬───────┘
        │ Triggers
        ▼
┌─────────────────┐
│  process-file   │ Extracts text
│  Edge Function  │
└────────┬────────┘
         │
         ├─────────────┐
         ▼             ▼
   ┌─────────┐   ┌─────────┐
   │  files  │   │ chunks  │
   │  table  │   │  table  │
   └─────────┘   └─────────┘
         │             │
         └──────┬──────┘
                │ Ready!
                ▼
           ┌─────────┐
           │ Frontend│
           │ Notified│
           └─────────┘
```

---

## Security Architecture

### Authentication
- Supabase Auth (email/password)
- JWT tokens in headers
- Row-Level Security (RLS) on all tables

### RLS Policies
```sql
-- Example: Users can only see their own files
CREATE POLICY "Users can view their files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

-- Example: Users can only insert their own messages
CREATE POLICY "Users can create messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Edge Function Security
- JWT verification enabled in `config.toml`
- Environment variables for secrets
- No API keys exposed to client
- CORS headers properly configured

---

## Performance Characteristics

### Response Times (Target)
- File upload → processed: <3 seconds
- Chat message → first token: <1 second  
- Chat message → complete: <5 seconds
- Page load: <2 seconds
- Database queries: <100ms

### Scaling Limits
- **Concurrent users**: 1,000+ (Supabase free tier)
- **Messages per user**: Unlimited (paginated)
- **Files per user**: 1,000+ recommended max
- **File size**: 20MB max per file
- **Context window**: 2M tokens (Gemini)

### Cost Estimates (Monthly)
- **Database**: Free tier (up to 500MB)
- **Storage**: Free tier (up to 1GB)  
- **Edge Functions**: Free tier (500K invocations)
- **AI Calls**: Free during promo, then ~$20/month for moderate use

---

## Deployment

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm run build
# Deploy via Vercel, Netlify, or Lovable
```

### Edge Functions
```bash
# Automatically deployed with code changes
# View logs: Supabase Dashboard → Edge Functions
```

### Database Migrations
```sql
-- Run via Supabase Dashboard → SQL Editor
-- Or via migration tool in Lovable
```

---

## Monitoring & Observability

### Health Checks
- Edge function uptime
- Database connection status
- AI Gateway availability
- Storage bucket access

### Logging
- Edge function logs (Supabase Dashboard)
- Browser console (frontend errors)
- Database audit logs (user_roles, security_events)

### Metrics to Track
- Chat response time (p50, p95, p99)
- File processing success rate
- Error rate by type (429, 402, 500)
- User engagement (messages per session)

---

## Future Enhancements

### Short-term (Q1 2025)
- [ ] PDF OCR integration
- [ ] Voice input/output
- [ ] Mobile responsive improvements
- [ ] Multi-language support

### Medium-term (Q2 2025)
- [ ] Legal form generation
- [ ] Timeline visualization improvements
- [ ] Collaboration features (share cases)
- [ ] Advanced search filters

### Long-term (Q3+ 2025)
- [ ] ML-powered case strength prediction
- [ ] Integration with NSW court systems
- [ ] Lawyer marketplace
- [ ] Mobile native apps

---

## Team & Contacts

### Development
- **Architecture**: [Your Name]
- **AI/ML**: [Your Name]
- **Frontend**: [Your Name]

### Support
- **Docs**: See `/docs` folder
- **Issues**: GitHub Issues
- **Discord**: [Community Link]

---

## References

- [Supabase Docs](https://supabase.com/docs)
- [Lovable AI Docs](https://docs.lovable.dev/features/ai)
- [React Router Docs](https://reactrouter.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [NSW Legislation](https://legislation.nsw.gov.au/)
