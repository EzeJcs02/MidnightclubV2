import { requireAuthSync, validateSession, clearSession, getToken } from './global.js';
import CONFIG from './config.js';
import { syncDynamicCards, setupGlobalNav } from './shared-ui.js';

// 1. QUICK SYNC CHECK (blocks unauthorized before page loads)
let memberData = requireAuthSync();
if (!memberData) {
    window.location.href = 'index';
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
            window.location.href = 'index';
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
        window.location.href = 'index';
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
}


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

      btnSavePass.textContent = "GUARDANDO...";

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
          window.location.href = 'index';
        } else {
          alert(result.error || "ERROR AL ACTUALIZAR");
          btnSavePass.textContent = "ACTUALIZAR";
        }
      } catch(err) {
        console.error('Password change error:', err);
        alert("ERROR DE CONEXIÓN");
        btnSavePass.textContent = "ACTUALIZAR";
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
        window.location.href = 'index';
      }
    });
}
