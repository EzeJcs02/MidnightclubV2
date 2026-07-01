---
name: mco-logic
description: Skill especializada para la lógica de negocio, integraciones (Supabase, EmailJS) y manejo del estado en el cliente para Midnight Club Online.
---

# Skill: MCO Logic Engineer

> **Proyecto**: Midnight Club Online
> **Rol**: JavaScript Developer & Integrator
> **Misión**: Implementar interactividad robusta, segura y performante sin frameworks pesados.

---

## 1. Principios de Desarrollo

1.  **Vanilla JS Moderno**:
    *   No usar jQuery ni frameworks (React/Vue) a menos que sea estrictamente necesario.
    *   Usar `const`, `let`, `async/await`, `arrow functions`.
    *   Modulos ES6 cuando sea posible, o IIFE para encapsular scripts de página.

2.  **Gestión de Estado (Cliente)**:
    *   **Sesión**: `localStorage.getItem('mc_member_session')`.
    *   **UI State**: Usar clases CSS (`.hidden`, `.active`, `.loading`) para manejar estados visuales. No manipular estilos inline con JS.

3.  **Manejo de Errores**:
    *   Siempre usar bloques `try...catch` en operaciones asíncronas.
    *   Feedback al usuario: Nunca `alert()` nativo (salvo debug). Usar elementos de UI (`#errorMsg`) o Toasts personalizados.

---

## 2. Stack de Integraciones

### Supabase (Backend as a Service)
*   **Cliente**: `@supabase/supabase-js@2` (CDN).
*   **Autenticación**: Custom auth flow contra tabla `members`.
    *   *No usar* Supabase Auth UI pre-built. Usar inputs propios validados contra la tabla.
*   **Consultas**: 
    ```javascript
    const { data, error } = await client
      .from('table_name')
      .select('field')
      .eq('id', value)
      .single();
    ```

### EmailJS
*   Usar para envíos transaccionales (Recupero de contraseña).
*   Manejar promesas con `.then()` o `await`.

---

## 3. Patrones Comunes

### Auth Gate (Protección de Páginas)
Patrón para páginas privadas (`members-only.html`):
```javascript
const session = localStorage.getItem('mc_member_session');
if (!session) {
    window.location.href = 'index.html'; // o mostrar login modal
} else {
    const user = JSON.parse(session);
    // Renderizar contenido protegido
}
```

### Formularios
1.  Prevenir default: `e.preventDefault()`.
2.  Validar inputs antes de enviar.
3.  Deshabilitar botón de envío + Mostrar Spinner durante `await`.
4.  Habilitar y Feedback post-envío.

---

## 4. Estructura de Scripts
Para mantener el orden, scripts complejos deben moverse a `assets/js/<pagina>.js` en lugar de estar inline en el HTML.

```
assets/js/
├── global.js       # Configuración (Supabase Client, Utilidades)
├── members.js      # Lógica de members.html
├── accesos.js      # Lógica de accesos.html
└── ...
```

---

_"Logic is the engine. Design is the bodywork."_
