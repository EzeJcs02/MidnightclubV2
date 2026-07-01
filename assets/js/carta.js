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

            // Bloque Categoría
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group';
            
            if (currentSearch.length > 0) groupDiv.classList.add('open');

            // Header Acordeón
            const header = document.createElement('div');
            header.className = 'category-header';
            header.onclick = () => {
                const isOpen = groupDiv.classList.contains('open');
                
                // Close others
                document.querySelectorAll('.category-group').forEach(c => c.classList.remove('open'));
                
                // Toggle current
                if(!isOpen) {
                    groupDiv.classList.add('open');
                    setTimeout(() => {
                        const yOffset = -120;
                        const y = groupDiv.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({top: y, behavior: 'smooth'});
                    }, 300);
                }
            };
            
            const catTitle = document.createElement('div');
            catTitle.className = 'cat-title';
            catTitle.textContent = cat.name;
            
            const catIcon = document.createElement('div');
            catIcon.className = 'cat-icon';
            catIcon.textContent = '▼';
            
            header.appendChild(catTitle);
            header.appendChild(catIcon);

            // Contenido
            const content = document.createElement('div');
            content.className = 'category-items';

            let lastSub = '';
            
            catItems.forEach(item => {
                const currentSub = item.subcategory || '';
                if (currentSub && currentSub !== lastSub) {
                    const subTitle = document.createElement('h3');
                    subTitle.className = 'subcategory-title';
                    subTitle.innerText = currentSub;
                    content.appendChild(subTitle);
                    lastSub = currentSub;
                }

                const itemDiv = document.createElement('div');
                itemDiv.className = `item ${item.is_active ? '' : 'no-stock'}`;
                itemDiv.onclick = () => openPriceModal(item);

                const cashPrice = item.price ?? 0;
                const cardPrice = Math.round(cashPrice * 1.25);
                const fmtCard = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cardPrice);

                // Item Left
                const itemLeft = document.createElement('div');
                itemLeft.className = 'item-left';

                const itemInfo = document.createElement('div');
                itemInfo.className = 'item-info';

                const itemName = document.createElement('div');
                itemName.className = 'item-name';
                
                if (!item.is_active) {
                    const badgeStock = document.createElement('span');
                    badgeStock.className = 'badge-stock';
                    badgeStock.textContent = 'SIN STOCK';
                    itemName.appendChild(badgeStock);
                }
                if (item.is_pick) {
                    const badgePick = document.createElement('span');
                    badgePick.className = 'badge-pick';
                    badgePick.textContent = 'PICK';
                    itemName.appendChild(badgePick);
                }
                itemName.appendChild(document.createTextNode(item.name || ''));

                const itemDesc = document.createElement('div');
                itemDesc.className = 'item-desc';
                itemDesc.textContent = item.description || '';

                itemInfo.appendChild(itemName);
                itemInfo.appendChild(itemDesc);
                itemLeft.appendChild(itemInfo);

                const itemPrices = document.createElement('div');
                itemPrices.className = 'item-prices';
                itemPrices.textContent = fmtCard;

                const plusIcon = document.createElement('div');
                plusIcon.className = 'plus-icon';
                plusIcon.textContent = '+';

                itemDiv.appendChild(itemLeft);
                itemDiv.appendChild(itemPrices);
                itemDiv.appendChild(plusIcon);

                content.appendChild(itemDiv);
            });

            groupDiv.appendChild(header);
            groupDiv.appendChild(content);
            container.appendChild(groupDiv);
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
