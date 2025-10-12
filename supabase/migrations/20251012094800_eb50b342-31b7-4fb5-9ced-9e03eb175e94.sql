-- Phase 4: Database Simplification
-- Remove embedding columns and tables no longer needed with new architecture

-- 1. Drop embedding column from chunks table (no longer needed)
ALTER TABLE chunks DROP COLUMN IF EXISTS embedding;

-- 2. Drop evidence_processing_queue table (no longer needed with simplified pipeline)
DROP TABLE IF EXISTS evidence_processing_queue CASCADE;

-- 3. Drop legal_chunks embedding column (full-text search instead)
ALTER TABLE legal_chunks DROP COLUMN IF EXISTS embedding;

-- 4. Add indexes for improved performance with new text-based approach
CREATE INDEX IF NOT EXISTS idx_chunks_file_id_seq ON chunks(file_id, seq);
CREATE INDEX IF NOT EXISTS idx_legal_sections_tsv ON legal_sections USING gin(tsv);
CREATE INDEX IF NOT EXISTS idx_files_user_status ON files(user_id, status);

-- 5. Update chunks table comment to reflect new simplified approach
COMMENT ON TABLE chunks IS 'Stores file content in simple text chunks. Each file typically has one chunk (seq=0) containing full text. No embeddings needed.';

-- 6. Update legal_chunks table comment
COMMENT ON TABLE legal_chunks IS 'Stores NSW legal content chunks for full-text search. Uses tsv column for fast text-based retrieval.';
