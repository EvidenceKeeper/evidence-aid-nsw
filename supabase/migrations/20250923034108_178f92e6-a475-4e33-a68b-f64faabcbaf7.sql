-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to automatically process legal documents every 2 minutes
SELECT cron.schedule(
  'auto-process-legal-documents',
  '*/2 * * * *', -- every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://kwsbzfvvmazyhmjgxryo.supabase.co/functions/v1/legal-document-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3c2J6ZnZ2bWF6eWhtamd4cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDc0NzYsImV4cCI6MjA3MDQ4MzQ3Nn0.cJ0_VypyZB3kor1GVIIvM5byOZBTmwf8Sc9CO7qTEuY"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);