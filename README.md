# Midnight Club Online

Sistema web para club privado con gestión de membresías, accesos y carta de productos.

## Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript ES6+ (Vanilla)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Auth:** JWT custom para members (Supabase Auth reservado para backoffice)
- **Email:** EmailJS para notificaciones

## Estructura del Proyecto

```
├── assets/
│   ├── css/           # Estilos modulares (tokens, base, layout, components, utils)
│   ├── js/            # Módulos ES6
│   └── images/        # Assets estáticos
├── supabase/
│   ├── functions/     # Edge Functions (Deno)
│   └── config.toml    # Configuración Supabase
├── dist/              # Assets minificados (generado por build)
├── legacy/            # Código deprecado (no usar)
└── docs/              # Documentación adicional
```

## Setup Local

### 1. Requisitos
- Node.js >= 18
- Supabase CLI (para Edge Functions)

### 2. Instalación

```bash
# Instalar dependencias de build
npm install

# Build de producción
npm run build
```

### 3. Configuración Supabase

El proyecto usa el proyecto: `iyknbgmcnbpvalvsjxjz`

Para desplegar Edge Functions:
```bash
# Login a Supabase
supabase login

# Desplegar función de autenticación
npm run deploy:functions

# Configurar secretos (en Supabase Dashboard > Settings > Edge Functions)
# MEMBER_JWT_SECRET: [genera un string seguro de 32+ caracteres]
```

## Migración de Base de Datos

### Agregar columna de hash de contraseñas

```sql
-- Agregar columna para hash (las contraseñas actuales están en texto plano)
ALTER TABLE members ADD COLUMN access_password_hash TEXT;

-- Agregar columna status si no existe
ALTER TABLE members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Crear índice para búsquedas por member_id
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
```

### Habilitar Row Level Security

```sql
-- Habilitar RLS en tabla members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Solo service_role puede leer/escribir members
CREATE POLICY "Service role access" ON members
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Usuarios anónimos NO pueden acceder
-- (la autenticación se hace via Edge Function)

-- Habilitar RLS en menu_items (lectura pública)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read menu_items" ON menu_items
  FOR SELECT
  USING (true);

-- Habilitar RLS en site_config (lectura pública)
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_config" ON site_config
  FOR SELECT
  USING (true);
```

### Script de Migración de Contraseñas

Después de desplegar la Edge Function, ejecutar este script para hashear las contraseñas existentes:

```javascript
// Ejecutar desde Supabase SQL Editor o localmente
// IMPORTANTE: Hacer backup antes de ejecutar

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migratePasswords() {
  const { data: members } = await supabase
    .from('members')
    .select('id, access_password')
    .is('access_password_hash', null);

  for (const member of members) {
    if (member.access_password) {
      const hash = await bcrypt.hash(member.access_password.toUpperCase(), 10);
      await supabase
        .from('members')
        .update({ access_password_hash: hash })
        .eq('id', member.id);
    }
  }
  console.log(`Migrated ${members.length} passwords`);
}

migratePasswords();
```

## Variables de Entorno

### Edge Functions (configurar en Supabase Dashboard)

| Variable | Descripción |
|----------|-------------|
| `MEMBER_JWT_SECRET` | Secret para firmar tokens JWT (min 32 chars) |

### Frontend (en `assets/js/config.js`)

Las credenciales de Supabase ANON_KEY son intencionalmente públicas (Row Level Security protege los datos).

## Scripts NPM

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Build completo (CSS + JS minificados) |
| `npm run build:css` | Solo minificar CSS |
| `npm run build:js` | Solo minificar JS |
| `npm run watch` | Watch mode para desarrollo |
| `npm run deploy:functions` | Desplegar Edge Functions |

## Checklist Pre-Producción

- [ ] Ejecutar migración de BD (agregar columnas, RLS)
- [ ] Desplegar Edge Function `auth-member`
- [ ] Configurar `MEMBER_JWT_SECRET` en Supabase
- [ ] Migrar contraseñas existentes a hash
- [ ] Ejecutar `npm run build`
- [ ] Verificar HTTPS en dominio
- [ ] Probar flujo completo: registro → login → cambio pass → recovery

## Arquitectura de Autenticación

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Browser   │──────│  Edge Function   │──────│   Supabase   │
│  (Frontend) │      │  (auth-member)   │      │  (PostgreSQL)│
└─────────────┘      └──────────────────┘      └──────────────┘
       │                      │                       │
       │ 1. Login request     │                       │
       │ (member_id, pass)    │                       │
       │─────────────────────>│                       │
       │                      │ 2. Query member       │
       │                      │─────────────────────>│
       │                      │ 3. Member data        │
       │                      │<─────────────────────│
       │                      │                       │
       │                      │ 4. Verify bcrypt hash │
       │                      │                       │
       │ 5. JWT token         │                       │
       │<─────────────────────│                       │
       │                      │                       │
       │ 6. Store JWT locally │                       │
       │                      │                       │
```

## Seguridad

- Contraseñas hasheadas con bcrypt (cost factor 10)
- JWT con expiración de 24 horas
- RLS activo en todas las tablas
- Sin user enumeration en recovery
- XSS mitigado (no innerHTML con datos externos)
- CORS configurado en Edge Functions

## Contacto

- Email: contacto@midnightclub.com.ar
- Web: https://midnightclub.com.ar
