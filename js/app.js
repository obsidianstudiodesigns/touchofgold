// Shared behaviour for every page: header, smooth scroll, reveals, cart drawer, quick view.
import { PRODUCTS } from './products.js';

export const WHATSAPP = '27737571675';
const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// South African formatting: R 24 220
export const rand = (n) => 'R ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const catLabel = { gold: 'Gold & diamond', bands: 'Titanium & tungsten', watches: 'Watches' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- header ---------------- */
const header = $('.site-header');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  header?.classList.toggle('scrolled', y > 40);
  header?.classList.toggle('hidden', y > 400 && y > lastY && !document.body.classList.contains('locked'));
  lastY = y;
}, { passive: true });
const menuBtn = $('.menu-btn'), links = $('.nav-links');
menuBtn?.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
links?.addEventListener('click', (e) => { if (e.target.closest('a')) { links.classList.remove('open'); menuBtn?.setAttribute('aria-expanded', false); } });

/* ---------------- smooth scroll + reveals ---------------- */
let lenis;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href') === '#') return;
  const t = document.querySelector(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.4 }) : t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});

export function setupReveals(root = document) {
  if (reduceMotion || !window.gsap) return;
  document.documentElement.classList.add('reveal-ready');
  gsap.registerPlugin(ScrollTrigger);
  $$('[data-reveal]', root).forEach((el) => {
    const clip = el.dataset.reveal === 'clip';
    gsap.to(el, {
      ...(clip ? { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.out' } : { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }),
      delay: +(el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  // gentle parallax on marked images
  $$('[data-parallax]', root).forEach((img) => {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ---------------- cart ---------------- */
const KEY = 'togd-cart-v1';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch { cart = []; }
cart = cart.filter((l) => byId.has(l.id));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };

export function addToCart(id, qty = 1) {
  const p = byId.get(id);
  if (!p || !p.stock) return;
  const line = cart.find((l) => l.id === id);
  line ? (line.qty += qty) : cart.push({ id, qty });
  save(); renderCart(true);
  toast(`${p.brand === '9ct Yellow Gold' ? '' : p.brand + ' '}${p.name} added to your bag`);
}
function setQty(id, qty) {
  const line = cart.find((l) => l.id === id);
  if (!line) return;
  line.qty = Math.max(0, qty);
  cart = cart.filter((l) => l.qty > 0);
  save(); renderCart();
}

// drawer markup is injected so each page stays lean
document.body.insertAdjacentHTML('beforeend', `
  <div class="scrim" data-close></div>
  <aside class="drawer" id="cart" aria-labelledby="cart-title" role="dialog" aria-modal="true">
    <div class="drawer-head">
      <h2 id="cart-title">Your bag</h2>
      <button class="icon-btn" data-close aria-label="Close bag"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <div class="drawer-body"></div>
    <div class="drawer-foot"></div>
  </aside>
  <dialog class="qv" aria-labelledby="qv-title"></dialog>
  <div class="toast" role="status" aria-live="polite"></div>`);

const drawer = $('#cart'), scrim = $('.scrim');
let lastFocus;
export function openCart() {
  lastFocus = document.activeElement;
  drawer.classList.add('on'); scrim.classList.add('on'); document.body.classList.add('locked');
  lenis?.stop();
  setTimeout(() => drawer.querySelector('button')?.focus(), 50);
}
function closeCart() {
  drawer.classList.remove('on'); scrim.classList.remove('on'); document.body.classList.remove('locked');
  lenis?.start(); lastFocus?.focus?.();
}
$$('[data-open-cart]').forEach((b) => b.addEventListener('click', openCart));
document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeCart(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('on')) closeCart(); });

function renderCart(bump) {
  const count = cart.reduce((n, l) => n + l.qty, 0);
  $$('.cart-count').forEach((c) => {
    c.textContent = count; c.classList.toggle('has', count > 0);
    if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  });
  const body = $('.drawer-body', drawer), foot = $('.drawer-foot', drawer);
  if (!cart.length) {
    body.innerHTML = `<div class="empty"><h3>Your bag is empty</h3><p>Add a piece from the shop, or ask us to make one for you.</p><a class="btn btn-ghost" href="shop.html">Browse the shop</a></div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = cart.map(({ id, qty }) => {
    const p = byId.get(id);
    return `<div class="line-item">
      <img src="${p.img[0]}" alt="" width="76" height="76" loading="lazy">
      <div><small>${esc(p.brand)}</small><h4>${esc(p.name)}</h4>
        <div class="qty"><button aria-label="One fewer" data-q="${id}" data-d="-1">−</button><span>${qty}</span><button aria-label="One more" data-q="${id}" data-d="1">+</button></div>
      </div>
      <div style="text-align:right"><div class="price">${rand(p.price * qty)}</div><button class="remove" data-rm="${id}">Remove</button></div>
    </div>`;
  }).join('');
  const total = cart.reduce((n, l) => n + byId.get(l.id).price * l.qty, 0);
  foot.innerHTML = `
    <div class="total"><span>Subtotal</span><span>${rand(total)}</span></div>
    <p class="drawer-note">Collect in Witbank or Pretoria, or we'll arrange insured delivery. We confirm stock and sizing with you before payment.</p>
    <a class="btn btn-gold block" target="_blank" rel="noopener" href="${orderLink(total)}">Place order on WhatsApp</a>
    <a class="btn btn-ghost block" href="mailto:info@togd.co.za?subject=${encodeURIComponent('Order enquiry')}&body=${encodeURIComponent(orderText(total))}">Or email the order</a>`;
}
function orderText(total) {
  return 'Hello Touch of Gold, I would like to order:\n' +
    cart.map(({ id, qty }) => { const p = byId.get(id); return `• ${qty} × ${p.brand} ${p.name} (#${p.id}) — ${rand(p.price * qty)}`; }).join('\n') +
    `\nSubtotal: ${rand(total)}`;
}
const orderLink = (total) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(orderText(total))}`;
drawer.addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]'); const rm = e.target.closest('[data-rm]');
  if (q) setQty(+q.dataset.q, cart.find((l) => l.id === +q.dataset.q).qty + +q.dataset.d);
  if (rm) setQty(+rm.dataset.rm, 0);
});
renderCart();

/* ---------------- toast ---------------- */
let toastT;
function toast(msg) {
  const t = $('.toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ---------------- product cards & quick view ---------------- */
export function cardHTML(p, i = 0) {
  const badge = !p.stock ? '<span class="badge out">Sold out</span>' : p.was ? `<span class="badge">Save ${Math.round((1 - p.price / p.was) * 100)}%</span>` : '';
  return `<article class="card" data-cat="${p.cat}" style="--i:${i}">
    <button class="card-ph sweep" data-qv="${p.id}" aria-label="Quick view: ${esc(p.name)}">${badge}
      <img src="${p.img[0]}" alt="${esc(p.brand + ' ' + p.name)}" loading="lazy" width="600" height="600"></button>
    <div class="card-body">
      <span class="card-brand">${esc(p.brand)}</span>
      <h3><button data-qv="${p.id}">${esc(p.name)}</button></h3>
      <div class="card-foot">
        <span class="price">${rand(p.price)}${p.was ? ` <s>${rand(p.was)}</s>` : ''}</span>
        ${p.stock ? `<button class="add" data-add="${p.id}">Add to bag</button>` : `<a class="add" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, could you order in the ${p.brand} ${p.name} (#${p.id})?`)}" target="_blank" rel="noopener">Ask to order</a>`}
      </div>
    </div>
  </article>`;
}

const qv = $('dialog.qv');
function openQV(id) {
  const p = byId.get(id); if (!p) return;
  qv.innerHTML = `
    <button class="icon-btn qv-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="qv-grid">
      <div class="qv-media"><img src="${p.img[0]}" alt="${esc(p.brand + ' ' + p.name)}">
        ${p.img.length > 1 ? `<div class="qv-thumbs">${p.img.map((s, i) => `<button aria-label="Image ${i + 1}" aria-pressed="${i === 0}" data-src="${s}"><img src="${s}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="qv-info">
        <span class="card-brand">${esc(p.brand)} · ${catLabel[p.cat]}</span>
        <h2 id="qv-title">${esc(p.name)}</h2>
        <div class="price">${rand(p.price)}${p.was ? ` <s>${rand(p.was)}</s>` : ''}</div>
        ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}
        <p>${p.cat === 'gold' ? 'Made in our workshop. Resizing is included, and we can remake this design in white or rose gold on request.' : p.cat === 'watches' ? 'Sold with the full manufacturer warranty. Strap sizing and future battery changes are done in-store.' : 'Need a different size? We can order it in, usually within a week.'}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:auto">
          ${p.stock ? `<button class="btn btn-gold" data-add="${p.id}">Add to bag · ${rand(p.price)}</button>` : `<a class="btn btn-gold" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, could you order in the ${p.brand} ${p.name} (#${p.id})?`)}">Ask us to order it</a>`}
          <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi, I have a question about the ${p.brand} ${p.name} (#${p.id}).`)}">Ask a question</a>
        </div>
      </div>
    </div>`;
  qv.showModal(); lenis?.stop();
  // jeweller's loupe: zoom follows pointer
  const media = $('.qv-media', qv), img = $('img', media);
  media.addEventListener('pointermove', (e) => {
    if (e.target.closest('.qv-thumbs')) return;
    const r = media.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    img.style.transform = 'scale(2)';
  });
  media.addEventListener('pointerleave', () => { img.style.transform = ''; });
}
qv.addEventListener('close', () => lenis?.start());
qv.addEventListener('click', (e) => {
  if (e.target === qv || e.target.closest('.qv-close')) qv.close();
  const th = e.target.closest('[data-src]');
  if (th) { $('.qv-media > img', qv).src = th.dataset.src; $$('[data-src]', qv).forEach((b) => b.setAttribute('aria-pressed', b === th)); }
});

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) {
    addToCart(+add.dataset.add);
    add.classList.add('added'); const t = add.textContent; add.textContent = 'Added';
    setTimeout(() => { add.classList.remove('added'); add.textContent = t; }, 1400);
    return;
  }
  const v = e.target.closest('[data-qv]');
  if (v) openQV(+v.dataset.qv);
});

export { PRODUCTS, byId, lenis };
