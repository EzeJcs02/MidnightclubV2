# Estado Presente — Midnight Club Online

> **Última Actualización**: 2026-01-30

---

## Resumen

| Métrica | Valor |
|:--------|:------|
| Páginas funcionalmente activas | 7 (`index.html`, `accesos.html`, `members.html`, `members-only.html`, `carta.html`, `faq.html`, `legales.html`) |
| Integraciones | Supabase (Auth + DB) |
| Estado general | 🚀 Fase 3 (MVP App Funcional) |

---

## Estructura del Proyecto

```
MidnightClub-Online/
├── .agent/
│   ├── skills/
├── assets/
│   ├── css/
│   │   ├── tokens.css       # Design System & Variables
│   │   ├── base.css         # Reset & Typography
│   │   ├── layout.css       # Base Layout Structures
│   │   ├── components.css   # Reusable UI Components
│   │   └── utils.css        # Utility Classes
│   └── js/
│       ├── global.js        # Global Config & Utils
│       ├── supabase-client.js # Supabase Connection Layer
│       ├── shared-ui.js     # UI Shared Functions (Nav, Toast, etc)
│       ├── home.js          # Logic index.html
│       ├── members.js       # Logic members.html (Login/Register)
│       ├── members-only.js  # Logic members-only.html (Dashboard)
│       ├── accesos.js       # Logic accesos.html (Eventos/Entradas)
│       ├── carta.js         # Logic carta.html (Menu Digital)
│       └── faq.js           # Logic faq.html
├── docs/
│   ├── estado-presente.md
│   ├── roadmap.md
│   ├── matriz-modulos-ui.md
│   └── estado_legacy_midnightclub.md
├── index.html          # Landing Page
├── accesos.html        # Venta/Lista de Accesos
├── members.html        # Solicitud de Membresía / Login
├── members-only.html   # Área Privada de Miembros
├── carta.html          # Menú Digital Interactiva
├── faq.html            # Preguntas Frecuentes
├── legales.html        # Términos y Condiciones
└── success.html        # Página de Confirmación Genérica
```

---

## Módulos Activos

| Módulo | Tipo | Descripción | Estado |
|:-------|:-----|:------------|:-------|
| **Landing** (`index`) | Público | Presentación del club, "Gate" visual. | ✅ Activo |
| **Members** (`members`) | Auth | Formulario de solicitud y Login. | ✅ Activo |
| **Dashboard** (`members-only`) | Privado | Panel de usuario, QR de socio, estado de cuenta. | ✅ Activo |
| **Accesos** (`accesos`) | E-comm | Listado de eventos/tickets disponibles. | ✅ Activo |
| **Carta** (`carta`) | Catálogo | Menú digital con buscador y filtros. | ✅ Activo |
| **Info** (`faq`, `legales`) | Estático | Información de soporte y legal. | ✅ Activo |

---

## Notas Técnicas

- **Stack**: HTML5, Vanilla CSS (No Tailwind), Vanilla JS.
- **Backend**: Supabase (via `supabase-client.js`).
- **Auth**: Sistema personalizado usando LocalStorage (`mc_member_session`) validado contra Supabase.
