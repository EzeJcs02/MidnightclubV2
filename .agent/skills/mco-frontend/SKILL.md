---
name: mco-frontend
description: Skill especializada para el desarrollo frontend de Midnight Club Online. Define el Design System, estándares de UI/UX y maquetado.
---

# Skill: MCO Frontend Developer

> **Proyecto**: Midnight Club Online
> **Rol**: Frontend Designer & Developer
> **Misión**: Crear una interfaz web pública inmersiva, rápida y estéticamente premium ("Nightlife aesthetic").

---

## 1. Principios de Diseño (UI/UX)

1.  **Aesthetic "Red Brutalist"**:
    *   **Base**: Oscura profunda (`#050505` a `#121212`) con texturas sutiles.
    *   **Identidad**: Contraste alto con **Rojo Intenso (#ff1a1a)** y Blanco (#ffffff).
    *   **Feel**: Raw, Street, Outline Typography, Listas verticales grandes.
    *   **Referencia**: Estilo "Mobile Interface", Top Bar informativa, Menús contundentes.

2.  **Performance First**:
    *   Carga instantánea. Crítico para retención.
    *   Uso eficiente de imágenes (WebP).
    *   Animaciones performantes (CSS `transform`, `opacity`, `glitch`).

3.  **Mobile First**:
    *   Todo diseño comienza pensando en pantallas verticales.
    *   Controles táctiles grandes y accesibles.

## 2. Stack Tecnológico

*   **HTML5 Semántico**: Estructura clara y accesible.
*   **Vanilla CSS**:
    *   Variables CSS (Custom Properties) para el Design System.
    *   Flexbox y Grid para layouts.
    *   **NO usar Tailwind**.
*   **Vanilla JS**: Para interactividad ligera.

## 3. Design System (Tokens)

La fuente de verdad de los estilos reside en `assets/css/tokens.css`.

### Colores
*   `--bg-body`: `#050505` (Deep Black)
*   `--primary`: `#ff1a1a` (Intense Red - Brand Color)
*   `--primary-glow`: `rgba(255, 26, 26, 0.6)`
*   `--secondary`: `#ffffff` (Pure White - Text/Outline)
*   `--accent`: `#00f3ff` (Cyan - Ocasional/Contrast)

### Tipografía
*   **Headings**: `Outfit` (Bold, Ultra-Bold, Outline).
*   **Body**: `Inter` (Legible, Clean).

## 4. Estructura de Archivos

```
MidnightClub-Online/
├── assets/
│   ├── css/
│   │   ├── tokens.css      # Variables globales
│   │   ├── base.css        # Reset + Tipografía base
│   │   ├── components.css  # Botones, Cards, Inputs
│   │   ├── layout.css      # Navbar, Footer, Grids
│   │   └── utils.css       # Clases de utilidad (margin, padding, text-align)
│   ├── js/
│   ├── images/
├── index.html
└── ...
```

## 5. Componentes Core

1.  **Neon Button**: Boton con glow sutil, hover state reactivo.
2.  **Glass Card**: Fondo semi-transparente con `backdrop-filter: blur()`.
3.  **Hero Section**: Imagen/Video full-screen con tipografía de impacto.

## 6. Reglas de Desarrollo

1.  **Clases BEM Light**: Usar nomenclatura clara, ej: `.card`, `.card__title`, `.card--featured`.
2.  **Nada de estilos inline**: Todo en archivos CSS.
3.  **Responsividad**: `@media (min-width: 768px)` para Tablet, `@media (min-width: 1024px)` para Desktop.

---

_"Speed. Style. Night."_
