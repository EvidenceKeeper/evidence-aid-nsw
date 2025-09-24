-- Phase 2 Security Hardening: Move Vector Extension Only
-- pg_net doesn't support SET SCHEMA, so we'll only move vector

-- Step 1: Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Grant necessary permissions on extensions schema first
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Step 3: Move only vector extension (pg_net stays in public)
ALTER EXTENSION vector SET SCHEMA extensions;

-- Step 4: Update search path to include extensions schema
ALTER DATABASE postgres SET search_path = public, extensions;

-- Step 5: Grant permissions on all objects in extensions schema
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO anon, authenticated, service_role;

-- Step 6: Update function search paths to ensure they work with new vector schema
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Update match functions to use correct search path
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND proname LIKE 'match_%chunks'
    LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, extensions', 
                      func_record.proname, func_record.args);
    END LOOP;
END $$;