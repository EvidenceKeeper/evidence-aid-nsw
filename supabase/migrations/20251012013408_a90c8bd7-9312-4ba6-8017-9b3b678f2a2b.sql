-- Simplified Pipeline Database Cleanup
-- Remove embedding column and processing queue (no longer needed with Gemini)

-- Drop embedding column from chunks table
ALTER TABLE chunks DROP COLUMN IF EXISTS embedding;

-- Drop evidence processing queue table
DROP TABLE IF EXISTS evidence_processing_queue CASCADE;

-- Add index on chunks for faster text search
CREATE INDEX IF NOT EXISTS idx_chunks_file_seq ON chunks(file_id, seq);

-- Update files table to remove embedding-related metadata
-- Add comment to document new simplified processing
COMMENT ON TABLE files IS 'Evidence files - now processed with simple text extraction (no embeddings)';
COMMENT ON TABLE chunks IS 'Text chunks from evidence files - stored as plain text for inclusion in AI context';