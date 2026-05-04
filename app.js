/* ── Constants ─────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'remote-jobs', label: 'Remote Jobs Source' },
  { id: 'ai-tools',    label: 'AI Tools' },
  { id: 'inspiration', label: 'Inspiration' },
];

const CAT_LABELS = {
  'remote-jobs': 'Remote Jobs',
  'ai-tools':    'AI Tools',
  'inspiration': 'Inspiration',
};

/* ── State ─────────────────────────────────────────────── */
let allCards     = [];
let activeFilter = 'all';
let activeCard   = null;

/* ── Boot ──────────────────────────────────────────────── */
async function init() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  try {
    const res = await fetch('./data.json');
    allCards = await res.json();
  } catch {
    // Fallback: no cards loaded, show empty states
    allCards = [];
  }

  readHash();
  render();
  bindNav();
  bindHamburger();
  bindPanel();

  window.addEventListener('hashchange', () => {
    readHash();
    render();
  });
}

/* ── URL / hash state ──────────────────────────────────── */
function readHash() {
  const hash = location.hash.slice(1);

  if (hash.startsWith('r/')) {
    const slug = hash.slice(2);
    activeCard   = allCards.find(c => c.slug === slug) || null;
    activeFilter = 'all';
    return;
  }

  activeCard = null;
  const validFilters = ['all', ...CATEGORIES.map(c => c.id)];
  activeFilter = validFilters.includes(hash) ? hash : 'all';
}

function pushHash(hash) {
  location.hash = hash;
}

/* ── Nav ───────────────────────────────────────────────── */
function bindNav() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      activeCard = null;
      closeMobileMenu();
      pushHash(f === 'all' ? '' : f);
      if (!location.hash && f === 'all') {
        activeFilter = 'all';
        render();
      }
    });
  });
}

/* ── Hamburger ─────────────────────────────────────────── */
function bindHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navbar    = document.getElementById('navbar');

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = navbar.classList.toggle('nav-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', e => {
    if (!navbar.contains(e.target)) closeMobileMenu();
  });
}

function closeMobileMenu() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  navbar.classList.remove('nav-open');
  hamburger.setAttribute('aria-expanded', 'false');
}

function syncNav() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const active = btn.dataset.filter === (activeCard ? 'all' : activeFilter);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

/* ── Render ────────────────────────────────────────────── */
function render() {
  syncNav();
  renderSections();

  if (activeCard) {
    openPanel(activeCard);
  } else {
    closePanel(true);
  }
}

function renderSections() {
  const main = document.getElementById('main');
  main.innerHTML = '';

  const cats = activeFilter === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c.id === activeFilter);

  cats.forEach(cat => {
    const cards   = allCards.filter(c => c.category === cat.id);
    const showAll = activeFilter !== 'all';
    const visible = showAll ? cards : cards.slice(0, 4);

    const section = el('section', { className: 'category-section', id: `section-${cat.id}` });

    const header = el('div', { className: 'section-header' });
    header.textContent = cat.label;
    section.appendChild(header);

    const wrapper = el('div', { className: 'card-grid-wrapper' });

    if (cards.length === 0) {
      const empty = el('p', { className: 'empty-state' });
      empty.textContent = 'Nothing here yet — check back soon.';
      wrapper.appendChild(empty);
    } else {
      const row = el('div', { className: 'card-row' });
      visible.forEach(card => row.appendChild(buildCard(card)));
      wrapper.appendChild(row);

      if (!showAll && cards.length > 4) {
        const seeAllRow = el('div', { className: 'see-all-row' });
        const link = el('button', { className: 'see-all-link' });
        link.textContent = `See all ${cat.label} →`;
        link.addEventListener('click', () => pushHash(cat.id));
        seeAllRow.appendChild(link);
        wrapper.appendChild(seeAllRow);
      }
    }

    section.appendChild(wrapper);
    main.appendChild(section);
  });
}

/* ── Card (Drive-style) ────────────────────────────────── */
function buildCard(card) {
  const wrap = el('div', { className: 'card' });

  /* ── Preview area ── */
  const preview = el('div', { className: `card-preview preview-${card.category}` });
  const inner   = el('div', { className: 'card-preview-inner' });

  inner.appendChild(buildFaviconLg(card));

  const domain = el('span', { className: 'card-domain' });
  try { domain.textContent = new URL(card.url).hostname.replace(/^www\./, ''); }
  catch { domain.textContent = card.url; }
  inner.appendChild(domain);

  preview.appendChild(inner);
  wrap.appendChild(preview);

  /* ── Meta bar ── */
  const meta     = el('div', { className: 'card-meta' });
  const metaInfo = el('div', { className: 'card-meta-info' });

  const title = el('p', { className: 'card-title' });
  title.textContent = card.title;
  metaInfo.appendChild(title);

  const sub = el('p', { className: 'card-meta-sub' });
  sub.textContent = CAT_LABELS[card.category];
  if (card.tags?.length) sub.textContent += ' · ' + card.tags.slice(0, 2).join(' · ');
  metaInfo.appendChild(sub);

  meta.appendChild(metaInfo);

  /* ── Three-dot menu ── */
  const menuWrap = el('div', { className: 'card-menu-wrap' });
  const menuBtn  = el('button', { className: 'card-menu-btn' });
  menuBtn.setAttribute('aria-label', `Options for ${card.title}`);
  menuBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="3" cy="8" r="1.4" fill="currentColor"/>
    <circle cx="8" cy="8" r="1.4" fill="currentColor"/>
    <circle cx="13" cy="8" r="1.4" fill="currentColor"/>
  </svg>`;

  const dropdown = el('div', { className: 'card-dropdown' });

  const visitItem = el('a', { className: 'card-dropdown-item' });
  visitItem.textContent = '→ Visit site';
  visitItem.href   = card.url;
  visitItem.target = '_blank';
  visitItem.rel    = 'noopener noreferrer';

  const detailItem = el('button', { className: 'card-dropdown-item' });
  detailItem.textContent = 'View details';
  detailItem.addEventListener('click', () => {
    closeDropdowns();
    activeCard = card;
    pushHash(`r/${card.slug}`);
  });

  dropdown.appendChild(visitItem);
  dropdown.appendChild(detailItem);

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeDropdowns();
    if (!isOpen) dropdown.classList.add('open');
  });

  menuWrap.appendChild(menuBtn);
  menuWrap.appendChild(dropdown);
  meta.appendChild(menuWrap);
  wrap.appendChild(meta);

  /* ── Card click → detail panel ── */
  wrap.addEventListener('click', e => {
    if (e.target.closest('.card-menu-wrap')) return;
    activeCard = card;
    pushHash(`r/${card.slug}`);
  });

  return wrap;
}

function buildFaviconLg(card) {
  if (card.favicon_url) {
    const img = el('img', { className: 'card-favicon-lg', alt: '' });
    img.src = card.favicon_url;
    img.onerror = () => img.replaceWith(fallbackIconLg(card.title));
    return img;
  }
  return fallbackIconLg(card.title);
}

function fallbackIconLg(title) {
  const d = el('div', { className: 'card-favicon-lg-fallback' });
  d.textContent = title.charAt(0).toUpperCase();
  return d;
}

function closeDropdowns() {
  document.querySelectorAll('.card-dropdown.open').forEach(d => d.classList.remove('open'));
}

/* ── Detail panel ──────────────────────────────────────── */
function bindPanel() {
  document.getElementById('panelOverlay').addEventListener('click', () => closePanel());
  document.getElementById('panelClose').addEventListener('click',   () => closePanel());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (activeCard) closePanel();
      else closeDropdowns();
    }
  });

  document.addEventListener('click', () => closeDropdowns());
}

function openPanel(card) {
  const panel   = document.getElementById('detailPanel');
  const overlay = document.getElementById('panelOverlay');
  const content = document.getElementById('panelContent');

  content.innerHTML = `
    <span class="panel-cat-tag tag-${card.category}">${CAT_LABELS[card.category]}</span>
    <h1 class="panel-title">${esc(card.title)}</h1>
    <p class="panel-description">${esc(card.description)}</p>
    ${card.tags?.length ? `
      <div class="panel-tags">
        ${card.tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join('')}
      </div>
    ` : ''}
    <p class="panel-meta">Added: ${fmtDate(card.date_added)}</p>
    <hr class="panel-divider" />
    <p class="panel-url-label">URL</p>
    <a class="panel-url" href="${esc(card.url)}" target="_blank" rel="noopener noreferrer">${esc(card.url)}</a>
    <a class="panel-cta" href="${esc(card.url)}" target="_blank" rel="noopener noreferrer">Visit Page →</a>
  `;

  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePanel(silent = false) {
  const panel   = document.getElementById('detailPanel');
  const overlay = document.getElementById('panelOverlay');

  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (!silent && activeCard) {
    activeCard = null;
    history.pushState(null, '', location.pathname);
    syncNav();
  }
}

/* ── Helpers ───────────────────────────────────────────── */
function el(tag, props = {}) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  return node;
}

function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Go ────────────────────────────────────────────────── */
init();
