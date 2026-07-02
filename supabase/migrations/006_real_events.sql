-- =============================================================================
-- MIDNIGHT CLUB - Real Events Migration
-- =============================================================================

-- 1. Remove mock events
DELETE FROM events;

-- 2. Insert real events for July 4th
INSERT INTO events (id, title, description, event_date, is_active, max_tickets_per_member)
VALUES 
  (
    gen_random_uuid(),
    'MIDNIGHT CLUB 04.07 (+18) | INGRESO 2:00 AM', 
    'Sábado 04 de Julio 2026 - 23:55 hrs. Válido exclusivamente hasta las 2:00 AM.', 
    '2026-07-04 23:55:00-03', 
    true, 
    1
  ),
  (
    gen_random_uuid(),
    'MIDNIGHT CLUB 04.07 (+18) | INGRESO 3:00 AM', 
    'Sábado 04 de Julio 2026 - 23:55 hrs. Válido exclusivamente hasta las 3:00 AM.', 
    '2026-07-04 23:55:00-03', 
    true, 
    1
  );
