-- =============================================================================
-- Migration 00007: Add location column to screens table
-- =============================================================================

ALTER TABLE signage.screens
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Grant access to new column (inherits from schema grants but explicit for clarity)
GRANT ALL ON signage.screens TO authenticated, service_role;
