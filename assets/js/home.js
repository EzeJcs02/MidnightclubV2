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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
} else {
    initHome();
}

window.addEventListener('mc:pageLoaded', initHome);
