// 3D 게임 화면의 아이콘 표시(⟦이름⟧)를 직접 그린 SVG 아이콘으로 바꿔 그린다 (v12.1 — 이모지 대신)
// 게임 코드는 문구에 ⟦warn⟧ 처럼 적고, 이 모듈이 화면에 붙는 순간 아이콘으로 바꾼다.
// 아이콘을 넣을 수 없는 곳(캔버스 글자, 알림창, 선택 상자 글, 탭 제목, title 같은 속성)에서는 표시만 지운다.
import { icon } from './learn/icons.js';

const RE = /⟦([a-z-]+)⟧/g;
const DOT = { 'dot-safe': 'var(--safe)', 'dot-caution': 'var(--caution)', 'dot-brand': 'var(--brand)', 'dot-off': 'var(--locked)' };
const strip = (s) => (typeof s === 'string' && s.includes('⟦') ? s.replace(RE, '').replace(/\s{2,}/g, ' ').trim() : s);
const NO_HTML = new Set(['OPTION', 'TEXTAREA', 'TITLE', 'SCRIPT', 'STYLE']);

function iconEl(name) {
  const sp = document.createElement('span');
  sp.className = 'gi gi-' + name;
  if (DOT[name]) sp.style.color = DOT[name];
  sp.innerHTML = icon(DOT[name] ? 'dot' : name, { size: 18 });
  return sp;
}
function fixText(node) {
  const s = node.nodeValue;
  if (!s || !s.includes('⟦')) return;
  const p = node.parentNode;
  if (!p || NO_HTML.has(p.nodeName) || p.closest?.('svg')) { node.nodeValue = strip(s); return; }
  const frag = document.createDocumentFragment();
  let last = 0;
  s.replace(RE, (m, name, i) => { if (i > last) frag.append(s.slice(last, i)); frag.append(iconEl(name)); last = i + m.length; return m; });
  if (last < s.length) frag.append(s.slice(last));
  node.replaceWith(frag);
}
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
function fixAttrs(el) { for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && v.includes('⟦')) el.setAttribute(a, strip(v)); } }
function walk(root) {
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1) return;
  fixAttrs(root);
  root.querySelectorAll?.(ATTRS.map((a) => `[${a}*="⟦"]`).join(',')).forEach(fixAttrs);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = [];
  while (tw.nextNode()) if (tw.currentNode.nodeValue.includes('⟦')) list.push(tw.currentNode);
  list.forEach(fixText);
}
walk(document.documentElement);
new MutationObserver((ms) => {
  for (const m of ms) {
    if (m.type === 'characterData') fixText(m.target);
    else if (m.type === 'attributes') fixAttrs(m.target);
    else m.addedNodes.forEach(walk);
  }
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

// 캔버스 글자·알림창·제목: 표시만 지움
for (const fn of ['fillText', 'strokeText', 'measureText']) {
  const orig = CanvasRenderingContext2D.prototype[fn];
  CanvasRenderingContext2D.prototype[fn] = function (t, ...a) { return orig.call(this, strip(String(t)), ...a); };
}
for (const fn of ['alert', 'confirm', 'prompt']) { const orig = window[fn].bind(window); window[fn] = (msg, ...a) => orig(strip(msg), ...a); }
const td = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
Object.defineProperty(document, 'title', { get: () => td.get.call(document), set: (v) => td.set.call(document, strip(v)) });
