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

/* ── Card ──────────────────────────────────────────────── */
function buildCard(card) {
  const wrap = el('div', { className: 'card' });

  /* header row */
  const header = el('div', { className: 'card-header' });

  const faviconTitle = el('div', { className: 'card-favicon-title' });
  faviconTitle.appendChild(buildFavicon(card));

  const title = el('span', { className: 'card-title' });
  title.textContent = card.title;
  faviconTitle.appendChild(title);
  header.appendChild(faviconTitle);

  const tag = el('span', { className: `card-cat-tag tag-${card.category}` });
  tag.textContent = CAT_LABELS[card.category];
  header.appendChild(tag);

  wrap.appendChild(header);

  /* description */
  const desc = el('p', { className: 'card-description' });
  desc.textContent = card.description;
  wrap.appendChild(desc);

  /* tag pills */
  if (card.tags?.length) {
    const pills = el('div', { className: 'card-tags' });
    card.tags.forEach(t => {
      const pill = el('span', { className: 'tag-pill' });
      pill.textContent = t;
      pills.appendChild(pill);
    });
    wrap.appendChild(pills);
  }

  /* footer */
  const footer = el('div', { className: 'card-footer' });

  const date = el('span', { className: 'card-date' });
  date.textContent = `Added: ${fmtDate(card.date_added)}`;
  footer.appendChild(date);

  const visitBtn = el('a', { className: 'card-visit-btn' });
  visitBtn.textContent = '→ Visit';
  visitBtn.href   = card.url;
  visitBtn.target = '_blank';
  visitBtn.rel    = 'noopener noreferrer';
  visitBtn.addEventListener('click', e => e.stopPropagation());
  footer.appendChild(visitBtn);

  wrap.appendChild(footer);

  wrap.addEventListener('click', () => {
    activeCard = card;
    pushHash(`r/${card.slug}`);
  });

  return wrap;
}

function buildFavicon(card) {
  if (card.favicon_url) {
    const img = el('img', { className: 'card-favicon', alt: '' });
    img.src = card.favicon_url;
    img.onerror = () => img.replaceWith(fallbackIcon(card.title));
    return img;
  }
  return fallbackIcon(card.title);
}

function fallbackIcon(title) {
  const d = el('div', { className: 'card-favicon-fallback' });
  d.textContent = title.charAt(0).toUpperCase();
  return d;
}

/* ── Detail panel ──────────────────────────────────────── */
function bindPanel() {
  document.getElementById('panelOverlay').addEventListener('click', () => closePanel());
  document.getElementById('panelClose').addEventListener('click',   () => closePanel());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeCard) closePanel();
  });
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
