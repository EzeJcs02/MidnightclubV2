# Matriz UI por modulo (MidnightClub-Online)

Alcance: paginas actuales en `/MidnightClub-Online` (excluye `/legacy`).

| Modulo (archivo) | Layout | Tabla | Filtros | Paneles | Estado |
| --- | --- | --- | --- | --- | --- |
| Home (index.html) | `mc-body` + `mc-hero-bg`, `mc-page`, `mc-brand-header`, menu principal `mc-menu-list`, nav `mc-nav` | Sin tabla (menu de links) | — | Login gate `#mc-login-gate` (login + recovery) | Error login `mc-gate-error`, recovery msg, shake en `#mc-login-card`, overlay show/hide, boton PWA `#btnInstallApp` (visible/oculto) |
| Accesos (accesos.html) | `mc-page mc-spacer-top` + listado de cards `mc-item-row`, nav `mc-nav` | Sin tabla (cards) | — | Login gate `#mc-login-gate` | Cards deshabilitadas `item-disabled` + badge SOLD OUT, error login / recovery, overlay show/hide |
| Solicitar ID (members.html) | `mc-page mc-spacer-top` + formulario `#memberForm`, nav `mc-nav` | Sin tabla | — | — | Error `#errorMsg`, exito `#successMsg`, loader `#loader`, submit bloqueado, hide form al exito |
| Panel Member (members-only.html) | `mc-page mc-spacer-top`, header de member, listado `mc-item-row`, seccion seguridad, nav `mc-nav` | Sin tabla | — | — | Cards deshabilitadas `item-disabled` + SOLD OUT, toggle form `#passwordForm`, alerts (password/logout) |
| Carta (carta.html) | `page` + header, `sticky-controls`, `menu-content` con lista dinamica | Sin tabla (lista dinamica) | Search `#searchInput` + clear `#clearSearch`, categorias por acordeon | Modal precios `#priceModalOverlay`, login gate `#mc-login-gate` | Loading `#loading`, no results `#noResults` (incluye error conexion), items `no-stock` + badges, overlay modal open/close |
| FAQ (faq.html) | `mc-page mc-spacer-top` + `faq-container`, nav `mc-nav` | Sin tabla | — | Login gate `#mc-login-gate` | Acordeon `faq-item.active`, error login / recovery |
| Legales (legales.html) | `mc-page mc-spacer-top` con texto legal | Sin tabla | — | — | — |
| Success (success.html) | `mc-page` centrado (success) | Sin tabla | — | — | Mensaje de confirmacion (estatico) |

