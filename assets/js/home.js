import { loadDynamicHero, setupAuthUI } from './shared-ui.js';
import { client } from './global.js';

async function loadNextEvent() {
    const banner = document.getElementById('nextEventBanner');
    if (!banner) return;
    
    try {
        const { data: events, error } = await client
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(1);

        if (error || !events || events.length === 0) return;

        const nextEvent = events[0];
        document.getElementById('nextEventTitle').textContent = nextEvent.title;
        
        const dateObj = new Date(nextEvent.event_date);
        const dateStr = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        
        document.getElementById('nextEventDate').textContent = `${dateStr} // ${timeStr} HS`;
        document.getElementById('nextEventDesc').textContent = nextEvent.description || '';
        
        banner.style.display = 'block';
    } catch (e) {
        console.error("Error loading next event", e);
    }
}

function initHome() {
    const path = window.location.pathname;
    if (path !== '/' && !path.endsWith('index.html') && path !== '') return;
    // Initialize Shared Logic
    loadDynamicHero();
    setupAuthUI();
    loadNextEvent();
    
    // PWA Install Button Re-bind
    const installBtn = document.getElementById('btnInstallApp');
    if (installBtn && !installBtn.dataset.bound) {
        installBtn.dataset.bound = "true";
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault(); 
            window.deferredPrompt = e; 
            installBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (window.deferredPrompt) {
                window.deferredPrompt.prompt();
                const { outcome } = await window.deferredPrompt.userChoice;
                if (outcome === 'accepted') { installBtn.style.display = 'none'; }
                window.deferredPrompt = null;
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
} else {
    initHome();
}

window.addEventListener('mc:pageLoaded', initHome);

// === LÓGICA PWA (Instalar App) ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js'); });
}
