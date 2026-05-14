// public/js/main.js

let allProducts = [];
let activeCategory = 'all';
let activeModal = null;
let cart = JSON.parse(localStorage.getItem('cg_cart') || '[]');

// ── Helpers ──────────────────────────────────────────

function getFirstImage(product) {
  for (const color of (product.colors || [])) {
    if (color.images && color.images.length) return color.images[0];
  }
  return null;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function itemDesc(item) {
  const parts = [item.brand, item.name].filter(Boolean).join(' ');
  const details = [item.label, item.color, item.size].filter(Boolean).join(', ');
  return `the ${parts}${details ? ', ' + details : ''}`;
}

function buildWhatsAppUrl(brand, name, label, color, size) {
  const parts = [brand, name].filter(Boolean).join(' ');
  const details = [label, color, size].filter(Boolean).join(', ');
  const msg = `Hey Daniel, I'd like to buy the ${parts}${details ? ', ' + details : ''}`;
  return 'https://wa.me/13477241136?text=' + encodeURIComponent(msg.trim().replace(/\s+/g, ' '));
}

function buildCartWhatsAppUrl() {
  if (!cart.length) return '#';
  const items = cart.map(itemDesc);
  const list = items.length === 1
    ? items[0]
    : items.slice(0, -1).join(' + ') + ' + ' + items[items.length - 1];
  const msg = `Hey Daniel, I'd like to buy: ${list}`;
  return 'https://wa.me/13477241136?text=' + encodeURIComponent(msg.trim().replace(/\s+/g, ' '));
}

// ── Cart ─────────────────────────────────────────────

function saveCart() {
  localStorage.setItem('cg_cart', JSON.stringify(cart));
}

function addToCart(product, label, color, size) {
  const colorObj = (product.colors || []).find(c => c.name === color);
  const image = (colorObj && colorObj.images && colorObj.images[0]) || getFirstImage(product) || '';
  cart.push({ id: product.id, brand: product.brand || '', name: product.name || '', label: label || '', color: color || '', size: size || '', image });
  saveCart();
  updateCartBadge();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  saveCart();
  updateCartBadge();
  renderCartItems();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = cart.length || '';
    badge.style.display = cart.length ? 'flex' : 'none';
  }
  const cartReachOut = document.getElementById('cart-reach-out');
  if (cartReachOut) {
    cartReachOut.href = buildCartWhatsAppUrl();
    cartReachOut.style.display = cart.length ? 'block' : 'none';
  }
}

function renderCartItems() {
  const itemsEl = document.getElementById('cart-items');
  if (!itemsEl) return;
  if (!cart.length) {
    itemsEl.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
  } else {
    itemsEl.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        ${item.image
          ? `<img class="cart-item-img" src="${esc(item.image)}" alt="">`
          : `<div class="cart-item-img cart-item-no-img"></div>`}
        <div class="cart-item-info">
          <div class="cart-item-brand">${esc(item.brand)}</div>
          <div class="cart-item-name">${esc(item.name)}</div>
          ${[item.label, item.color, item.size].filter(Boolean).map(v =>
            `<div class="cart-item-detail">${esc(v)}</div>`).join('')}
        </div>
        <button class="cart-item-remove" data-idx="${i}">&times;</button>
      </div>
    `).join('');
    itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.idx)));
    });
  }
  updateCartBadge();
}

function openCartPanel() {
  renderCartItems();
  document.getElementById('cart-panel').classList.add('active');
  document.getElementById('cart-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartPanel() {
  document.getElementById('cart-panel').classList.remove('active');
  document.getElementById('cart-overlay').classList.remove('active');
  if (!activeModal) document.body.style.overflow = '';
}

// ── Sidebar ───────────────────────────────────────────

function openSidebar() {
  renderSidebarCategories(allProducts);
  document.getElementById('cat-sidebar').classList.add('active');
  document.getElementById('sidebar-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('cat-sidebar').classList.remove('active');
  document.getElementById('sidebar-overlay').classList.remove('active');
  if (!activeModal) document.body.style.overflow = '';
}

function renderSidebarCategories(products) {
  const categories = [...new Set(products.flatMap(p => p.categories || []))].sort();
  const list = document.getElementById('sidebar-cat-list');
  if (!list) return;
  list.innerHTML = `<button class="sidebar-cat-item${activeCategory === 'all' ? ' active' : ''}" data-category="all">All</button>` +
    categories.map(cat => `
      <button class="sidebar-cat-item${activeCategory === cat ? ' active' : ''}" data-category="${esc(cat)}">
        ${esc(cat.charAt(0).toUpperCase() + cat.slice(1))}
      </button>`).join('');
  list.querySelectorAll('.sidebar-cat-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      document.querySelectorAll('.filter-pill').forEach(b =>
        b.classList.toggle('active', b.dataset.category === activeCategory));
      renderGrid();
      closeSidebar();
    });
  });
}

// ── Brand list ────────────────────────────────────────

function renderBrandList(products) {
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  document.getElementById('brand-list').textContent = brands.join(' · ');
}

// ── Category filter pills ─────────────────────────────

function renderFilterPills(products) {
  const bar = document.getElementById('filter-bar');
  const categories = [...new Set(products.flatMap(p => p.categories || []))].sort();
  bar.innerHTML = `<button class="filter-pill ${activeCategory === 'all' ? 'active' : ''}" data-category="all">All</button>`;
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-pill${activeCategory === cat ? ' active' : ''}`;
    btn.dataset.category = cat;
    btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    bar.appendChild(btn);
  });
  bar.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      bar.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid();
    });
  });
}

// ── Product grid ──────────────────────────────────────

function renderGrid() {
  const grid = document.getElementById('product-grid');
  const filtered = activeCategory === 'all'
    ? allProducts
    : allProducts.filter(p => (p.categories || []).includes(activeCategory));

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state">No products found</div>';
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const img = getFirstImage(product);
    const oos = product.inStock === false;
    const imgHTML = img
      ? `<img src="${esc(img)}" alt="${esc(product.name)}" loading="lazy">`
      : `<div class="no-image">No Image</div>`;
    return `
      <div class="product-card" data-id="${esc(product.id)}">
        <div class="product-card-image${oos ? ' oos-image' : ''}">
          ${imgHTML}
          ${oos ? '<div class="oos-badge">Out of Stock</div>' : ''}
        </div>
        <div class="product-card-info">
          <div class="product-card-brand">${esc(product.brand)}</div>
          <div class="product-card-name">${esc(product.name)}</div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const product = filtered.find(p => String(p.id) === card.dataset.id);
      if (product) openModal(product);
    });
  });
}

// ── Modal ─────────────────────────────────────────────

function openModal(product) {
  const colors = product.colors || [];
  const labels = [...new Set(colors.map(c => c.label).filter(Boolean))];
  const firstLabel = labels.length ? labels[0] : null;
  const firstColors = firstLabel ? colors.filter(c => c.label === firstLabel) : colors;

  activeModal = {
    product,
    selectedLabel: firstLabel,
    selectedColor: firstColors.length ? firstColors[0].name : null,
    selectedSize: null
  };

  document.getElementById('modal-brand').textContent = product.brand || '';
  document.getElementById('modal-name').textContent = product.name || '';
  document.getElementById('modal-desc').textContent = product.description || '';

  renderModalLabels(product);
  renderModalColors(product);
  renderModalSizes(product);
  renderModalImages(product, activeModal.selectedColor);
  updateModalButtons();

  document.getElementById('modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  activeModal = null;
}

function isValidHex(hex) {
  return /^#[0-9a-fA-F]{3,6}$/.test(hex);
}

function swatchStyle(color) {
  const hex = isValidHex(color.hex) ? color.hex : '#ccc';
  if (color.hex2 && isValidHex(color.hex2)) {
    return `linear-gradient(135deg, ${hex} 50%, ${color.hex2} 50%)`;
  }
  return hex;
}

function renderModalLabels(product) {
  const section = document.getElementById('modal-labels-section');
  const pillsEl = document.getElementById('modal-labels');
  const labels = [...new Set((product.colors || []).map(c => c.label).filter(Boolean))];
  if (labels.length < 1) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  const lc = product.labelColors || {};
  pillsEl.innerHTML = labels.map(label => {
    const hex = lc[label] && /^#[0-9a-fA-F]{3,6}$/.test(lc[label]) ? lc[label] : '';
    const sw = hex ? `<span class="label-pill-swatch" style="background:${hex}"></span>` : '';
    return `<button class="label-pill${activeModal.selectedLabel === label ? ' active' : ''}" data-label="${esc(label)}">${sw}${esc(label)}</button>`;
  }).join('');
  pillsEl.querySelectorAll('.label-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeModal.selectedLabel = btn.dataset.label;
      pillsEl.querySelectorAll('.label-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filtered = (product.colors || []).filter(c => c.label === activeModal.selectedLabel);
      activeModal.selectedColor = filtered.length ? filtered[0].name : null;
      renderModalColors(product);
      renderModalImages(product, activeModal.selectedColor);
      updateModalButtons();
    });
  });
}

function renderModalColors(product) {
  const section = document.getElementById('modal-colors-section');
  const swatches = document.getElementById('modal-swatches');
  if (!product.colors || !product.colors.length) { section.style.display = 'none'; return; }
  const hasLabels = product.colors.some(c => c.label);
  const colors = hasLabels && activeModal.selectedLabel
    ? product.colors.filter(c => c.label === activeModal.selectedLabel)
    : product.colors;
  if (!colors.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  const colorLabel = section.querySelector('.modal-colors-label');
  if (colorLabel) {
    const name = activeModal.selectedColor || '';
    colorLabel.innerHTML = `Color${name ? `: <span class="modal-selected-value">${esc(name)}</span>` : ''}`;
  }
  swatches.innerHTML = colors.map(color => `
    <button class="color-swatch${activeModal.selectedColor === color.name ? ' active' : ''}"
      style="background:${swatchStyle(color)}" title="${esc(color.name)}"
      data-color="${esc(color.name)}" aria-label="${esc(color.name)}"></button>
  `).join('');
  swatches.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      activeModal.selectedColor = btn.dataset.color;
      swatches.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cl = section.querySelector('.modal-colors-label');
      if (cl) cl.innerHTML = `Color: <span class="modal-selected-value">${esc(btn.dataset.color)}</span>`;
      renderModalImages(product, activeModal.selectedColor);
      updateModalButtons();
    });
  });
}

function renderModalSizes(product) {
  const section = document.getElementById('modal-sizes-section');
  const pills = document.getElementById('modal-sizes');
  if (!product.sizes || !product.sizes.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  pills.innerHTML = product.sizes.map(size => `
    <button class="size-pill${activeModal.selectedSize === size ? ' active' : ''}" data-size="${esc(size)}">${esc(size)}</button>
  `).join('');
  pills.querySelectorAll('.size-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeModal.selectedSize === btn.dataset.size) {
        activeModal.selectedSize = null;
        btn.classList.remove('active');
      } else {
        activeModal.selectedSize = btn.dataset.size;
        pills.querySelectorAll('.size-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      updateModalButtons();
    });
  });
}

function renderModalImages(product, selectedColorName) {
  const mainImg = document.getElementById('modal-main-img');
  const thumbsContainer = document.getElementById('modal-thumbs');
  const color = (product.colors || []).find(c => c.name === selectedColorName);
  let images = color && color.images && color.images.length ? color.images : [];
  if (!images.length) {
    for (const c of (product.colors || [])) {
      if (c.images && c.images.length) { images = c.images; break; }
    }
  }
  if (!images.length) {
    mainImg.removeAttribute('src'); mainImg.alt = '';
    mainImg.parentElement.style.background = 'var(--surface)';
    thumbsContainer.innerHTML = '';
    return;
  }
  mainImg.src = esc(images[0]);
  mainImg.alt = product.name;
  thumbsContainer.innerHTML = images.map((img, i) => `
    <div class="modal-thumb${i === 0 ? ' active' : ''}" data-img="${esc(img)}">
      <img src="${esc(img)}" alt="">
    </div>
  `).join('');
  thumbsContainer.querySelectorAll('.modal-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      mainImg.src = thumb.dataset.img;
      thumbsContainer.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
}

function updateModalButtons() {
  if (!activeModal) return;
  const { product, selectedLabel, selectedColor, selectedSize } = activeModal;
  document.getElementById('reach-out-btn').href =
    buildWhatsAppUrl(product.brand, product.name, selectedLabel, selectedColor, selectedSize);
}

// ── Event listeners ───────────────────────────────────

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCartPanel(); closeSidebar(); }
});

document.getElementById('add-to-cart-btn').addEventListener('click', () => {
  if (!activeModal) return;
  const { product, selectedLabel, selectedColor, selectedSize } = activeModal;
  addToCart(product, selectedLabel, selectedColor, selectedSize);
  const btn = document.getElementById('add-to-cart-btn');
  const orig = btn.textContent;
  btn.textContent = 'Added ✓';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1400);
});

document.getElementById('cart-btn').addEventListener('click', openCartPanel);
document.getElementById('cart-close').addEventListener('click', closeCartPanel);
document.getElementById('cart-overlay').addEventListener('click', closeCartPanel);
document.getElementById('sidebar-toggle').addEventListener('click', openSidebar);
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

// ── Init ──────────────────────────────────────────────

const PRODUCTS_URL = 'https://admin.thecgoutlet.com/api/products';

async function init() {
  updateCartBadge();
  try {
    const res = await fetch(PRODUCTS_URL, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
    if (!Array.isArray(products)) throw new Error('Invalid response');
    allProducts = products.filter(p => p.published);
    renderBrandList(allProducts);
    renderFilterPills(allProducts);
    renderGrid();
  } catch (err) {
    document.getElementById('product-grid').innerHTML =
      '<div class="empty-state">Could not load products</div>';
  }
}

init();
