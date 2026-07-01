-- Datos de prueba para el entorno de Staging

-- 1. Insertar Miembro de Prueba
-- Contraseña:  123456
-- Hash bcrypt de "123456"
INSERT INTO members (member_id, nombre, nacimiento, instagram, telefono, email, access_password_hash, status)
VALUES (
  'MC-12345',
  'Usuario de Prueba',
  '01/01/2000',
  '@prueba',
  '3874000000',
  'test@midnightclub.com.ar',
  '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa',
  'active'
) ON CONFLICT (member_id) DO NOTHING;

-- 2. Insertar Categorías del Menú
INSERT INTO menu_categories (id, name, slug, display_order)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Tragos de Autor', 'tragos-autor', 1),
  ('22222222-2222-2222-2222-222222222222', 'Clásicos', 'clasicos', 2),
  ('33333333-3333-3333-3333-333333333333', 'Sin Alcohol', 'sin-alcohol', 3)
ON CONFLICT DO NOTHING;

-- 3. Insertar Items del Menú
INSERT INTO menu_items (category_id, name, description, price, is_pick)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Midnight Especial', 'Gin, Frutos Rojos, Tónica, y un toque secreto', 5500, true),
  ('11111111-1111-1111-1111-111111111111', 'Structural Noir', 'Vodka negro, licor de mora, jugo de lima', 6000, false),
  ('22222222-2222-2222-2222-222222222222', 'Negroni', 'Campari, Gin, Vermouth Rosso', 4500, false),
  ('33333333-3333-3333-3333-333333333333', 'Limonada de Menta y Jengibre', 'Refrescante y natural', 2500, false);
