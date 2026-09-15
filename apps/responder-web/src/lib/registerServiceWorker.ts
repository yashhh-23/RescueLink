'use client';

/**
 * Registers /public/sw.js (map tile + incident-list caching, see that file
 * for exactly what it does and does not cache). No-ops safely in any
 * browser/context without Service Worker support instead of throwing.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failing (e.g. insecure context in some dev setups)
      // should never block the dashboard — offline mode is a bonus, not
      // a requirement for the app to function.
    });
  });
}
