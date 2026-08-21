/* ============================================================
 * reveal.js — scroll-triggered entrance animations.
 * Progressive enhancement: no-JS and prefers-reduced-motion
 * users see everything immediately.
 * ============================================================ */

const SELECTOR = [
  '.seo-card',
  'details.faq',
  '.faq-item',
  '.guide-card',
  '.duel-card',
  '.vs-live',
  '.chart-card',
  '.chart-card-static',
  '.cta-band',
  '.model-hero',
  '.provider-section'
].join(', ');

function initReveal() {
  const targets = document.querySelectorAll(SELECTOR);
  if (!targets.length) return;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return; // keep content fully visible

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('rv-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -36px 0px' });

  let group = 0;
  let lastTop = null;
  targets.forEach((el) => {
    if (el.classList.contains('rv') || el.classList.contains('rv-in')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9 && rect.top > 0) {
      // already in first viewport — stagger siblings slightly
      if (lastTop === null || Math.abs(rect.top - lastTop) > 40) group = 0;
      else group = Math.min(group + 1, 4);
      lastTop = rect.top;
      el.style.setProperty('--rd', (group * 70) + 'ms');
    }
    el.classList.add('rv');
    io.observe(el);
  });
}

document.addEventListener('astro:page-load', initReveal);
