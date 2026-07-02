-- =============================================================================
-- MIDNIGHT CLUB - Seed Event
-- =============================================================================

INSERT INTO events (title, description, event_date, is_active, max_tickets_per_member)
VALUES (
  'GRAND OPENING VIP', 
  'Evento inaugural. Acceso sin cargo hasta 2:30 AM presentando este QR en puerta.', 
  NOW() + interval '5 days', 
  true, 
  1
);
