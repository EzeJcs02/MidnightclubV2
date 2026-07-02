import CONFIG from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  
  const adminPass = document.getElementById('adminPass');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  
  const statMembers = document.getElementById('statMembers');
  const statValid = document.getElementById('statValid');
  const statUsed = document.getElementById('statUsed');
  
  const eventsTableBody = document.getElementById('eventsTableBody');
  const btnOpenNewEvent = document.getElementById('btnOpenNewEvent');
  
  const newEventModal = document.getElementById('newEventModal');
  const btnCancelEvent = document.getElementById('btnCancelEvent');
  const btnSaveEvent = document.getElementById('btnSaveEvent');

  let adminToken = localStorage.getItem('mc_admin_token') || null;

  // Init
  if (adminToken) {
    showDashboard();
  } else {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
  }

  // --- 1. LOGIN ---
  btnLogin.addEventListener('click', async () => {
    const password = adminPass.value;
    btnLogin.innerHTML = 'VERIFICANDO...';
    try {
      const res = await fetch(CONFIG.SUPABASE.ADMIN_FUNCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', payload: { password } })
      });
      const data = await res.json();
      if (data.success) {
        adminToken = data.token;
        localStorage.setItem('mc_admin_token', adminToken);
        showDashboard();
      } else {
        alert(data.error || 'Acceso denegado');
      }
    } catch(e) {
      alert('Error de conexión');
    }
    btnLogin.innerHTML = 'INGRESAR AL PANEL';
  });

  btnLogout.addEventListener('click', () => {
    adminToken = null;
    localStorage.removeItem('mc_admin_token');
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
    adminPass.value = '';
  });

  // --- 2. DASHBOARD ---
  async function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    loadStats();
    loadEvents();
  }

  async function adminFetch(action, payload = {}) {
    const res = await fetch(CONFIG.SUPABASE.ADMIN_FUNCTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token: adminToken, payload })
    });
    const data = await res.json();
    if (!data.success && data.error && data.error.includes('denegado')) {
      btnLogout.click(); // Expired token
      throw new Error("Token expired");
    }
    return data;
  }

  async function loadStats() {
    try {
      const data = await adminFetch('get_stats');
      if (data.success) {
        statMembers.textContent = data.stats.members;
        statValid.textContent = data.stats.validTickets;
        statUsed.textContent = data.stats.usedTickets;
      }
    } catch(e) { console.error("Error loading stats", e); }
  }

  async function loadEvents() {
    try {
      eventsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando eventos...</td></tr>';
      const data = await adminFetch('list_events');
      if (data.success) {
        renderEvents(data.events);
      }
    } catch(e) { console.error("Error loading events", e); }
  }

  function renderEvents(events) {
    eventsTableBody.innerHTML = '';
    if (events.length === 0) {
      eventsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay eventos creados.</td></tr>';
      return;
    }

    events.forEach(ev => {
      const tr = document.createElement('tr');
      const dateStr = new Date(ev.event_date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
      
      tr.innerHTML = `
        <td><strong>${ev.title}</strong><br><small style="color:#888">${ev.description || ''}</small></td>
        <td>${dateStr}</td>
        <td>${ev.max_tickets_per_member} por persona</td>
        <td>
          <span style="color: ${ev.is_active ? '#4ade80' : '#f87171'}">
            ${ev.is_active ? 'Activo (Visible)' : 'Inactivo (Oculto)'}
          </span>
        </td>
        <td>
          <button class="btn-action toggle-btn" data-id="${ev.id}" data-active="${ev.is_active}">
            ${ev.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      `;
      eventsTableBody.appendChild(tr);
    });

    // Bind toggles
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const currentState = e.target.getAttribute('data-active') === 'true';
        e.target.textContent = '...';
        await adminFetch('toggle_event', { id, is_active: !currentState });
        loadEvents();
      });
    });
  }

  // --- 3. CREATE EVENT ---
  btnOpenNewEvent.addEventListener('click', () => {
    newEventModal.style.display = 'flex';
  });

  btnCancelEvent.addEventListener('click', () => {
    newEventModal.style.display = 'none';
  });

  btnSaveEvent.addEventListener('click', async () => {
    const title = document.getElementById('evTitle').value.trim();
    const description = document.getElementById('evDesc').value.trim();
    const event_date = document.getElementById('evDate').value;
    const max_tickets_per_member = document.getElementById('evMax').value;

    if (!title || !event_date) {
      alert("Título y fecha son obligatorios");
      return;
    }

    btnSaveEvent.textContent = 'Guardando...';
    try {
      const data = await adminFetch('create_event', {
        title, description, event_date, max_tickets_per_member, is_active: true
      });
      if (data.success) {
        newEventModal.style.display = 'none';
        // Limpiar campos
        document.getElementById('evTitle').value = '';
        document.getElementById('evDesc').value = '';
        document.getElementById('evDate').value = '';
        loadEvents();
      } else {
        alert(data.error || "Error al crear evento");
      }
    } catch(e) {
      alert("Error de red");
    }
    btnSaveEvent.textContent = 'Guardar Evento';
  });

});
