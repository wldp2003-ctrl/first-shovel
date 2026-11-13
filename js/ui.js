// 공용 UI 도우미
// v10: append(..., 조건 ? 요소 : null)에서 null·false가 "null" 글자로 찍히지 않게 전체에서 건너뛴다
if (typeof Element !== 'undefined' && !Element.prototype.append.__skipNull) {
  const orig = Element.prototype.append;
  Element.prototype.append = function (...nodes) { return orig.apply(this, nodes.filter((n) => n != null && n !== false)); };
  Element.prototype.append.__skipNull = true;
}
import { t as $t, koOn, koOf } from './lang.js';
export const $ = (s, el = document) => el.querySelector(s);

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  const noKo = attrs && attrs['data-no-ko'] != null;
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    if (k.nodeType) { el.append(k); continue; }
    const str = String(k);
    el.append(document.createTextNode(str));
    // 한국어 함께 보기: 번역된 문장 아래 작은 한국어
    const ko = !noKo && koOn() && koOf(str);
    if (ko) { const sm = document.createElement('small'); sm.className = 'tl-ko'; sm.textContent = ko; el.append(sm); }
  }
  return el;
}

let modalStack = [];
export function openModal({ title, body, cls = '', closable = true, onClose, wide = false }) {
  const layer = $('#modals');
  const card = h('div', { class: 'modal ' + cls + (wide ? ' wide' : '') });
  const back = h('div', { class: 'modal-back' }, card);
  if (title) card.append(h('div', { class: 'modal-title' }, h('span', {}, title), closable ? h('button', { class: 'x', 'aria-label': $t('ui.openModal.1'), onclick: () => close() }, '✕') : null));
  const content = h('div', { class: 'modal-body' });
  if (typeof body === 'string') content.innerHTML = body; else if (body) content.append(body);
  card.append(content);
  layer.append(back);
  let closed = false;
  function close(v) {
    if (closed) return; closed = true;
    back.classList.add('out');
    setTimeout(() => back.remove(), 180);
    modalStack = modalStack.filter((m) => m !== api);
    onClose?.(v);
    api.onClose?.(v);
  }
  const api = { el: card, body: content, close, setBody(n) { content.innerHTML = ''; typeof n === 'string' ? (content.innerHTML = n) : content.append(n); } };
  modalStack.push(api);
  return api;
}
export const anyModal = () => modalStack.length > 0;
export function closeAllModals() { [...modalStack].forEach((m) => m.close()); }

export function toast(msg, kind = '') {
  const t = h('div', { class: 'toast ' + kind }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export { won } from './lang.js';

// 캔버스 고해상도 준비
export function hiCanvas(w, h) {
  const c = document.createElement('canvas');
  const r = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * r; c.height = h * r; c.style.width = '100%'; c.style.maxWidth = w + 'px'; c.style.aspectRatio = `${w}/${h}`;
  const ctx = c.getContext('2d'); ctx.scale(r, r);
  return { c, ctx };
}
