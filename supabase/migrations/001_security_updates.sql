-- =============================================================================
-- MIDNIGHT CLUB - Security Migration
-- =============================================================================
-- IMPORTANTE: Ejecutar en orden. Hacer BACKUP antes de ejecutar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ACTUALIZAR TABLA MEMBERS
-- -----------------------------------------------------------------------------

-- Agregar columna para hash de contraseñas
ALTER TABLE members ADD COLUMN IF NOT EXISTS access_password_hash TEXT;

-- Agregar columna de status para control de cuentas
ALTER TABLE members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Crear índice para búsquedas rápidas por member_id
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);

-- Crear índice para búsquedas por email (recovery)
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- -----------------------------------------------------------------------------
-- 2. HABILITAR ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

-- MEMBERS: Solo accesible via service_role (Edge Functions)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes si las hay
DROP POLICY IF EXISTS "Service role full access" ON members;
DROP POLICY IF EXISTS "Anon cannot access members" ON members;

-- Solo service_role puede acceder (las Edge Functions usan service_role)
CREATE POLICY "Service role full access" ON members
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 3. MENU_ITEMS: Lectura pública, escritura restringida
-- -----------------------------------------------------------------------------

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read menu_items" ON menu_items;
DROP POLICY IF EXISTS "Service role write menu_items" ON menu_items;

-- Cualquiera puede leer el menú
CREATE POLICY "Public read menu_items" ON menu_items
  FOR SELECT
  USING (true);

-- Solo service_role puede modificar
CREATE POLICY "Service role write menu_items" ON menu_items
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 4. SITE_CONFIG: Lectura pública, escritura restringida
-- -----------------------------------------------------------------------------

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site_config" ON site_config;
DROP POLICY IF EXISTS "Service role write site_config" ON site_config;

-- Cualquiera puede leer la configuración pública
CREATE POLICY "Public read site_config" ON site_config
  FOR SELECT
  USING (true);

-- Solo service_role puede modificar
CREATE POLICY "Service role write site_config" ON site_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 5. EVENTOS (si existe): Lectura pública
-- -----------------------------------------------------------------------------

-- Verificar si la tabla existe antes de aplicar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eventos') THEN
    ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read eventos" ON eventos;

    CREATE POLICY "Public read eventos" ON eventos
      FOR SELECT
      USING (true);

    CREATE POLICY "Service role write eventos" ON eventos
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. VERIFICACIÓN
-- -----------------------------------------------------------------------------

-- Verificar que RLS está activo
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('members', 'menu_items', 'site_config', 'eventos');

-- Listar policies activas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public';
