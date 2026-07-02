-- =============================================================================
-- MIDNIGHT CLUB - Member Tickets Schema
-- =============================================================================

-- 1. Tabla de Eventos
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  max_tickets_per_member INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Entradas (Tickets) de Miembros
CREATE TABLE IF NOT EXISTS member_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'valid', -- 'valid', 'used', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, event_id) -- Asegura 1 entrada por socio por evento (si el límite es 1)
);

-- 3. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_member_tickets_member ON member_tickets(member_id);
CREATE INDEX IF NOT EXISTS idx_member_tickets_event ON member_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_member_tickets_qr ON member_tickets(qr_code);

-- 4. Seguridad (Row Level Security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_tickets ENABLE ROW LEVEL SECURITY;

-- Events: Lectura pública (para que el frontend pueda verlos)
DROP POLICY IF EXISTS "Public read events" ON events;
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);

-- Events: Escritura solo Service Role
DROP POLICY IF EXISTS "Service role write events" ON events;
CREATE POLICY "Service role write events" ON events FOR ALL USING (auth.role() = 'service_role');

-- Member Tickets: Lectura pública (para validar JWT y listar en el Edge Function, aunque el Edge usa Service Role)
-- Para mayor seguridad, solo Service Role puede acceder a member_tickets, ya que la API intermedia
DROP POLICY IF EXISTS "Service role access member_tickets" ON member_tickets;
CREATE POLICY "Service role access member_tickets" ON member_tickets FOR ALL USING (auth.role() = 'service_role');
