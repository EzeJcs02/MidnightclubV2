import { setupAuthUI } from './shared-ui.js';

function initFaq() {
    const path = window.location.pathname;
    if (!path.includes('faq')) return;
    setupAuthUI();
    
    document.querySelectorAll('.faq-question').forEach(item => {
        // Prevent duplicate listeners
        if (item.dataset.hasListener) return;
        item.dataset.hasListener = 'true';
        
        item.addEventListener('click', () => {
            const parent = item.parentElement;
            document.querySelectorAll('.faq-item').forEach(child => {
                if (child !== parent) child.classList.remove('active');
            });
            parent.classList.toggle('active');
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq);
} else {
    initFaq();
}

window.addEventListener('mc:pageLoaded', initFaq);
