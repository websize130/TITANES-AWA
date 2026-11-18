// inGameLock: durante una misión oculta TODO contenedor de AdSense (manual o automático) y
// cualquier badge/drawer/iframe inyectado por Netlify. Un MutationObserver vigila inyecciones tardías.
import { CONFIG, adsenseConfigured } from '../config.js';

const LOCK_SELECTORS = [
  'ins.adsbygoogle', '.ad-slot', '.ad-wrap', '.google-auto-placed', '.adsbygoogle-noablate',
  'iframe[id^="aswift"]', 'div[id^="aswift"]', 'iframe[id^="google_ads"]', 'div[id^="google_ads"]',
  'iframe[src*="googlesyndication"]', 'iframe[src*="doubleclick"]', '[data-anchor-status]', '[data-vignette-loaded]',
  '#netlify-badge', '.netlify-badge', '[class*="netlify-badge"]', 'netlify-drawer', '#netlify-drawer',
  '[id^="netlify"]', 'iframe[src*="netlify"]', 'iframe[title*="Netlify"]', '[data-netlify-deploy-id]',
].join(',');

let locked = false;
let observer = null;

function hide(el) {
  if (el.closest && el.closest('#game-root')) return; // nunca tocar el propio juego
  el.style.setProperty('display', 'none', 'important');
  el.style.setProperty('visibility', 'hidden', 'important');
  el.setAttribute('data-ingame-hidden', '1');
}

function sweep(root) {
  if (root.nodeType !== 1) return;
  if (root.matches(LOCK_SELECTORS)) hide(root);
  root.querySelectorAll(LOCK_SELECTORS).forEach(hide);
}

export const InGameLock = {
  get active() { return locked; },

  lock() {
    if (locked) return;
    locked = true;
    document.documentElement.classList.add('in-game-lock');
    sweep(document.body);
    if (!observer) {
      observer = new MutationObserver((muts) => {
        if (!locked) return;
        for (const m of muts) {
          for (const n of m.addedNodes) sweep(n);
          if (m.type === 'attributes' && m.target.nodeType === 1 && m.target.matches(LOCK_SELECTORS)) hide(m.target);
        }
      });
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  },

  unlock() {
    if (!locked) return;
    locked = false;
    observer && observer.disconnect();
    document.documentElement.classList.remove('in-game-lock');
    document.querySelectorAll('[data-ingame-hidden]').forEach((el) => {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.removeAttribute('data-ingame-hidden');
    });
  },
};

// ---------------------------------------------------------------- AdSense (solo menús)
let scriptLoaded = false;

export function initAds() {
  const configured = adsenseConfigured();
  document.querySelectorAll('ins.adsbygoogle').forEach((ins) => {
    const key = ins.dataset.slotKey;
    ins.setAttribute('data-ad-client', CONFIG.adsense.client);
    if (key && CONFIG.adsense.slots[key]) ins.setAttribute('data-ad-slot', CONFIG.adsense.slots[key]);
    if (!configured) ins.closest('.ad-wrap')?.classList.add('ad-placeholder');
  });
  if (!configured || scriptLoaded) return;
  scriptLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CONFIG.adsense.client)}`;
  document.head.appendChild(s);
}

// Rellena los anuncios de una pantalla de menú la primera vez que se muestra (nunca en partida).
export function fillAds(screenEl) {
  if (locked || !adsenseConfigured() || !screenEl) return;
  screenEl.querySelectorAll('ins.adsbygoogle:not([data-filled])').forEach((ins) => {
    if (ins.offsetWidth === 0) return;
    ins.setAttribute('data-filled', '1');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* bloqueador */ }
  });
}
