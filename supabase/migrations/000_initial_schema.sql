-- =============================================================================
-- MIDNIGHT CLUB - Initial Schema for Test Database
-- =============================================================================

CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT UNIQUE,
  nombre TEXT,
  nacimiento TEXT,
  instagram TEXT,
  telefono TEXT,
  email TEXT,
  access_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  slug TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES menu_categories(id),
  name TEXT,
  description TEXT,
  price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  is_pick BOOLEAN DEFAULT false,
  subcategory TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
