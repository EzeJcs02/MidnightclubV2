import { requireAuthSync, validateSession, clearSession, getToken } from './global.js';
import CONFIG from './config.js';
import { syncDynamicCards, setupGlobalNav } from './shared-ui.js';

// 1. QUICK SYNC CHECK (blocks unauthorized before page loads)
let memberData = requireAuthSync();
if (!memberData) {
    window.location.href = 'index.html';
    throw new Error("Unauthorized");
}

// Inicializar navegación global y transiciones inmediatamente
setupGlobalNav();

// 2. ASYNC VALIDATION ON LOAD (validates token with server)
async function init() {
    // Ocultar contenido y mostrar loading hasta validación completa
    const mainContent = document.querySelector('.dashboard-content, main, .mc-hero');
    const loadingEl = document.createElement('div');
    loadingEl.id = 'auth-loading';
    loadingEl.style.cssText = `
        position: fixed; inset: 0; 
        background: var(--bg-primary, #0a0a0a); 
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; color: var(--text-muted, #888);
        font-family: 'Manrope', sans-serif;
    `;
    loadingEl.textContent = 'VERIFICANDO SESIÓN...';
    document.body.appendChild(loadingEl);
    
    if (mainContent) mainContent.style.visibility = 'hidden';
    
    try {
        const validMember = await validateSession();
        if (!validMember) {
            clearSession();
            window.location.href = 'index.html';
            return;
        }
        memberData = validMember;
        
        // Remover loading y mostrar contenido
        loadingEl.remove();
        if (mainContent) mainContent.style.visibility = 'visible';
        
        initDashboard();
    } catch (err) {
        console.error('Session validation failed:', err);
        clearSession();
        window.location.href = 'index.html';
    }
}

// Check readyState or listen for DOMContentLoaded to run init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Escuchar evento del Micro-Router (SPA)
window.addEventListener('mc:pageLoaded', () => {
    // Solo correr si estamos realmente en la página del dashboard
    if (document.querySelector('.dashboard-content')) {
        init();
    }
});

function initDashboard() {
    // UI: Mostrar datos usuario
    const firstName = memberData?.nombre?.split(' ')[0] || 'Miembro';
    const elName = document.getElementById('memberName');
    const elId = document.getElementById('memberID');
    
    if(elName) elName.textContent = firstName;
    if(elId) elId.textContent = "ID: " + memberData.member_id;

    // UI: Listeners
    setupChangePassword();
    setupLogout();
    

    // DATA: Sync cards con claves actuales de site_config
    syncDynamicCards({
      'passline_members__capacity': 'card_mem_0000',
      'passline_members__priority_pass': 'card_mem_plus',
      'passline_members_only__vip': 'card_mem_vip'
    });

    // CARGAR ENTRADAS (NUEVO)
    loadTickets();
}

// === TICKET LOGIC ===
async function loadTickets() {
  const container = document.getElementById('eventsContainer');
  if(!container) return;

  try {
    const res = await fetch(CONFIG.SUPABASE.TICKETS_FUNCTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_events', token: getToken() })
    });
    
    const data = await res.json();
    
    if(!data.success) {
      container.innerHTML = `<div style="color:var(--mc-red)">${data.error || 'ERROR CARGANDO EVENTOS'}</div>`;
      return;
    }

    const { events, tickets } = data;
    
    if(!events || events.length === 0) {
      container.innerHTML = `<div style="opacity:0.6; font-size: 0.9rem;">No hay eventos disponibles en este momento.</div>`;
      return;
    }

    container.innerHTML = ''; // Limpiar loader

    const groupedEvents = {};
    events.forEach(ev => {
      const parts = ev.title.split(' | ');
      const baseTitle = parts[0];
      const accessType = parts.length > 1 ? parts[1] : 'INGRESO GENERAL';
      
      if (!groupedEvents[baseTitle]) {
        groupedEvents[baseTitle] = {
          title: baseTitle,
          dateStr: new Date(ev.event_date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(),
          options: []
        };
      }
      groupedEvents[baseTitle].options.push({
        id: ev.id,
        accessType: accessType,
        originalTitle: ev.title,
        description: ev.description
      });
    });

    Object.values(groupedEvents).forEach((group, groupIdx) => {
      const card = document.createElement('div');
      card.className = 'editorial-nav-link';
      card.style.display = 'block';
      card.style.cursor = 'default';

      const meta = document.createElement('span');
      meta.className = 'nav-meta';
      meta.textContent = `0${groupIdx + 1} // ${group.dateStr}`;

      const title = document.createElement('h2');
      title.className = 'nav-title-sm';
      title.textContent = group.title;
      
      const btnWrap = document.createElement('div');
      btnWrap.style.marginTop = '2rem';
      btnWrap.style.display = 'flex';
      btnWrap.style.gap = '1rem';
      btnWrap.style.flexWrap = 'wrap';

      group.options.forEach(opt => {
        const evTickets = tickets.filter(t => t.event_id === opt.id);
        
        evTickets.forEach((ticket, index) => {
          const btn = document.createElement('button');
          btn.style.background = 'transparent';
          btn.style.border = '1px solid rgba(255,255,255,0.5)';
          btn.style.color = '#fff';
          btn.style.fontFamily = "'Space Grotesk', sans-serif";
          btn.style.padding = '1rem 2rem';
          btn.style.cursor = 'pointer';
          btn.style.textTransform = 'uppercase';
          btn.textContent = evTickets.length > 1 ? `VER QR #${index + 1} (${opt.accessType})` : `VER QR (${opt.accessType})`;
          
          btn.onmouseover = () => { btn.style.background = '#fff'; btn.style.color = '#000'; };
          btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#fff'; };
          
          btn.onclick = (e) => {
              e.preventDefault();
              showQR(ticket.qr_code, evTickets.length > 1 ? `${opt.originalTitle} - Entrada #${index + 1}` : opt.originalTitle);
          };
          btnWrap.appendChild(btn);
        });

        // Mostrar botón "SACAR ENTRADA" si aún no alcanzan el límite
        const eventDef = events.find(e => e.id === opt.id);
        const maxTickets = eventDef ? eventDef.max_tickets_per_member : 1;
        
        if (evTickets.length < maxTickets) {
          const btnNew = document.createElement('button');
          btnNew.className = 'mc-gate-btn';
          btnNew.style.width = '220px';
          btnNew.style.background = 'transparent';
          btnNew.style.border = '1px solid #fff';
          btnNew.style.color = '#fff';
          btnNew.textContent = evTickets.length > 0 ? `SACAR OTRA (${opt.accessType})` : `SACAR ENTRADA (${opt.accessType})`;
          
          btnNew.onclick = async () => {
            btnNew.innerHTML = '<span class="loader" style="display:inline-block"></span>';
            try {
              const tkRes = await fetch(CONFIG.SUPABASE.TICKETS_FUNCTION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate_ticket', token: getToken(), event_id: opt.id })
              });
              const tkData = await tkRes.json();
              if(tkData.success) {
                loadTickets(); // Recargar para mostrar "VER QR"
              } else {
                alert(tkData.error || "Error al sacar entrada");
                btnNew.innerHTML = evTickets.length > 0 ? `SACAR OTRA (${opt.accessType})` : `SACAR ENTRADA (${opt.accessType})`;
              }
            } catch(e) {
              alert("Error de conexión");
              btnNew.innerHTML = evTickets.length > 0 ? `SACAR OTRA (${opt.accessType})` : `SACAR ENTRADA (${opt.accessType})`;
            }
          };
          btnWrap.appendChild(btnNew);
        }
      });

      card.appendChild(meta);
      card.appendChild(title);
      card.appendChild(btnWrap);
      container.appendChild(card);
    });

  } catch(err) {
    container.innerHTML = `<div style="color:var(--mc-red)">ERROR DE CONEXIÓN</div>`;
  }
}

function showQR(qrString, title) {
  const modal = document.getElementById('qrModal');
  const wrapper = document.getElementById('qrCodeWrapper');
  document.getElementById('qrEventTitle').textContent = title;
  
  wrapper.innerHTML = '';
  // Generar el QR
  new QRCode(wrapper, {
    text: qrString,
    width: 256,
    height: 256,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  modal.style.display = 'flex';
}

document.getElementById('qrModalClose')?.addEventListener('click', () => {
  document.getElementById('qrModal').style.display = 'none';
});



// === PASSWORD CHANGE LOGIC ===
function setupChangePassword() {
    const toggleSec = document.getElementById('toggleSecurity');
    const passForm = document.getElementById('passwordForm');
    const btnSavePass = document.getElementById('btnSavePass');
    const currentPassInput = document.getElementById('currentPass');
    const newPassInput = document.getElementById('newPass');

    if(!toggleSec || toggleSec.dataset.bound) return;
    toggleSec.dataset.bound = "true";

    toggleSec.addEventListener('click', () => {
      passForm.classList.toggle('open');
      if(passForm.classList.contains('open') && currentPassInput) currentPassInput.focus();
    });

    btnSavePass.addEventListener('click', async () => {
      const currentPass = currentPassInput?.value.trim().toUpperCase() || '';
      const newPass = newPassInput.value.trim().toUpperCase();

      if(newPass.length < 4) { alert("NUEVA CONTRASEÑA: MÍNIMO 4 CARACTERES"); return; }
      if(!currentPass) { alert("INGRESA TU CONTRASEÑA ACTUAL"); return; }

      btnSavePass.innerHTML = '<span class="loader" style="display:inline-block"></span> GUARDANDO...';

      try {
        const response = await fetch(CONFIG.SUPABASE.AUTH_FUNCTION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change-password',
            token: getToken(),
            password: currentPass,
            new_password: newPass
          })
        });

        const result = await response.json();

        if(result.success) {
          alert("CONTRASEÑA ACTUALIZADA - INGRESA NUEVAMENTE");
          clearSession();
          window.location.href = 'index.html';
        } else {
          alert(result.error || "ERROR AL ACTUALIZAR");
          btnSavePass.innerHTML = 'ACTUALIZAR';
        }
      } catch(err) {
        console.error('Password change error:', err);
        alert("ERROR DE CONEXIÓN");
        btnSavePass.innerHTML = 'ACTUALIZAR';
      }
    });
}

// === LOGOUT LOGIC ===
function setupLogout() {
    const btn = document.getElementById('btnLogout');
    if(!btn) return;

    btn.addEventListener('click', () => {
      if(confirm("¿CERRAR SESIÓN?")) {
        clearSession();
        window.location.href = 'index.html';
      }
    });
}
