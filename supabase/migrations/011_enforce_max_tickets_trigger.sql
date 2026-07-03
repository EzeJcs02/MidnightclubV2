-- =============================================================================
-- MIDNIGHT CLUB - Enforce max_tickets_per_member atomically
-- =============================================================================
-- tickets-api (generate_ticket) valida el límite de entradas por socio
-- contando filas antes de insertar, pero ese "contar y luego insertar" no es
-- atómico: dos requests concurrentes del mismo socio pueden pasar el chequeo
-- antes de que cualquiera inserte, excediendo max_tickets_per_member.
--
-- Este trigger bloquea la fila del evento (FOR UPDATE) para serializar los
-- inserts concurrentes de tickets del mismo evento, y vuelve a validar el
-- límite dentro de la misma transacción del insert.
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_max_tickets_per_member()
RETURNS TRIGGER AS $$
DECLARE
  max_allowed INT;
  current_count INT;
BEGIN
  -- Bloquea la fila del evento hasta que termine esta transacción,
  -- serializando inserts concurrentes de tickets para el mismo evento.
  SELECT max_tickets_per_member INTO max_allowed
  FROM events
  WHERE id = NEW.event_id
  FOR UPDATE;

  IF max_allowed IS NULL THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM member_tickets
  WHERE member_id = NEW.member_id AND event_id = NEW.event_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de entradas alcanzado para este evento' USING ERRCODE = 'MCX01';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_tickets ON member_tickets;

CREATE TRIGGER trg_enforce_max_tickets
  BEFORE INSERT ON member_tickets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_tickets_per_member();
