import { loadDynamicHero, setupAuthUI } from './shared-ui.js';

function initHome() {
    const path = window.location.pathname;
    if (path !== '/' && !path.endsWith('index.html') && path !== '') return;
    // Initialize Shared Logic
    loadDynamicHero();
    setupAuthUI();
    
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
