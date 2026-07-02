-- =============================================================================
-- MIDNIGHT CLUB - Drop UNIQUE constraint to allow multiple tickets
-- =============================================================================

ALTER TABLE member_tickets 
DROP CONSTRAINT IF EXISTS member_tickets_member_id_event_id_key;
