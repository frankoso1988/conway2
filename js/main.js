// ui.js — interacción con el usuario y utilidades DOM
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
export const on = (el, ev, fn, opts) => el.addEventListener(ev, fn, opts);

export function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { hour12: false });
}
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
// throttle simple
export function throttle(fn, ms) {
  let t = 0, pending = false, lastArgs = null;
  return (...args) => {
    const now = performance.now();
    lastArgs = args;
    if (now - t >= ms) { t = now; fn(...lastArgs); pending = false; }
    else if (!pending) {
      pending = true;
      setTimeout(() => { t = performance.now(); fn(...lastArgs); pending = false; }, ms - (now - t));
    }
  };
}
