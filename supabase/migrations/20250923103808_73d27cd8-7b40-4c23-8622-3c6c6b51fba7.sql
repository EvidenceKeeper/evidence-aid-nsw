-- Reset legal document processing queue to reprocess failed documents
UPDATE legal_document_processing_queue 
SET status = 'pending', 
    started_at = NULL, 
    completed_at = NULL, 
    error_message = NULL 
WHERE status = 'failed';