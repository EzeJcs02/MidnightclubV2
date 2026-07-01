-- =============================================================================
-- MIDNIGHT CLUB - Password Migration Script
-- =============================================================================
-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de:
-- 1. Desplegar la Edge Function auth-member
-- 2. Configurar MEMBER_JWT_SECRET en Supabase secrets
--
-- Este script NO hashea las contraseñas directamente en SQL porque PostgreSQL
-- no tiene bcrypt nativo. Usar el script Node.js en README.md o la función
-- de migración a continuación.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- OPCIÓN A: Crear función PL/pgSQL para marcar passwords pendientes
-- -----------------------------------------------------------------------------

-- Marcar todos los usuarios que necesitan migración
UPDATE members
SET status = 'pending_password_migration'
WHERE access_password_hash IS NULL
  AND access_password IS NOT NULL;

-- Ver cuántos usuarios necesitan migración
SELECT
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE access_password_hash IS NOT NULL) as migrated,
  COUNT(*) FILTER (WHERE access_password_hash IS NULL AND access_password IS NOT NULL) as pending
FROM members;

-- -----------------------------------------------------------------------------
-- OPCIÓN B: Script Node.js (ejecutar externamente)
-- -----------------------------------------------------------------------------
-- Ver README.md para el script completo de migración con bcrypt

-- -----------------------------------------------------------------------------
-- DESPUÉS DE LA MIGRACIÓN: Limpiar columna antigua
-- -----------------------------------------------------------------------------
-- SOLO EJECUTAR DESPUÉS DE VERIFICAR QUE TODOS LOS HASHES ESTÁN CORRECTOS

-- Verificar que no hay passwords sin hash
-- SELECT COUNT(*) FROM members WHERE access_password_hash IS NULL AND access_password IS NOT NULL;

-- Si el count es 0, podemos limpiar (OPCIONAL - mantener backup)
-- ALTER TABLE members DROP COLUMN access_password;

-- O simplemente nullificar (más seguro)
-- UPDATE members SET access_password = NULL WHERE access_password_hash IS NOT NULL;
