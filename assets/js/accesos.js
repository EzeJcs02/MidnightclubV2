
import { loadDynamicHero, setupAuthUI, syncDynamicCards } from './shared-ui.js';

function initAccesos() {
    const path = window.location.pathname;
    if (!path.includes('accesos')) return;
    
    loadDynamicHero();
    setupAuthUI();

    // === LOGICA ACCESOS: Mapeo DB -> DOM (3 slots fijos) ===
    syncDynamicCards({
      'passline_acceso__0200': 'card_0000',
      'passline_acceso__0300': 'card_plus',
      'passline_acceso__extra': 'card_extra'  // Slot reservado para futuro
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccesos);
} else {
    initAccesos();
}

window.addEventListener('mc:pageLoaded', initAccesos);
