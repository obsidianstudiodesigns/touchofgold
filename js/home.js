import { PRODUCTS, cardHTML, setupReveals, WHATSAPP } from './app.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.getElementById('yr').textContent = new Date().getFullYear();

// featured: the gold pieces made in-house, then the best-loved watches
const featured = [...PRODUCTS.filter((p) => p.cat === 'gold'), ...PRODUCTS.filter((p) => p.brand === 'Michael Kors' && p.stock)];
document.getElementById('featured').innerHTML = featured.map(cardHTML).join('');

// hero entrance: the headline rises as the showroom lights come up on the ring
if (window.gsap && !reduceMotion) {
  gsap.from('.hero h1 .line > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.5 });
  gsap.from('.hero-fade', { opacity: 0, y: 18, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 1.0 });
}

setupReveals();

// bespoke: the pinned photo follows whichever step is in view
const steps = [...document.querySelectorAll('.step')];
const shots = [...document.querySelectorAll('.process-media img')];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    const i = steps.indexOf(e.target);
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    shots.forEach((s, j) => s.classList.toggle('on', j === i));
  }
}, { rootMargin: '-45% 0px -45% 0px' });
steps.forEach((s) => io.observe(s));

// enquiry form hands off to WhatsApp or email with the details filled in
const form = document.getElementById('ask');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const text = `Hello Touch of Gold, my name is ${d.get('name')} (${d.get('phone')}).\nI'm interested in: ${d.get('type')}.\n${d.get('msg') || ''}`.trim();
  const viaEmail = e.submitter?.dataset.via === 'email';
  const url = viaEmail
    ? `mailto:info@togd.co.za?subject=${encodeURIComponent('Enquiry: ' + d.get('type'))}&body=${encodeURIComponent(text)}`
    : `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  viaEmail ? (location.href = url) : open(url, '_blank', 'noopener');
});
