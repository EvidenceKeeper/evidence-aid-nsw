-- Reset the PDF to pending status for reprocessing
UPDATE legal_document_processing_queue
SET 
  status = 'pending',
  error_message = NULL,
  started_at = NULL,
  completed_at = NULL
WHERE file_name = 'Detecting and Analyzing Abusive Behavioral Patterns (NSW_Australia Context).pdf';