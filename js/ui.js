// 공용 UI 도우미
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
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}

let modalStack = [];
export function openModal({ title, body, cls = '', closable = true, onClose, wide = false }) {
  const layer = $('#modals');
  const card = h('div', { class: 'modal ' + cls + (wide ? ' wide' : '') });
  const back = h('div', { class: 'modal-back' }, card);
  if (title) card.append(h('div', { class: 'modal-title' }, h('span', {}, title), closable ? h('button', { class: 'x', 'aria-label': '닫기', onclick: () => close() }, '✕') : null));
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
export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}만원`;

// 캔버스 고해상도 준비
export function hiCanvas(w, h) {
  const c = document.createElement('canvas');
  const r = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * r; c.height = h * r; c.style.width = '100%'; c.style.maxWidth = w + 'px'; c.style.aspectRatio = `${w}/${h}`;
  const ctx = c.getContext('2d'); ctx.scale(r, r);
  return { c, ctx };
}
