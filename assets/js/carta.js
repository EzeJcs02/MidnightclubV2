import { client } from './global.js';
import { setupAuthUI } from './shared-ui.js';

setupAuthUI();

let allCategories = [];
let allProducts = [];
let currentSearch = '';

// INIT
async function initCarta() {
    const path = window.location.pathname;
    if (!path.includes('carta')) return;
    setupAuthUI();
    await loadMenu();
    setupEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarta);
} else {
    initCarta();
}

window.addEventListener('mc:pageLoaded', initCarta);

// Helper: mostrar skeletons mientras carga
function showSkeletons(count = 4) {
  const container = document.getElementById('dynamicList');
  if (!container) return;
  container.innerHTML = Array(count).fill('<div class="skeleton-card"></div>').join('');
}

async function loadMenu() {
    const loader = document.getElementById('loading');
    if(loader) loader.style.display = 'none';
    
    showSkeletons(4);

    // Cargar categorías desde Supabase
    const { data: categories, error: catError } = await client
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
    
    if (catError) {
        window.Toast('Error cargando categorías', 'error');
        const container = document.getElementById('dynamicList');
        const noRes = document.getElementById('noResults');
        if(container) container.innerHTML = '';
        if(noRes) { noRes.innerText = "ERROR DE CONEXIÓN"; noRes.style.display = 'block'; }
        return;
    }
    
    allCategories = categories || [];

    // Cargar productos
    const { data: items, error: itemError } = await client
        .from('menu_items')
        .select('*, menu_categories(name, slug)')
        .order('name', { ascending: true });
    
    if(itemError) {
        window.Toast('Error cargando productos', 'error');
        const container = document.getElementById('dynamicList');
        const noRes = document.getElementById('noResults');
        if(container) container.innerHTML = '';
        if(noRes) { noRes.innerText = "ERROR DE CONEXIÓN"; noRes.style.display = 'block'; }
        return;
    }
    
    allProducts = items || [];
    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('dynamicList');
    const noResults = document.getElementById('noResults');
    if(!container) return;
    
    container.innerHTML = '';
    let totalItemsVisible = 0;

    allCategories.forEach((cat) => {
        // Filtrar productos por category_id
        const catItems = allProducts.filter(item => {
            const matchCat = item.category_id === cat.id;
            const matchSearch = !currentSearch || 
                item.name.toLowerCase().includes(currentSearch) || 
                (item.description && item.description.toLowerCase().includes(currentSearch));
            return matchCat && matchSearch;
        });

        if (catItems.length > 0) {
            totalItemsVisible += catItems.length;

            const groupLink = document.createElement('a');
            groupLink.href = "#";
            groupLink.className = 'editorial-nav-link cat-header';
            if (currentSearch.length > 0) groupLink.classList.add('active');

            groupLink.addEventListener('click', (e) => {
                // Prevent toggle if clicking on an item inside
                if (e.target.closest('.carta-item-row')) return;
                e.preventDefault();
                
                const isOpen = groupLink.classList.contains('active');
                if (!currentSearch) {
                    document.querySelectorAll('.cat-header').forEach(c => c.classList.remove('active'));
                }
                if (!isOpen) {
                    groupLink.classList.add('active');
                    setTimeout(() => {
                        const y = groupLink.getBoundingClientRect().top + window.pageYOffset - 100;
                        window.scrollTo({top: y, behavior: 'smooth'});
                    }, 300);
                }
            });

            const navMeta = document.createElement('span');
            navMeta.className = 'nav-meta';
            navMeta.textContent = `0${cat.id} // CATEGORY`;

            const navTitle = document.createElement('h2');
            navTitle.className = 'nav-title';
            navTitle.style.fontSize = 'clamp(1.8rem, 6vw, 4rem)';
            navTitle.textContent = cat.name;

            const content = document.createElement('div');
            content.className = 'cat-content';

            catItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `carta-item-row ${item.is_active ? '' : 'sold-out'}`;
                itemDiv.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPriceModal(item);
                };

                const itemName = document.createElement('div');
                itemName.className = 'carta-item-name';
                itemName.textContent = item.name;

                const itemPrice = document.createElement('div');
                itemPrice.className = 'carta-item-price';
                
                if (!item.is_active) {
                    itemPrice.textContent = 'SOLD OUT';
                    itemPrice.style.color = 'red';
                } else {
                    const cashPrice = item.price ?? 0;
                    const cardPrice = Math.round(cashPrice * 1.25);
                    itemPrice.textContent = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cardPrice);
                }

                itemDiv.appendChild(itemName);
                itemDiv.appendChild(itemPrice);
                content.appendChild(itemDiv);
            });

            groupLink.appendChild(navMeta);
            groupLink.appendChild(navTitle);
            groupLink.appendChild(content);
            container.appendChild(groupLink);
        }
    });

    if(noResults) noResults.style.display = totalItemsVisible === 0 ? 'block' : 'none';
    return totalItemsVisible; 
}

// --- MODAL PRECIOS ---
function openPriceModal(item) {
    if (!item.is_active) return;

    const cashPrice = item.price ?? 0;
    const cardPrice = Math.round(cashPrice * 1.25);

    const fmt = (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
    const fmtList = fmt(cardPrice);
    const fmtCash = fmt(cashPrice);

    document.getElementById('modalTitle').innerText = item.name;
    document.getElementById('modalDesc').innerText = item.description || '';
    document.getElementById('modalPriceList').innerText = fmtList;
    document.getElementById('modalPriceCash').innerText = fmtCash;

    const overlay = document.getElementById('priceModalOverlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('open'), 10);
}

window.closePriceModal = function() {
    const overlay = document.getElementById('priceModalOverlay');
    overlay.classList.remove('open');
    setTimeout(() => overlay.style.display = 'none', 200);
};

function setupEvents() {
    const input = document.getElementById('searchInput');
    let renderDebounce = null;
    
    if(input) input.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        
        if (renderDebounce) clearTimeout(renderDebounce);
        renderDebounce = setTimeout(() => {
            renderMenu();
        }, 300);
    });
    
    // ESC key listener
    const overlay = document.getElementById('priceModalOverlay');
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay?.classList.contains('open')) {
            window.closePriceModal();
        }
    });
}
