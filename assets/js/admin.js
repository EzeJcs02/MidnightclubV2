import CONFIG from './config.js';

// Escapa texto no confiable antes de interpolarlo en innerHTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : String(str);
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  const adminPass = document.getElementById('adminPass');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');

  let adminToken = localStorage.getItem('mc_admin_token') || null;

  // Init
  if (adminToken) {
    showDashboard();
  } else {
    loginScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';
  }

  // --- LOGIN LOGIC ---
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
    } catch(e) { alert('Error de conexión'); }
    btnLogin.innerHTML = 'INGRESAR';
  });

  btnLogout.addEventListener('click', () => {
    adminToken = null;
    localStorage.removeItem('mc_admin_token');
    location.reload();
  });

  async function adminFetch(action, payload = {}) {
    const res = await fetch(CONFIG.SUPABASE.ADMIN_FUNCTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token: adminToken, payload })
    });
    const data = await res.json();
    if (!data.success && data.error && data.error.includes('denegado')) {
      btnLogout.click(); 
      throw new Error("Token expired");
    }
    return data;
  }

  // --- TABS LOGIC ---
  const navLinks = document.querySelectorAll('.mc-nav-link');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      link.classList.add('active');
      const target = link.getAttribute('data-target');
      document.getElementById(target).classList.add('active');

      if (target === 'tab-dashboard') loadDashboard();
      if (target === 'tab-eventos') loadEvents();
      if (target === 'tab-members') loadMembers();
      if (target === 'tab-carta') loadCarta();
    });
  });

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    loadDashboard();
  }

  const fmtARS = (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v || 0);

  // --- DASHBOARD ---
  const eventStatsTableBody = document.getElementById('eventStatsTableBody');
  const statsMonthFilter = document.getElementById('statsMonthFilter');
  
  if (statsMonthFilter) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    statsMonthFilter.value = `${now.getFullYear()}-${mm}`;
    statsMonthFilter.addEventListener('change', loadDashboard);
  }

  async function loadDashboard() {
    const month = statsMonthFilter ? statsMonthFilter.value : null;
    try {
      const data = await adminFetch('get_stats', { month });
      if (data.success) {
        document.getElementById('statQRPagos').textContent = data.stats.qrPagos;
        document.getElementById('statQRMembers').textContent = data.stats.qrMembers;
        document.getElementById('statIngresosEscaneados').textContent = data.stats.ingresosEscaneados;
        document.getElementById('statIngresosRechazados').textContent = data.stats.ingresosRechazados;
      }
    } catch(e) { console.error(e); }

    try {
      await loadEventStats();
    } catch(e) { console.error(e); }
  }

  async function loadEventStats() {
    if (!eventStatsTableBody) return;
    eventStatsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando...</td></tr>';
    
    const month = statsMonthFilter ? statsMonthFilter.value : null;
    const data = await adminFetch('list_events', { month });
    if (data.success) {
      eventStatsTableBody.innerHTML = '';
      data.events.forEach(ev => {
        const tr = document.createElement('tr');
        const dateStr = new Date(ev.event_date).toLocaleString('es-AR');
        const stats = ev.stats || { memberEmitted: 0, memberUsed: 0, paidSold: 0, paidUsed: 0, revenue: 0 };
        tr.innerHTML = `
          <td><strong>${escapeHtml(ev.title)}</strong></td>
          <td>${escapeHtml(dateStr)}</td>
          <td>${stats.memberEmitted}</td>
          <td>${stats.paidSold}</td>
          <td>${escapeHtml(fmtARS(stats.revenue))}</td>
        `;
        eventStatsTableBody.appendChild(tr);
      });
    }
  }

  // --- EVENTOS ---
  const eventsTableBody = document.getElementById('eventsTableBody');
  const eventModal = document.getElementById('eventModal');
  const btnSaveEvent = document.getElementById('btnSaveEvent');
  const evId = document.getElementById('evId');

  let currentEvents = [];

  async function loadEvents() {
    eventsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando...</td></tr>';
    const data = await adminFetch('list_events');
    if (data.success) {
      currentEvents = data.events;
      eventsTableBody.innerHTML = '';
      data.events.forEach(ev => {
        const tr = document.createElement('tr');
        const dateStr = new Date(ev.event_date).toLocaleString('es-AR');
        tr.innerHTML = `
          <td><strong>${escapeHtml(ev.title)}</strong><br><small style="color:#888">${escapeHtml(ev.description || '')}</small></td>
          <td>${escapeHtml(dateStr)}</td>
          <td>${escapeHtml(ev.max_tickets_per_member)}</td>
          <td><span class="badge ${ev.is_active ? 'active' : 'rejected'}">${ev.is_active ? 'ACTIVO' : 'OCULTO'}</span></td>
          <td style="display:flex; gap:10px;">
            <button class="btn-action btn-edit-ev" data-id="${escapeHtml(ev.id)}">EDITAR</button>
            <button class="btn-action toggle-ev" data-id="${escapeHtml(ev.id)}" data-active="${ev.is_active}">${ev.is_active ? 'OCULTAR' : 'MOSTRAR'}</button>
          </td>
        `;
        eventsTableBody.appendChild(tr);
      });

      document.querySelectorAll('.toggle-ev').forEach(b => b.onclick = async (e) => {
        await adminFetch('toggle_event', { id: e.target.dataset.id, is_active: e.target.dataset.active !== 'true' });
        loadEvents();
      });

      document.querySelectorAll('.btn-edit-ev').forEach(b => b.onclick = (e) => {
        const ev = currentEvents.find(x => x.id === e.target.dataset.id);
        if (ev) openEventModal(ev);
      });
    }
  }

  document.getElementById('btnOpenNewEvent').onclick = () => openEventModal();
  document.getElementById('btnCancelEvent').onclick = () => eventModal.style.display = 'none';

  function openEventModal(ev = null) {
    document.getElementById('eventModalTitle').textContent = ev ? 'EDITAR EVENTO' : 'NUEVO EVENTO';
    evId.value = ev ? ev.id : '';
    document.getElementById('evTitle').value = ev ? ev.title : '';
    document.getElementById('evDesc').value = ev ? (ev.description || '') : '';
    document.getElementById('evMax').value = ev ? ev.max_tickets_per_member : 5;
    
    if (ev && ev.event_date) {
      const d = new Date(ev.event_date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      document.getElementById('evDate').value = d.toISOString().slice(0,16);
    } else {
      document.getElementById('evDate').value = '';
    }
    
    eventModal.style.display = 'flex';
  }

  btnSaveEvent.onclick = async () => {
    const payload = {
      title: document.getElementById('evTitle').value.trim(),
      description: document.getElementById('evDesc').value.trim(),
      event_date: document.getElementById('evDate').value,
      max_tickets_per_member: document.getElementById('evMax').value,
      is_active: true
    };
    if (!payload.title || !payload.event_date) return alert("Título y fecha obligatorios");
    
    btnSaveEvent.textContent = '...';
    if (evId.value) {
      payload.id = evId.value;
      await adminFetch('edit_event', payload);
    } else {
      await adminFetch('create_event', payload);
    }
    btnSaveEvent.textContent = 'GUARDAR';
    eventModal.style.display = 'none';
    loadEvents();
  };

  // --- MEMBERS ---
  const membersTableBody = document.getElementById('membersTableBody');
  async function loadMembers() {
    membersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando...</td></tr>';
    const data = await adminFetch('list_members');
    if (data.success) {
      membersTableBody.innerHTML = '';
      data.members.forEach(m => {
        const tr = document.createElement('tr');
        const badgeClass = m.status === 'active' ? 'active' : (m.status === 'rejected' ? 'rejected' : 'pending');
        let actionsHtml = '';
        if (m.status === 'pending') {
          actionsHtml = `
            <button class="btn-action mem-status" data-id="${m.id}" data-status="active" style="color:#4ade80; border-color:#4ade80;">✓ APROBAR</button>
            <button class="btn-action mem-status" data-id="${m.id}" data-status="rejected" style="color:#f87171; border-color:#f87171;">✕ RECHAZAR</button>
          `;
        } else if (m.status === 'active') {
          actionsHtml = `
            <button class="btn-action mem-status" data-id="${m.id}" data-status="rejected" style="color:#f87171; border-color:#f87171;">✕ REVOCAR</button>
          `;
        } else {
          actionsHtml = `
            <button class="btn-action mem-status" data-id="${m.id}" data-status="active" style="color:#4ade80; border-color:#4ade80;">✓ APROBAR</button>
          `;
        }

        tr.innerHTML = `
          <td><strong>${escapeHtml(m.nombre || 'N/A')}</strong><br><small style="color:#888">${escapeHtml(m.email || '')}</small></td>
          <td>${escapeHtml(m.member_id || 'N/A')}</td>
          <td>${escapeHtml(m.instagram || 'N/A')}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(m.status ? m.status.toUpperCase() : 'ACTIVE')}</span></td>
          <td style="display:flex; gap:10px;">
            ${actionsHtml}
          </td>
        `;
        membersTableBody.appendChild(tr);
      });

      document.querySelectorAll('.mem-status').forEach(b => b.onclick = async (e) => {
        const btn = e.target;
        btn.textContent = '...';
        await adminFetch('update_member_status', { id: btn.dataset.id, status: btn.dataset.status });
        loadMembers();
      });
    }
  }

  // --- CARTA ---
  const cartaTableBody = document.getElementById('cartaTableBody');
  const cartaModal = document.getElementById('cartaModal');
  const cartaCatSelect = document.getElementById('cartaCat');
  const btnOpenNewCarta = document.getElementById('btnOpenNewCarta');
  const btnCancelCarta = document.getElementById('btnCancelCarta');
  const btnSaveCarta = document.getElementById('btnSaveCarta');

  let currentCategories = [];

  async function loadCarta() {
    cartaTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando...</td></tr>';
    const data = await adminFetch('list_carta');
    if (data.success) {
      currentCategories = data.categories || [];
      
      // Populate category select in modal
      cartaCatSelect.innerHTML = currentCategories.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');

      cartaTableBody.innerHTML = '';
      data.items.forEach(item => {
        const tr = document.createElement('tr');
        const catName = item.menu_categories ? item.menu_categories.name : 'N/A';
        tr.innerHTML = `
          <td><small style="color:#888">${escapeHtml(catName)}</small></td>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>$${escapeHtml(item.price)}</td>
          <td>
            <button class="btn-action del-carta" data-id="${escapeHtml(item.id)}" style="color:#f87171; border-color:#f87171;">ELIMINAR</button>
          </td>
        `;
        cartaTableBody.appendChild(tr);
      });

      document.querySelectorAll('.del-carta').forEach(b => b.onclick = async (e) => {
        if(confirm("¿Seguro que deseas eliminar este ítem?")) {
          e.target.textContent = '...';
          await adminFetch('delete_carta_item', { id: e.target.dataset.id });
          loadCarta();
        }
      });
    }
  }

  // New Carta Item Modal Logic
  btnOpenNewCarta.onclick = () => {
    if(currentCategories.length === 0) {
      alert("Debes crear categorías en la base de datos primero.");
      return;
    }
    document.getElementById('cartaId').value = '';
    document.getElementById('cartaName').value = '';
    document.getElementById('cartaPrice').value = '';
    document.getElementById('cartaModalTitle').textContent = 'NUEVO ÍTEM';
    cartaModal.style.display = 'flex';
  };

  btnCancelCarta.onclick = () => {
    cartaModal.style.display = 'none';
  };

  btnSaveCarta.onclick = async () => {
    const payload = {
      category_id: cartaCatSelect.value,
      name: document.getElementById('cartaName').value.trim(),
      price: document.getElementById('cartaPrice').value,
      is_active: true
    };
    if (!payload.name) return alert("El nombre es obligatorio");
    
    btnSaveCarta.textContent = '...';
    await adminFetch('create_carta_item', payload);
    btnSaveCarta.textContent = 'GUARDAR';
    cartaModal.style.display = 'none';
    loadCarta();
  };
});
