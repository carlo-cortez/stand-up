/*
 * Phase changes go to one polite live region that lives outside the React
 * tree (see index.html), so an announcement survives the route change that
 * often follows it — "Round finished" is said as Home appears.
 */
export function announce(message: string): void {
  const region = document.getElementById('announcer');
  if (!region) return;
  // Clearing first makes a repeated message announce again.
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}
