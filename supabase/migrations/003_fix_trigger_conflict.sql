-- =============================================================================
-- MIDNIGHT CLUB - Fix Trigger Conflict
-- =============================================================================
-- Este script elimina el trigger automático que está interfiriendo con
-- el Edge Function auth-member. El Edge Function ahora maneja el hashing
-- de passwords con bcrypt desde Deno.
-- =============================================================================

-- 1. DESACTIVAR TRIGGER AUTOMÁTICO
-- El trigger hash_access_password() está causando double-hashing
DROP TRIGGER IF EXISTS trigger_hash_access_password ON members;

-- 2. VERIFICAR FUNCIÓN (para referencia - no la eliminamos por si se usa en otro lado)
-- La función hash_access_password() probablemente usa PostgreSQL pgcrypto
-- pero el Edge Function usa bcrypt con salt rounds específicos

-- 3. VERIFICAR ESTADO DE DATOS
-- Ver cuántos miembros tienen cada tipo de password
SELECT
  COUNT(*) as total,
  COUNT(access_password_hash) FILTER (WHERE access_password_hash IS NOT NULL) as con_hash,
  COUNT(access_password) FILTER (WHERE access_password IS NOT NULL) as con_plaintext,
  COUNT(*) FILTER (WHERE access_password_hash IS NULL AND access_password IS NULL) as sin_password
FROM members;

-- 4. MOSTRAR SAMPLE (primeros 5 miembros para debug)
SELECT
  id,
  member_id,
  email,
  status,
  CASE WHEN access_password_hash IS NOT NULL THEN 'HAS_HASH' ELSE 'NO_HASH' END as hash_status,
  CASE WHEN access_password IS NOT NULL THEN 'HAS_PLAIN' ELSE 'NO_PLAIN' END as plain_status,
  created_at
FROM members
ORDER BY created_at DESC
LIMIT 5;
