import { PRODUCTS, cardHTML, setupReveals } from './app.js';

document.getElementById('yr').textContent = new Date().getFullYear();
const params = new URLSearchParams(location.search);
const state = { cat: params.get('cat') || 'all', for: params.get('for') || '', brand: '', q: '', sort: 'feat' };
const grid = document.getElementById('grid'), count = document.getElementById('count');
const chips = [...document.querySelectorAll('.chip')];
const brandSel = document.getElementById('brand'), brandWrap = document.getElementById('brand-wrap');
const forSel = document.getElementById('for');
forSel.value = state.for;

[...new Set(PRODUCTS.filter((p) => p.cat === 'watches').map((p) => p.brand))].sort()
  .forEach((b) => brandSel.add(new Option(b, b)));

function render() {
  chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.cat === state.cat));
  brandWrap.hidden = state.cat !== 'watches';
  const q = state.q.trim().toLowerCase();
  let list = PRODUCTS.filter((p) =>
    (state.cat === 'all' || p.cat === state.cat) &&
    (!state.for || p.for === state.for) &&
    (state.cat !== 'watches' || !state.brand || p.brand === state.brand) &&
    (!q || `${p.brand} ${p.name} ${p.desc}`.toLowerCase().includes(q)));
  const inStockFirst = (a, b) => b.stock - a.stock;
  const sorters = {
    feat: inStockFirst,
    lo: (a, b) => inStockFirst(a, b) || a.price - b.price,
    hi: (a, b) => inStockFirst(a, b) || b.price - a.price,
    sale: (a, b) => inStockFirst(a, b) || !!b.was - !!a.was,
  };
  list = list.slice().sort(sorters[state.sort]);
  count.textContent = list.length === 1 ? '1 piece' : `${list.length} pieces`;
  grid.innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<div class="empty" style="grid-column:1/-1"><h3>Nothing matches that search</h3><p>Try a different word, or ask us. We can usually order it in or make it.</p></div>`;
  grid.querySelectorAll('.card').forEach((c, i) => { c.classList.add('enter'); c.style.animationDelay = `${Math.min(i, 12) * 40}ms`; });
  const u = new URL(location);
  ['cat', 'for'].forEach((k) => (state[k] && state[k] !== 'all' ? u.searchParams.set(k, state[k]) : u.searchParams.delete(k)));
  history.replaceState(null, '', u);
}

chips.forEach((c) => c.addEventListener('click', () => { state.cat = c.dataset.cat; state.brand = ''; brandSel.value = ''; render(); }));
forSel.addEventListener('change', () => { state.for = forSel.value; render(); });
brandSel.addEventListener('change', () => { state.brand = brandSel.value; render(); });
document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
let t; document.getElementById('q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; render(); }, 150); });

render();
setupReveals();
