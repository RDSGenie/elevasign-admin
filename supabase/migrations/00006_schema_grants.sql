-- =============================================================================
-- Migration 00006: GRANT USAGE on signage schema to Supabase roles
-- Required so PostgREST can expose the schema via the API.
-- RLS policies handle row-level access; this just allows schema visibility.
-- =============================================================================

GRANT USAGE ON SCHEMA signage TO anon, authenticated, service_role;

-- Grant table-level permissions (RLS policies then filter rows)
GRANT ALL ON ALL TABLES IN SCHEMA signage TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA signage TO anon;

-- Grant sequence permissions for INSERT operations
GRANT ALL ON ALL SEQUENCES IN SCHEMA signage TO authenticated, service_role;

-- Apply same grants to any tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA signage
  GRANT ALL ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA signage
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA signage
  GRANT ALL ON SEQUENCES TO authenticated, service_role;
