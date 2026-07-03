-- =============================================================================
-- MIDNIGHT CLUB - Seed Carta
-- =============================================================================

-- 1. Limpiar datos actuales para evitar duplicados
DELETE FROM menu_items;
DELETE FROM menu_categories;

-- 2. Insertar Categorías
INSERT INTO menu_categories (id, name, slug, display_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'TRAGOS', 'tragos', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'PACKS', 'packs', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'BAJA GRADUACIÓN', 'baja-graduacion', 3, true),
  ('44444444-4444-4444-4444-444444444444', 'SIN ALCOHOL', 'sin-alcohol', 4, true);

-- 3. Insertar Productos

-- TRAGOS
INSERT INTO menu_items (category_id, name, price, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ABSOLUT MIX', 20000, true),
  ('11111111-1111-1111-1111-111111111111', 'BEEFEATER PINK MIX', 20000, true),
  ('11111111-1111-1111-1111-111111111111', 'BRIGHTON MIX', 15000, true),
  ('11111111-1111-1111-1111-111111111111', 'FERNET BRANCA', 15000, true),
  ('11111111-1111-1111-1111-111111111111', 'SKY MIX', 13750, true);

-- PACKS
INSERT INTO menu_items (category_id, name, price, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', 'BOT. ABSOLUT 4MIX', 100000, true),
  ('22222222-2222-2222-2222-222222222222', 'BOT. BEEFEATER PINK 4MIX', 100000, true),
  ('22222222-2222-2222-2222-222222222222', 'BOT. BRIGHTON 4MIX', 62500, true),
  ('22222222-2222-2222-2222-222222222222', 'BOT. SKY 4MIX', 62500, true);

-- BAJA GRADUACIÓN
INSERT INTO menu_items (category_id, name, price, is_active) VALUES
  ('33333333-3333-3333-3333-333333333333', 'BOT. CHANDON EXTRA BRUT', 61250, true),
  ('33333333-3333-3333-3333-333333333333', 'BOT. VINO NUEVE CUMBRES ROSE', 26250, false),
  ('33333333-3333-3333-3333-333333333333', 'CERVEZA MILLER', 11250, true);

-- SIN ALCOHOL
INSERT INTO menu_items (category_id, name, price, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'AGUA VILLAVICENCIO', 7500, true),
  ('44444444-4444-4444-4444-444444444444', 'CEPITA NARANJA/DURAZNO', 8750, true),
  ('44444444-4444-4444-4444-444444444444', 'COCA COLA REGULAR/ZERO', 8750, true),
  ('44444444-4444-4444-4444-444444444444', 'SPEED', 11250, true),
  ('44444444-4444-4444-4444-444444444444', 'SPRITE', 8750, true);
