-- =============================================================================
-- MIDNIGHT CLUB - Entradas pagas (clientes no-socios) + datos de DEMOSTRACIÓN
-- =============================================================================
-- Hasta ahora solo existía member_tickets (entradas QR gratis para socios).
-- Las entradas pagas de clientes normales no tenían ningún registro en la
-- base de datos: se venden hoy por fuera del sistema (link externo aún sin
-- definir en accesos.html) y no hay forma de contarlas ni de escanearlas
-- desde acá.
--
-- Esta migración:
--   1. Crea paid_tickets, la tabla real para trackear esas ventas.
--   2. Carga datos de PRUEBA sobre los eventos reales existentes, solo para
--      poder mostrarle a un cliente cómo se vería el ERP funcionando.
--      Los INSERT de más abajo son descartables: reemplazar por ventas
--      reales (o por la integración con la pasarela de pago que se use)
--      antes de ir a producción con esta funcionalidad.
-- =============================================================================

CREATE TABLE IF NOT EXISTS paid_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  qr_code TEXT UNIQUE,
  status TEXT DEFAULT 'valid', -- 'valid', 'used', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paid_tickets_event ON paid_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_paid_tickets_status ON paid_tickets(status);

ALTER TABLE paid_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access paid_tickets" ON paid_tickets;
CREATE POLICY "Service role access paid_tickets" ON paid_tickets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- DATOS DE PRUEBA (demo para el cliente) -- borrar/reemplazar antes de producción
-- -----------------------------------------------------------------------------

INSERT INTO paid_tickets (event_id, customer_name, amount, qr_code, status, created_at)
SELECT ev.id, d.customer_name, d.amount,
       'MC-PAID-2AM-' || lpad(d.ord::text, 3, '0'),
       d.status,
       NOW() - (d.hours_ago || ' hours')::interval
FROM events ev
CROSS JOIN (VALUES
  (1,  'Lucía Fernández',   15000, 'used',  50),
  (2,  'Martín Gómez',      15000, 'used',  49),
  (3,  'Sofía Ramírez',     15000, 'used',  48),
  (4,  'Tomás Ibáñez',      15000, 'used',  47),
  (5,  'Valentina Torres',  25000, 'used',  46),
  (6,  'Agustín Molina',    15000, 'used',  45),
  (7,  'Camila Herrera',    15000, 'used',  44),
  (8,  'Nicolás Acosta',    15000, 'used',  43),
  (9,  'Julieta Sosa',      25000, 'used',  42),
  (10, 'Franco Villalba',   15000, 'valid', 40),
  (11, 'Micaela Rojas',     15000, 'valid', 38),
  (12, 'Bruno Aguirre',     15000, 'valid', 36),
  (13, 'Renata Godoy',      15000, 'valid', 34),
  (14, 'Ezequiel Paz',      25000, 'valid', 32),
  (15, 'Abril Cabrera',     15000, 'valid', 30),
  (16, 'Thiago Núñez',      15000, 'valid', 28),
  (17, 'Catalina Ortiz',    15000, 'valid', 26),
  (18, 'Joaquín Silva',     15000, 'valid', 24),
  (19, 'Mía Domínguez',     15000, 'valid', 20),
  (20, 'Santino Ríos',      15000, 'valid', 16),
  (21, 'Delfina Castro',    25000, 'valid', 12),
  (22, 'Bautista Luna',     15000, 'valid', 6)
) AS d(ord, customer_name, amount, status, hours_ago)
WHERE ev.title = 'MIDNIGHT CLUB 04.07 (+18) | INGRESO 2:00 AM'
ON CONFLICT (qr_code) DO NOTHING;

INSERT INTO paid_tickets (event_id, customer_name, amount, qr_code, status, created_at)
SELECT ev.id, d.customer_name, d.amount,
       'MC-PAID-3AM-' || lpad(d.ord::text, 3, '0'),
       d.status,
       NOW() - (d.hours_ago || ' hours')::interval
FROM events ev
CROSS JOIN (VALUES
  (1,  'Emilia Vargas',     15000, 'used',  45),
  (2,  'Lautaro Medina',    15000, 'used',  44),
  (3,  'Pilar Guzmán',      25000, 'used',  43),
  (4,  'Benjamín Correa',   15000, 'used',  42),
  (5,  'Zoe Peralta',       15000, 'valid', 38),
  (6,  'Ian Suárez',        15000, 'valid', 34),
  (7,  'Guadalupe Ponce',   15000, 'valid', 30),
  (8,  'Mateo Leiva',       25000, 'valid', 26),
  (9,  'Antonella Juárez',  15000, 'valid', 22),
  (10, 'Ramiro Flores',     15000, 'valid', 18),
  (11, 'Milagros Bravo',    15000, 'valid', 14),
  (12, 'Facundo Campos',    15000, 'valid', 10),
  (13, 'Ariana Quiroga',    25000, 'valid', 6),
  (14, 'Dante Escobar',     15000, 'valid', 3)
) AS d(ord, customer_name, amount, status, hours_ago)
WHERE ev.title = 'MIDNIGHT CLUB 04.07 (+18) | INGRESO 3:00 AM'
ON CONFLICT (qr_code) DO NOTHING;
