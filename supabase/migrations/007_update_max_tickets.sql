-- =============================================================================
-- MIDNIGHT CLUB - Update max tickets per member
-- =============================================================================

UPDATE events
SET max_tickets_per_member = 5
WHERE title LIKE 'MIDNIGHT CLUB 04.07%';
