-- Fix lawyer_consultations table to allow null lawyer_id for initial requests
ALTER TABLE public.lawyer_consultations 
ALTER COLUMN lawyer_id DROP NOT NULL;