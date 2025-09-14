-- Fix RLS security warning by enabling RLS on tables that don't have it
ALTER TABLE public.nsw_legal_outcomes ENABLE ROW LEVEL SECURITY;

-- Ensure all existing tables have RLS properly enabled
-- Check and enable RLS on any tables that might be missing it

-- Verify these tables have RLS enabled (they should based on previous migrations)
DO $$
BEGIN
    -- Enable RLS on any remaining tables that might not have it
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'nsw_legal_outcomes') THEN
        ALTER TABLE public.nsw_legal_outcomes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;