-- =============================================================================
-- MIDNIGHT CLUB - Auth Audit Log
-- =============================================================================
-- La Edge Function auth-member inserta registros en "auth_audit_log" desde su
-- despliegue original, pero la tabla nunca fue creada: cada insert fallaba
-- silenciosamente y no había trazabilidad de logins, recoveries ni cambios
-- de contraseña. Esta migración crea la tabla que el código ya espera.
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  member_id TEXT,
  member_uuid UUID,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_member_uuid ON auth_audit_log(member_uuid);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON auth_audit_log;

-- Solo las Edge Functions (service_role) pueden leer/escribir el audit log
CREATE POLICY "Service role full access" ON auth_audit_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
