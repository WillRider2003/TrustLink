/**
 * Interactividad de la landing informativa. Todo es cosmético
 * (animaciones de conteo, reveal al hacer scroll) — no hay lógica
 * de negocio ni llamadas a backend aquí.
 */

function tlCountUp(el, target, duration = 1400, decimals = 0, prefix = '', suffix = '') {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = target * eased;
    el.textContent = prefix + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', () => {
  // Contadores animados de la sección de stats
  const statEls = document.querySelectorAll('[data-countup]');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.countup);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        tlCountUp(el, target, 1400, decimals, prefix, suffix);
        statObserver.unobserve(el);
      }
    });
  }, { threshold: 0.4 });
  statEls.forEach(el => statObserver.observe(el));

  // Reveal suave de secciones al entrar en viewport
  const revealEls = document.querySelectorAll('.tl-reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .7s ease, transform .7s ease';
    revealObserver.observe(el);
  });
});
