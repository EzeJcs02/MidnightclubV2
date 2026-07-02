
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

    // === BOTONES ESTÁTICOS 2:00 AM Y 3:00 AM ===
    const btn2am = document.getElementById('btn_acceso_2am');
    const btn3am = document.getElementById('btn_acceso_3am');
    
    const openGateHandler = (e) => {
        e.preventDefault();
        if (window.mcUI && window.mcUI.openGate) {
            window.mcUI.openGate();
        }
    };

    if (btn2am) btn2am.addEventListener('click', openGateHandler);
    if (btn3am) btn3am.addEventListener('click', openGateHandler);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccesos);
} else {
    initAccesos();
}

window.addEventListener('mc:pageLoaded', initAccesos);
