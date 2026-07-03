import { client } from './global.js';
import CONFIG from './config.js';

const AUTH_URL = CONFIG.SUPABASE.AUTH_FUNCTION;

// Escapa texto no confiable antes de interpolarlo en innerHTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : String(str);
  return div.innerHTML;
}

// Solo permite URLs http(s) o relativas; bloquea javascript:, data:, etc.
function safeUrl(url) {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed) || /^[/.]/.test(trimmed)) return trimmed;
  return '#';
}

// Íconos de mostrar/ocultar contraseña (reemplazan los emoji 👁️/🔒)
const ICON_EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.66 19.66 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// Secure auth API call helper
async function authRequest(action, data = {}) {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  });
  
  // Verificar HTTP status antes de parsear
  const result = await response.json().catch(() => ({ error: 'Error de conexión' }));
  
  if (!response.ok) {
    throw new Error(result.error || `Error ${response.status}`);
  }
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result;
}

// Utility: Success pulse animation
export function pulseSuccess(element) {
  if (!element) return;
  element.classList.add('pulse-success');
  element.addEventListener('animationend', () => {
    element.classList.remove('pulse-success');
  }, { once: true });
}

export async function loadDynamicHero() {
  const { data, error } = await client.from('site_config').select('url').eq('key', 'hero_image').maybeSingle();
  if (error) { console.error("Error cargando hero_image:", error); return; }
  if (data && data.url && data.url !== 'default') {
    const bg = document.querySelector('.mc-hero-bg');
    if(bg) bg.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 60%, #000 100%), url('${data.url}')`;
  }
}

const LOGIN_GATE_HTML = `
  <div id="mc-login-gate">
    <div id="mc-login-card">
      <div id="view-login" class="gate-view">
        <div class="mc-gate-title">MEMBER ACCESS</div>
        <input id="loginId" type="text" class="mc-gate-input uppercase" placeholder="ID (Ej: MC-1234)" autocomplete="off" maxlength="9" />
        <div class="password-group">
          <input id="loginPass" type="password" class="mc-gate-input uppercase" placeholder="CONTRASEÑA" autocomplete="off" />
          <button type="button" id="togglePassBtn" class="toggle-password" aria-label="Mostrar contraseña">${ICON_EYE}</button>
        </div>
        <div id="loginError" class="mc-gate-error">Credenciales incorrectas</div>
        <button id="btnLoginSubmit" class="mc-gate-btn">ENTRAR</button>
        <a id="btnGoRecovery" class="mc-link-recovery">Olvidé mi ID / Contraseña</a>
        <button id="btnLoginClose" class="mc-gate-close">Cancelar</button>
      </div>

      <div id="view-recovery" class="gate-view hidden-view">
        <div class="mc-gate-title text-red">RECUPERAR</div>
        <p class="text-grey text-xs mb-20 leading-tight">Ingresa el email con el que te registraste. Te enviaremos una nueva contraseña.</p>
        <input id="recoveryEmail" type="email" class="mc-gate-input" placeholder="TU EMAIL" autocomplete="off" />
        <div id="recoveryMsg" class="mc-gate-error hidden"></div>
        <button id="btnRecoverySubmit" class="mc-gate-btn">ENVIAR NUEVA CLAVE</button>
        <a id="btnBackLogin" class="mc-link-recovery">Volver al Login</a>
      </div>
    </div>
  </div>
`;

const GLOBAL_NAV_HTML = `
  <div class="noir-nav-overlay" id="noirNavOverlay">
    <div class="noir-nav-header">
      <div class="noir-nav-title">MC-SS26</div>
      <button class="noir-nav-close" id="noirNavClose"><span class="material-symbols-outlined">close</span></button>
    </div>
    <div class="noir-nav-content">
      <a href="index.html" class="noir-nav-link">
        <span class="noir-nav-meta">00 // HOME</span>
        <h2 class="noir-nav-title">INICIO</h2>
      </a>
      <a href="accesos.html" class="noir-nav-link">
        <span class="noir-nav-meta">01 // ENTRY</span>
        <h2 class="noir-nav-title">ACCESOS</h2>
      </a>
      <a href="#" data-action="member-login" class="noir-nav-link">
        <span class="noir-nav-meta">02 // AUTH</span>
        <h2 class="noir-nav-title">INICIAR SESIÓN</h2>
      </a>
      <a href="members.html" class="noir-nav-link">
        <span class="noir-nav-meta">03 // REGISTER</span>
        <h2 class="noir-nav-title">SOLICITAR ID</h2>
      </a>
      <a href="carta.html" class="noir-nav-link">
        <span class="noir-nav-meta">04 // MENU</span>
        <h2 class="noir-nav-title">CARTA</h2>
      </a>
      <a href="faq.html" class="noir-nav-link">
        <span class="noir-nav-meta">05 // SUPPORT</span>
        <h2 class="noir-nav-title">FAQ</h2>
      </a>
    </div>
  </div>
`;

const SPOTIFY_HTML = `
  <div class="mc-spotify-widget">
    <iframe style="border-radius:0px;" src="https://open.spotify.com/embed/playlist/2mHlWOV7Ljdi6KIsNytFVc?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  </div>
`;

const INSTALL_BANNER_HTML = `
  <div id="mc-install-banner" class="mc-install-banner" role="dialog" aria-label="Agregar a inicio">
    <div class="mc-install-icon"><img src="assets/images/icon-192.png" alt="" width="48" height="48" /></div>
    <div class="mc-install-text">
      <div class="mc-install-title">Agregá Midnight Club a tu inicio</div>
      <div class="mc-install-sub" id="mc-install-sub"></div>
    </div>
    <button id="mc-install-cta" class="mc-install-cta" type="button" style="display:none;">Instalar</button>
    <button id="mc-install-close" class="mc-install-close" type="button" aria-label="Cerrar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>
`;

function injectGlobalNav() {
  if (!document.getElementById('noirNavOverlay')) {
    document.body.insertAdjacentHTML('beforeend', GLOBAL_NAV_HTML);
  }
  
  // Inject Spotify Widget globally
  if (!document.querySelector('.mc-spotify-widget')) {
    document.body.insertAdjacentHTML('beforeend', SPOTIFY_HTML);
  }

  // Guarantee the login gate exists on all pages
  if (!document.getElementById('mc-login-gate-container')) {
    const container = document.createElement('div');
    container.id = 'mc-login-gate-container';
    document.body.appendChild(container);
  }
  const loginGateContainer = document.getElementById('mc-login-gate-container');
  if (loginGateContainer && !document.getElementById('mc-login-gate')) {
    loginGateContainer.innerHTML = LOGIN_GATE_HTML;
  }
}

export function setupGlobalNav() {
  injectGlobalNav();
  
  // Evitar duplicar listeners globales si ya se inicializó
  if (window._mcGlobalNavBound) return;
  window._mcGlobalNavBound = true;
  
  // ==========================================
  // SPA MICRO-ROUTER & TRANSITIONS
  // ==========================================
  window.addEventListener('popstate', () => {
    navigateSPA(window.location.href, true);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    const target = link.getAttribute('target');

    // ¿Es un link interno? Si sí, navegamos por SPA
    const isInternal = href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#') && target !== '_blank';
    
    if (isInternal) {
      e.preventDefault();
      
      // Evitar recarga si es exactamente la misma página
      const targetUrl = new URL(href, window.location.origin);
      if (window.location.pathname + window.location.search !== targetUrl.pathname + targetUrl.search) {
        navigateSPA(href);
      }
    }
  });

  async function navigateSPA(url, isPopState = false) {
    try {
      // 1. Iniciar transición de salida
      document.body.style.animation = 'cinematicFadeOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      
      // 2. Fetch de la nueva página en background
      const response = await fetch(url);
      if (!response.ok) throw new Error('Red no ok');
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Esperar a que la pantalla esté negra/difuminada (400ms)
      setTimeout(() => {
        // 3. Reemplazar el <main> principal
        const currentMain = document.querySelector('main');
        const newMain = doc.querySelector('main');
        if (currentMain && newMain) {
          currentMain.replaceWith(newMain);
        }
        
        // 4. Actualizar Título e Historial
        document.title = doc.title;
        if (!isPopState) {
          window.history.pushState({}, '', url);
        }
        
        // 5. Inyectar scripts nuevos (si la página tiene un .js que no hemos cargado)
        const currentScripts = Array.from(document.querySelectorAll('script')).map(s => s.getAttribute('src'));
        doc.querySelectorAll('script[type="module"], script[src]').forEach(script => {
          const src = script.getAttribute('src');
          if (src && !currentScripts.includes(src)) {
            const newScript = document.createElement('script');
            newScript.type = script.type || 'text/javascript';
            newScript.src = src;
            document.body.appendChild(newScript);
          }
        });
        
        // 5b. Limpiar estilos SPA anteriores e inyectar los nuevos
        document.querySelectorAll('style.spa-style').forEach(s => s.remove());
        doc.querySelectorAll('style').forEach(style => {
          const newStyle = document.createElement('style');
          newStyle.className = 'spa-style';
          newStyle.textContent = style.textContent;
          document.head.appendChild(newStyle);
        });

        
        // 6. Cerrar menús abiertos
        const overlay = document.getElementById('noirNavOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';

        // 6b. Cerrar el gate de login si había quedado abierto (si no se cierra,
        // queda tapando la página nueva como si toda la web exigiera ser socio)
        const loginGate = document.getElementById('mc-login-gate');
        if (loginGate) {
          loginGate.classList.remove('show');
          loginGate.style.display = 'none';
        }
        
        // 7. Disparar evento para despertar módulos (Supabase)
        window.dispatchEvent(new Event('mc:pageLoaded'));
        
        // 8. Transición de entrada
        document.body.style.animation = 'cinematicFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        // "forwards" deja el transform del último keyframe pegado en <body>,
        // lo que rompe el "position: fixed" de todo lo que se agrega después
        // (login gate, banners). Se limpia apenas termina la animación.
        setTimeout(() => { document.body.style.animation = ''; }, 600);

        // Scroll top
        window.scrollTo(0, 0);
      }, 400);

    } catch (error) {
      console.error('SPA Navigation failed:', error);
      window.location.href = url; // Fallback
    }
  }

  // Event delegation to ensure it always fires regardless of DOM timing
  document.addEventListener('click', (e) => {
    const icon = e.target.closest('.top-app-bar .left .material-symbols-outlined');
    const leftContainer = e.target.closest('.top-app-bar .left');
    const dynamicOverlay = document.getElementById('noirNavOverlay');
    
    // Si hizo clic en el icono "menu" o en el contenedor ".left" que lo incluye
    if ((icon && icon.textContent.trim() === 'menu') || 
        (leftContainer && leftContainer.querySelector('.material-symbols-outlined')?.textContent.trim() === 'menu')) {
      if (dynamicOverlay) dynamicOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    // Cierre del drawer
    if (e.target.closest('#noirNavClose')) {
      if (dynamicOverlay) dynamicOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

function injectLoginGate() {
  const container = document.getElementById('mc-login-gate-container');
  // Solo inyectar si no existe
  if (container && !document.getElementById('mc-login-gate')) {
    container.innerHTML = LOGIN_GATE_HTML;
  }
}

export function setupAuthUI() {
  injectLoginGate();
  
  if (window._mcAuthUIBound) return;
  window._mcAuthUIBound = true;
  
  const gate = document.getElementById('mc-login-gate');
  if (!gate) return; // Login UI not present on this page

  const card = document.getElementById('mc-login-card');
  const viewLogin = document.getElementById('view-login');
  const viewRecovery = document.getElementById('view-recovery');
  const inpId = document.getElementById('loginId');
  const inpPass = document.getElementById('loginPass');
  const btnSubmit = document.getElementById('btnLoginSubmit');
  const errorMsg = document.getElementById('loginError');
  const togglePassBtn = document.getElementById('togglePassBtn');
  const inpRecEmail = document.getElementById('recoveryEmail');
  const btnRecSubmit = document.getElementById('btnRecoverySubmit');
  const recMsg = document.getElementById('recoveryMsg');
  const btnClose = document.getElementById('btnLoginClose');
  const btnGoRec = document.getElementById('btnGoRecovery');
  const btnBackLog = document.getElementById('btnBackLogin');

  async function openLogin() {
    const token = localStorage.getItem('mc_member_token');
    if (token) {
      // Validate existing token before redirect
      try {
        const result = await authRequest('validate', { token });
        if (result.valid) {
          window.location.href = 'members-only.html';
          return;
        }
      } catch (e) {
        // Token invalid, clear it
      }
      localStorage.removeItem('mc_member_token');
      localStorage.removeItem('mc_member_session');
    }
    
    // Close nav overlay if open
    const overlay = document.getElementById('noirNavOverlay');
    if (overlay) overlay.classList.remove('active');
    
    gate.style.display = 'flex';
    setTimeout(() => gate.classList.add('show'), 10);
    inpId.focus();
  }

  // Bind Open Buttons via event delegation for bulletproof execution
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="member-login"]');
    if (btn) {
      e.preventDefault();
      openLogin();
    }
  });

  if(btnClose) btnClose.addEventListener('click', () => {
    gate.classList.remove('show'); 
    setTimeout(() => { gate.style.display = 'none'; switchView('login'); }, 300);
  });

  function switchView(view) {
    if(errorMsg) errorMsg.style.display = 'none'; 
    if(recMsg) recMsg.style.display = 'none'; 
    if(card) card.classList.remove('mc-shake');
    
    if(view === 'recovery') { 
      viewLogin?.classList.add('hidden-view'); 
      viewRecovery?.classList.remove('hidden-view'); 
    } else { 
      viewRecovery?.classList.add('hidden-view'); 
      viewLogin?.classList.remove('hidden-view'); 
    }
  }

  if(btnGoRec) btnGoRec.addEventListener('click', () => switchView('recovery'));
  if(btnBackLog) btnBackLog.addEventListener('click', () => switchView('login'));

  // ID Formatting
  if(inpId) inpId.addEventListener('input', function(e) {
    let val = this.value.toUpperCase();
    if (/^\d/.test(val)) val = 'MC-' + val;
    else if (val.startsWith('MC') && val.length > 2 && val[2] !== '-') val = 'MC-' + val.substring(2);
    this.value = val;
  });

  // Toggle Password
  if(togglePassBtn && inpPass) togglePassBtn.addEventListener('click', () => {
    const type = inpPass.getAttribute('type') === 'password' ? 'text' : 'password';
    inpPass.setAttribute('type', type);
    togglePassBtn.innerHTML = type === 'password' ? ICON_EYE : ICON_EYE_OFF;
    togglePassBtn.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  if(inpPass) inpPass.addEventListener('input', function() { this.value = this.value.toUpperCase(); });

  // Login Action - uses secure Edge Function
  async function doLogin() {
    const id = inpId.value.trim().toUpperCase();
    const pass = inpPass.value.trim().toUpperCase();
    btnSubmit.innerHTML = '<span class="loader" style="display:inline-block"></span>VERIFICANDO...';

    try {
      const result = await authRequest('login', { member_id: id, password: pass });

      if (result.success && result.token) {
        // Store secure JWT token and member data
        localStorage.setItem('mc_member_token', result.token);
        localStorage.setItem('mc_member_session', JSON.stringify(result.member));
        window.location.href = 'members-only.html';
      } else {
        btnSubmit.innerHTML = 'ENTRAR';
        card.classList.add('mc-shake');
        setTimeout(() => card.classList.remove('mc-shake'), 500);
        errorMsg.style.display = 'block';
        errorMsg.textContent = result.error || "Datos incorrectos";
        inpPass.value = '';
      }
    } catch (err) {
      console.error('Login error:', err);
      btnSubmit.innerHTML = 'ENTRAR';
      errorMsg.style.display = 'block';
      errorMsg.textContent = err.message || "Error de conexión";
    }
  }
  if(btnSubmit) btnSubmit.addEventListener('click', doLogin);
  if(inpPass) inpPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSubmit?.click(); });

  // Recovery Action - uses secure Edge Function (no user enumeration)
  async function doRecovery() {
    const email = inpRecEmail.value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) {
      recMsg.style.display = 'block';
      recMsg.style.color = 'var(--mc-red)';
      recMsg.innerText = "INGRESA UN EMAIL VÁLIDO";
      return;
    }

    btnRecSubmit.innerHTML = '<span class="loader" style="display:inline-block"></span>PROCESANDO...';
    recMsg.style.display = 'none';

    try {
      await authRequest('recovery', { email });

      // Always show generic success message (prevents enumeration)
      // Email is sent from backend via Resend - no client-side email needed
      recMsg.style.display = 'block';
      recMsg.style.color = '#cdfb3e';
      recMsg.innerHTML = "SI EL EMAIL EXISTE, RECIBIRÁS INSTRUCCIONES EN 2-3 MIN<br><span class='opacity-70 text-xs'>REVISÁ TAMBIÉN TU CARPETA DE SPAM</span>";
      btnRecSubmit.innerHTML = 'RECUPERAR';

      setTimeout(() => switchView('login'), 4000);
    } catch (err) {
      console.error('Recovery error:', err);
      recMsg.style.display = 'block';
      recMsg.style.color = 'var(--mc-red)';
      recMsg.innerText = err.message || "ERROR DE CONEXIÓN";
      btnRecSubmit.innerHTML = 'RECUPERAR';
    }
  }
  if(btnRecSubmit) btnRecSubmit.addEventListener('click', doRecovery);
}

/**
 * Sincroniza cards dinámicas desde site_config.
 * @param {Object} mapping - Objeto { db_key: dom_card_id }
 */
export async function syncDynamicCards(mapping) {
  const { data, error } = await client.from('site_config').select('*');
  if (error) { console.error("Error sincronizando cards:", error); return; }

  // Primero ocultar todas las cards mapeadas
  Object.values(mapping).forEach(cardId => {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.add('hidden');
      card.classList.remove('is-visible');
    }
  });

  // Recopilar cards activas para animar en secuencia
  const activeCards = [];

  data.forEach(config => {
    const cardId = mapping[config.key];
    if (!cardId) return;

    const card = document.getElementById(cardId);
    if (!card) return;

    // Si está inactivo, mantener oculto
    if (config.is_active === false) {
      card.classList.add('hidden');
      return;
    }

    const titleId = cardId.replace('card_', 'title_');
    const titleEl = document.getElementById(titleId);

    // Update Title
    if (titleEl && config.name) {
      titleEl.textContent = config.name;
    }

    // Update Description (XSS Safe)
    if (config.description) {
      const detailsEl = card.querySelector('.mc-item-details');
      if (detailsEl) {
        detailsEl.textContent = '';
        const span = document.createElement('span');
        span.textContent = config.description;
        detailsEl.appendChild(span);
      }
    }

    // Set URL
    if (config.url && config.url.length > 5) {
      const link = card.tagName === 'A' ? card : card.querySelector('a');
      if (link) link.href = config.url;
    }

    // Preparar para animación
    card.classList.remove('hidden');
    card.style.display = '';
    activeCards.push(card);
  });

  // Mostrar sin efecto escalonado brusco
  activeCards.forEach((card) => {
    card.classList.add('is-visible');
  });
}


/**
 * Genera cards dinámicamente desde site_config.
 * @param {string} containerSelector - Selector CSS del contenedor
 * @param {string} keyPrefix - Prefijo para filtrar keys (ej: 'passline_acceso_')
 */
export async function renderDynamicCards(containerSelector, keyPrefix) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Loading state
  container.innerHTML = '<div class="mc-loading">Cargando...</div>';

  const { data, error } = await client
    .from('site_config')
    .select('*')
    .ilike('key', `${keyPrefix}%`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error cargando accesos:', error);
    container.innerHTML = '<p class="mc-empty-state">Error al cargar</p>';
    return;
  }

  if (!data?.length) {
    container.innerHTML = '<p class="mc-empty-state">No hay accesos disponibles</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="mc-item-row" data-key="${escapeHtml(item.key)}">
      <a href="${escapeHtml(safeUrl(item.url))}" target="_blank" class="mc-item-link block w-full h-full">
        <h2 class="mc-item-title">${escapeHtml(item.name || 'Acceso')}</h2>
        <div class="mc-item-details"><span>${escapeHtml(item.description || '')}</span></div>
        <div class="mc-item-arrow">→</div>
      </a>
    </div>
  `).join('');
}

function disableCard(cardId, titleId) {
  const card = document.getElementById(cardId);
  const title = document.getElementById(titleId);
  if (card && title) {
    card.classList.add('item-disabled');
    const link = card.querySelector('a');
    if (link) { link.removeAttribute('href'); link.style.cursor = "not-allowed"; }
    if (!title.querySelector('.badge-soldout')) {
      const badge = document.createElement('span');
      badge.className = 'badge-soldout';
      badge.textContent = 'SOLD OUT';
      title.appendChild(document.createTextNode(' '));
      title.appendChild(badge);
    }
  }
}

/**
 * Inicializa el contador regresivo del próximo evento.
 * Lee la fecha desde site_config.next_event_id -> events.date
 */
export async function initCountdown() {
  const countdownEl = document.getElementById('eventCountdown');
  if (!countdownEl) return;

  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minsEl = document.getElementById('countdown-mins');
  const secsEl = document.getElementById('countdown-secs');
  const labelEl = countdownEl.querySelector('.mc-countdown-label');

  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  function setValues(d, h, m, s) {
    daysEl.textContent = d;
    hoursEl.textContent = h;
    minsEl.textContent = m;
    secsEl.textContent = s;
  }

  try {
    const rowEl = countdownEl.closest('.mc-countdown-row');
    const showRow = () => { if (rowEl) rowEl.classList.add('ready'); };

    // 1. Obtener el ID del próximo evento desde site_config
    const { data: config, error: cfgErr } = await client
      .from('site_config')
      .select('url')
      .eq('key', 'next_event_id')
      .eq('is_active', true)
      .maybeSingle();

    if (cfgErr || !config?.url) {
      countdownEl.classList.add('no-event');
      setValues('--', '--', '--', '--');
      showRow();
      return;
    }

    // 2. Obtener el evento
    const { data: event, error: evtErr } = await client
      .from('events')
      .select('date, name, event_time')
      .eq('id', config.url)
      .maybeSingle();

    if (evtErr || !event?.date) {
      countdownEl.classList.add('no-event');
      setValues('--', '--', '--', '--');
      showRow();
      return;
    }

    // Combinar fecha + hora (default 23:59 si no hay event_time)
    const eventTime = event.event_time || '23:59:00';
    const eventDate = new Date(`${event.date}T${eventTime}`);

    // 3. Actualizar cada segundo
    function updateCountdown() {
      const now = new Date();
      const diff = eventDate - now;

      if (diff <= 0) {
        // Evento en curso o pasado
        countdownEl.classList.add('is-live');
        countdownEl.classList.remove('no-event');
        setValues('00', '00', '00', '00');
        if (labelEl) labelEl.textContent = 'EN VIVO';
        showRow();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setValues(
        days.toString().padStart(2, '0'),
        hours.toString().padStart(2, '0'),
        mins.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
      );
      
      showRow();
      requestAnimationFrame(() => setTimeout(updateCountdown, 1000));
    }

    updateCountdown();

  } catch (err) {
    console.error('Countdown error:', err);
    countdownEl.classList.add('no-event');
    const rowEl = countdownEl.closest('.mc-countdown-row');
    if (rowEl) rowEl.classList.add('ready');
  }
}

/**
 * Banner de "Agregar a inicio" (PWA). Funciona en Android/Desktop (Chrome/Edge,
 * vía beforeinstallprompt) y en iOS Safari (que no tiene esa API: se muestran
 * instrucciones manuales para "Compartir → Agregar a inicio").
 */
const INSTALL_DISMISS_KEY = 'mc_install_dismissed_at';
const INSTALL_DISMISS_DAYS = 14;

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function setupInstallPrompt() {
  if (isStandaloneApp()) return;
  if (window._mcInstallPromptBound) return;
  window._mcInstallPromptBound = true;

  const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0);
  if (dismissedAt && Date.now() - dismissedAt < INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

  // Registrar manifest, ícono iOS y service worker en cualquier página, no solo index.html
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = 'assets/images/icon-192.png';
    document.head.appendChild(appleIcon);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  const ios = isIOSDevice();
  let deferredPrompt = null;

  function dismiss() {
    const banner = document.getElementById('mc-install-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 300);
    }
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  }

  function showBanner() {
    if (document.getElementById('mc-install-banner') || isStandaloneApp()) return;
    document.body.insertAdjacentHTML('beforeend', INSTALL_BANNER_HTML);

    const sub = document.getElementById('mc-install-sub');
    const cta = document.getElementById('mc-install-cta');

    if (ios) {
      sub.innerHTML = 'Tocá <strong>Compartir</strong> &rarr; "Agregar a inicio"';
    } else {
      sub.textContent = 'Acceso rápido, funciona sin conexión';
      cta.style.display = 'inline-block';
      cta.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        dismiss();
      });
    }

    document.getElementById('mc-install-close').addEventListener('click', dismiss);
    requestAnimationFrame(() => {
      document.getElementById('mc-install-banner')?.classList.add('show');
    });
  }

  if (ios) {
    // Safari no dispara beforeinstallprompt: mostramos las instrucciones directamente
    setTimeout(showBanner, 2500);
  } else {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(showBanner, 1500);
    });
  }
}

// Auto-initialize global navigation and SPA router on all pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { setupGlobalNav(); setupInstallPrompt(); });
} else {
  setupGlobalNav();
  setupInstallPrompt();
}
