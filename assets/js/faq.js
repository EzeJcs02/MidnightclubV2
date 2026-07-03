import { setupAuthUI } from './shared-ui.js';

function initFaq() {
    const path = window.location.pathname;
    if (!path.includes('faq')) return;
    setupAuthUI();
    
    document.querySelectorAll('.faq-item').forEach(item => {
        // Prevent duplicate listeners
        if (item.dataset.hasListener) return;
        item.dataset.hasListener = 'true';
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Close others
            document.querySelectorAll('.faq-item').forEach(child => {
                if (child !== item) child.classList.remove('active');
            });
            // Toggle current
            item.classList.toggle('active');
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq);
} else {
    initFaq();
}

window.addEventListener('mc:pageLoaded', initFaq);
