// Shell: theme toggle, tweaks panel, reveal animations, image fallbacks
(function () {
  const KEY_THEME = 'vgs-theme';
  const KEY_TWEAKS = 'vgs-tweaks';

  // ── Theme ──
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const t = document.querySelector('[data-theme-label]');
    if (t) t.textContent = theme === 'dark' ? 'Dark' : 'Light';
    const ti = document.querySelector('[data-theme-icon]');
    if (ti) ti.textContent = theme === 'dark' ? '☾' : '☀';
  }
  const savedTheme = localStorage.getItem(KEY_THEME) || 'light';
  applyTheme(savedTheme);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    localStorage.setItem(KEY_THEME, next);
    applyTheme(next);
  });

  // ── Tweaks ──
  const defaultTweaks = {
    accent: '#037AFF',
    radius: 1,
    fontScale: 1,
    density: 1,
  };
  let tweaks = Object.assign({}, defaultTweaks, JSON.parse(localStorage.getItem(KEY_TWEAKS) || '{}'));

  function applyTweaks() {
    const root = document.documentElement;
    root.style.setProperty('--color-accent', tweaks.accent);
    root.style.setProperty('--font-scale', tweaks.fontScale);
    root.style.setProperty('--density', tweaks.density);
    const base = { 1: 12, 0.6: 8, 1.4: 16, 1.8: 20 };
    // radius scale
    root.style.setProperty('--radius-sm', (8 * tweaks.radius) + 'px');
    root.style.setProperty('--radius-md', (12 * tweaks.radius) + 'px');
    root.style.setProperty('--radius-lg', (16 * tweaks.radius) + 'px');
    root.style.setProperty('--radius-xl', (20 * tweaks.radius) + 'px');
    root.style.setProperty('--radius-2xl', (24 * tweaks.radius) + 'px');
    localStorage.setItem(KEY_TWEAKS, JSON.stringify(tweaks));
    // update active swatches
    document.querySelectorAll('.tweaks-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.accent === tweaks.accent);
    });
    const fs = document.querySelector('[data-font-scale]');
    if (fs) fs.value = tweaks.fontScale;
    const rd = document.querySelector('[data-radius]');
    if (rd) rd.value = tweaks.radius;
    const dn = document.querySelector('[data-density]');
    if (dn) dn.value = tweaks.density;
  }

  document.addEventListener('click', (e) => {
    const sw = e.target.closest('.tweaks-swatch');
    if (sw) { tweaks.accent = sw.dataset.accent; applyTweaks(); return; }
    const close = e.target.closest('[data-tweaks-close]');
    if (close) { togglePanel(false); return; }
    const fab = e.target.closest('[data-tweaks-open]');
    if (fab) { togglePanel(true); return; }
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-font-scale]')) { tweaks.fontScale = parseFloat(e.target.value); applyTweaks(); }
    if (e.target.matches('[data-radius]')) { tweaks.radius = parseFloat(e.target.value); applyTweaks(); }
    if (e.target.matches('[data-density]')) { tweaks.density = parseFloat(e.target.value); applyTweaks(); }
  });

  function togglePanel(open) {
    const panel = document.querySelector('.tweaks-panel');
    const fab = document.querySelector('.tweaks-fab');
    if (!panel) return;
    panel.classList.toggle('open', open);
    if (fab) fab.classList.toggle('hidden', open);
  }

  // ── Reveal on scroll ──
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.revealDelay || '0', 10);
        setTimeout(() => e.target.classList.add('in'), delay);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  }

  // ── Image fallbacks ──
  function wireImages() {
    document.querySelectorAll('.img-wrap img').forEach(img => {
      if (img.complete && img.naturalWidth > 0) return;
      img.addEventListener('error', () => {
        img.style.display = 'none';
        const wrap = img.parentElement;
        if (wrap && !wrap.querySelector('.fallback')) {
          const fb = document.createElement('div');
          fb.className = 'fallback';
          fb.textContent = img.dataset.label || 'IMAGE';
          wrap.appendChild(fb);
        }
      });
    });
  }

  function init() {
    applyTweaks();
    observeReveals();
    wireImages();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  // Re-run when pages dynamically inject (not used here, but safe)
  window.__vgsRefresh = () => { observeReveals(); wireImages(); };
})();
