-- =============================================================================
-- MIDNIGHT CLUB - site_config: agregar columnas que el frontend ya espera
-- =============================================================================
-- shared-ui.js (loadDynamicHero, syncDynamicCards, renderDynamicCards,
-- initCountdown) consulta site_config.url/name/description/is_active/
-- sort_order, pero la tabla solo tenía id/key/value/created_at desde la
-- migración inicial (000). Esas columnas nunca se agregaron, por lo que
-- toda consulta a site_config fallaba con "column does not exist":
--   - loadDynamicHero(): imagen de fondo dinámica (tiene fallback, no se notaba)
--   - syncDynamicCards(): tarjetas de beneficios en accesos.html y en el
--     dashboard de socios (members-only.html) — quedaban ocultas siempre
-- =============================================================================

ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_site_config_key ON site_config(key);
