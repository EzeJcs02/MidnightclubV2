import { client } from './global.js';
import CONFIG from './config.js';

const AUTH_URL = CONFIG.SUPABASE.AUTH_FUNCTION;

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
          <button type="button" id="togglePassBtn" class="toggle-password" aria-label="Mostrar contraseña">👁️</button>
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
    
    // Double tap protection for large UI links on mobile
    const isMobile = window.innerWidth <= 768;
    const isLargeLink = link.classList.contains('editorial-nav-link') || link.classList.contains('noir-nav-link');
    
    if (isMobile && isLargeLink) {
      const now = Date.now();
      const timeSinceLastTap = now - (window._lastTapTime || 0);
      
      if (window._lastTapNode === link && timeSinceLastTap < 3000) {
        // Second tap - valid. Reset and let it proceed
        window._lastTapNode = null;
      } else {
        // First tap - cancel event to prevent navigation
        e.preventDefault();
        
        window._lastTapNode = link;
        window._lastTapTime = now;
        
        const metaSelector = link.classList.contains('editorial-nav-link') ? '.nav-meta, .mc-item-details' : '.noir-nav-meta';
        const metaSpan = link.querySelector(metaSelector);
        
        if (metaSpan && !link.dataset.originalMeta) {
          link.dataset.originalMeta = metaSpan.innerText;
          metaSpan.innerText = "TOCA DE NUEVO PARA ABRIR";
          metaSpan.style.color = "#cdfb3e";
          
          setTimeout(() => {
            if (window._lastTapNode === link) {
              window._lastTapNode = null;
              metaSpan.innerText = link.dataset.originalMeta;
              metaSpan.style.color = "";
              delete link.dataset.originalMeta;
            }
          }, 3000);
        }
        return; // Stop execution, don't navigate yet
      }
    }
    
    // Si pasamos la protección o no aplica, evaluamos si es SPA
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
        
        // 6. Cerrar menús abiertos
        const overlay = document.getElementById('noirNavOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // 7. Disparar evento para despertar módulos (Supabase)
        window.dispatchEvent(new Event('mc:pageLoaded'));
        
        // 8. Transición de entrada
        document.body.style.animation = 'cinematicFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        
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
    togglePassBtn.textContent = type === 'password' ? '👁️' : '🔒';
  });

  if(inpPass) inpPass.addEventListener('input', function() { this.value = this.value.toUpperCase(); });

  // Login Action - uses secure Edge Function
  async function doLogin() {
    const id = inpId.value.trim().toUpperCase();
    const pass = inpPass.value.trim().toUpperCase();
    btnSubmit.textContent = "VERIFICANDO...";

    try {
      const result = await authRequest('login', { member_id: id, password: pass });

      if (result.success && result.token) {
        // Store secure JWT token and member data
        localStorage.setItem('mc_member_token', result.token);
        localStorage.setItem('mc_member_session', JSON.stringify(result.member));
        window.location.href = 'members-only.html';
      } else {
        btnSubmit.textContent = "ENTRAR";
        card.classList.add('mc-shake');
        setTimeout(() => card.classList.remove('mc-shake'), 500);
        errorMsg.style.display = 'block';
        errorMsg.textContent = result.error || "Datos incorrectos";
        inpPass.value = '';
      }
    } catch (err) {
      console.error('Login error:', err);
      btnSubmit.textContent = "ENTRAR";
      errorMsg.style.display = 'block';
      errorMsg.textContent = "Error de conexión";
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

    btnRecSubmit.textContent = "PROCESANDO...";
    recMsg.style.display = 'none';

    try {
      await authRequest('recovery', { email });

      // Always show generic success message (prevents enumeration)
      // Email is sent from backend via Resend - no client-side email needed
      recMsg.style.display = 'block';
      recMsg.style.color = '#cdfb3e';
      recMsg.innerHTML = "SI EL EMAIL EXISTE, RECIBIRÁS INSTRUCCIONES EN 2-3 MIN<br><span class='opacity-70 text-xs'>REVISÁ TAMBIÉN TU CARPETA DE SPAM</span>";
      btnRecSubmit.textContent = "ENVIADO";

      setTimeout(() => switchView('login'), 4000);
    } catch (err) {
      console.error('Recovery error:', err);
      btnRecSubmit.textContent = "REINTENTAR";
      recMsg.style.display = 'block';
      recMsg.style.color = 'var(--mc-red)';
      recMsg.innerText = err.message || "ERROR DE CONEXIÓN";
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
    <div class="mc-item-row" data-key="${item.key}">
      <a href="${item.url || '#'}" target="_blank" class="mc-item-link block w-full h-full">
        <h2 class="mc-item-title">${item.name || 'Acceso'}</h2>
        <div class="mc-item-details"><span>${item.description || ''}</span></div>
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

// Auto-initialize global navigation and SPA router on all pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGlobalNav);
} else {
  setupGlobalNav();
}
