-- =============================================================================
-- MIDNIGHT CLUB - Log de escaneos (para el stat "Ingresos Rechazados")
-- =============================================================================
-- tickets-api valida cada QR contra member_tickets/paid_tickets pero nunca
-- persiste el intento en ningún lado: si el scanner rechaza una entrada
-- (ya usada, código inválido, PIN incorrecto), no queda registro. Sin esto
-- es imposible calcular "Ingresos Rechazados" para el dashboard.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ticket_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code TEXT,
  ticket_type TEXT, -- 'member', 'paid', 'unknown'
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  result TEXT NOT NULL, -- 'accepted', 'rejected'
  reason TEXT, -- ej: 'ya usada', 'no encontrada', 'pin incorrecto'
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_at ON ticket_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_result ON ticket_scans(result);

ALTER TABLE ticket_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access ticket_scans" ON ticket_scans;
CREATE POLICY "Service role access ticket_scans" ON ticket_scans
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- DATOS DE PRUEBA (demo) -- reflejan los "used" ya cargados en 013 + algunos
-- intentos rechazados, para que "Ingresos Rechazados" no quede en cero.
-- -----------------------------------------------------------------------------

INSERT INTO ticket_scans (qr_code, ticket_type, event_id, result, reason, scanned_at)
SELECT p.qr_code, 'paid', p.event_id, 'accepted', NULL, p.created_at + interval '1 hour'
FROM paid_tickets p WHERE p.status = 'used';

INSERT INTO ticket_scans (qr_code, ticket_type, event_id, result, reason, scanned_at)
SELECT m.qr_code, 'member', m.event_id, 'accepted', NULL, m.created_at + interval '1 hour'
FROM member_tickets m WHERE m.status = 'used';

INSERT INTO ticket_scans (qr_code, ticket_type, event_id, result, reason, scanned_at)
SELECT 'MC-TICKET-INVALIDO-01', 'unknown', ev.id, 'rejected', 'código no encontrado', NOW() - interval '30 hours'
FROM events ev WHERE ev.title = 'MIDNIGHT CLUB 04.07 (+18) | INGRESO 2:00 AM'
UNION ALL
SELECT 'MC-TICKET-INVALIDO-02', 'unknown', ev.id, 'rejected', 'código no encontrado', NOW() - interval '20 hours'
FROM events ev WHERE ev.title = 'MIDNIGHT CLUB 04.07 (+18) | INGRESO 2:00 AM';

INSERT INTO ticket_scans (qr_code, ticket_type, event_id, result, reason, scanned_at)
SELECT p.qr_code, 'paid', p.event_id, 'rejected', 'entrada ya usada (reintento en puerta)', p.created_at + interval '2 hours'
FROM paid_tickets p WHERE p.status = 'used'
ORDER BY p.created_at
LIMIT 3;
