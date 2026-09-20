/*
 * Resolve the theme before first paint, so dark mode never flashes light.
 * A file rather than an inline script, so the Content-Security-Policy can
 * refuse inline scripts outright (see vercel.json).
 */
(function () {
  var pref = 'system';
  try {
    pref = JSON.parse(localStorage.getItem('standup.settings') || '{}').theme || 'system';
  } catch {
    // No stored settings, or storage is blocked: fall back to the OS.
  }
  var dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
