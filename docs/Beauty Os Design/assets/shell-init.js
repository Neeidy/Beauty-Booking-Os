// Load shell HTML into the page, mark current route active
(async function () {
  const mount = document.getElementById('shell-mount');
  if (!mount) return;
  try {
    const res = await fetch('assets/shell.html');
    mount.innerHTML = await res.text();
  } catch (e) {
    // In file:// contexts fetch may fail. Fallback: inline the shell.
    mount.innerHTML = window.__INLINE_SHELL__ || '';
  }
  // Admin sidebar partial
  const side = document.getElementById('admin-sidebar-mount');
  if (side) {
    try {
      const res = await fetch('assets/admin-sidebar.html');
      side.innerHTML = await res.text();
    } catch (e) {}
    const adm = document.body.dataset.adm;
    side.querySelectorAll('[data-adm]').forEach(l => {
      if (l.dataset.adm === adm) l.classList.add('active');
    });
  }
  const route = document.body.dataset.route;
  document.querySelectorAll('.shell-nav-link').forEach(l => {
    if (l.dataset.route === route) l.classList.add('active');
  });
  // Kick init for anything that was injected
  if (window.__vgsRefresh) window.__vgsRefresh();
  // Theme + tweaks need to attach to freshly-injected nodes — shell.js uses delegation so it's fine,
  // but re-apply theme labels now that the DOM exists
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const tl = document.querySelector('[data-theme-label]');
  if (tl) tl.textContent = theme === 'dark' ? 'Dark' : 'Light';
  const ti = document.querySelector('[data-theme-icon]');
  if (ti) ti.textContent = theme === 'dark' ? '☾' : '☀';
  // Re-apply tweak values to newly rendered inputs
  const ev = new Event('input', { bubbles: true });
  document.querySelectorAll('[data-font-scale],[data-radius],[data-density]').forEach(el => el.dispatchEvent(ev));
  // Re-apply accent swatch active state
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
  document.querySelectorAll('.tweaks-swatch').forEach(s => {
    if (s.dataset.accent.toLowerCase() === accent.toLowerCase()) s.classList.add('active');
  });
})();
