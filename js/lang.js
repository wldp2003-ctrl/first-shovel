// 다국어(i18n) 핵심 — t('키', {변수}) 하나로 모든 문장을 가져온다
// 번역 파일: locales/ko.json · zh.json · vi.json · ru.json  (없는 키는 한국어로 대신 보여줌)
export const LANG_IDS = ['ko', 'zh', 'vi', 'ru'];
export const LANG_NAMES = { ko: '한국어', zh: '中文', vi: 'Tiếng Việt', ru: 'Русский' };
const dict = { ko: {}, zh: {}, vi: {}, ru: {} };
const defaults = {}; // 데이터 파일에 적힌 한국어 원문 (ko.json이 없을 때 대비)
const koBack = new Map(); // 번역문 → 한국어 (한국어 함께 보기)
let cur = 'ko', showKo = false;
const hasLoc = typeof location !== 'undefined';
export const DEV = hasLoc && (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /[?&]dev=1/.test(location.search));

export const lang = () => cur;
export const koOn = () => showKo && cur !== 'ko';
export const showKoSetting = () => showKo;
export function setShowKo(v) { showKo = !!v; applyDom(); }

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s);
const missing = new Set();
let missTimer = null;
function noteMissing(key) {
  if (!DEV || missing.has(key)) return;
  missing.add(key);
  clearTimeout(missTimer);
  missTimer = setTimeout(() => console.warn(`[i18n] 빠진 번역 키 (${cur}) ${missing.size}개:`, [...missing]), 800);
}
export const missingKeys = () => [...missing];

export function t(key, vars) {
  const ko = dict.ko[key] ?? defaults[key];
  let s = cur === 'ko' ? ko : dict[cur]?.[key];
  if (s == null) { if (cur !== 'ko') noteMissing(key); s = ko ?? key; }
  const out = fill(s, vars);
  if (cur !== 'ko' && ko != null && out.length > 1) {
    const kv = vars ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'string' ? (koBack.get(v) ?? v) : v])) : null;
    const k = fill(ko, kv);
    if (k !== out) { if (koBack.size > 4000) koBack.delete(koBack.keys().next().value); koBack.set(out, k); }
  }
  return out;
}
// 번역된 문장의 한국어 원문 (한국어 함께 보기용)
export const koOf = (s) => koBack.get(s);
export const has = (key) => dict[cur]?.[key] != null || dict.ko[key] != null || defaults[key] != null;

/* ---------- 데이터 객체를 언어에 따라 바뀌게 감싸기 ----------
   문자열 속성을 getter로 바꿔서 기존 코드(def.name 등)를 그대로 써도 현재 언어로 나온다.
   {ko, zh, vi, ru} 모양의 객체는 이미 번역된 것으로 보고 번역표에 등록만 한다. */
export const seeds = { ko: {}, zh: {}, vi: {}, ru: {} };
const bound = []; // 번역 파일 값을 다시 써 넣을 곳: { key, set(lang, value) }
export function localize(obj, prefix, skip = []) {
  const skipSet = new Set(skip);
  const handle = (o, k, v, key) => {
    if (skipSet.has(k)) return;
    if (typeof v === 'string') {
      if (!/[가-힣]/.test(v)) return;
      defaults[key] = v;
      Object.defineProperty(o, k, { get: () => t(key), enumerable: true, configurable: true });
    } else if (v && typeof v === 'object') {
      if (typeof v.ko === 'string' && typeof v.zh === 'string') { LANG_IDS.forEach((l) => { if (v[l] != null) seeds[l][key] = v[l]; }); defaults[key] = v.ko; bound.push({ key, set: (l, val) => { v[l] = val; } }); return; }
      walk(v, key);
    }
  };
  const walk = (o, p) => {
    if (Array.isArray(o)) o.forEach((v, i) => handle(o, i, v, `${p}.${(v && typeof v === 'object' && !Array.isArray(v) && v.id) || i}`));
    else Object.keys(o).forEach((k) => handle(o, k, o[k], `${p}.${k}`));
  };
  walk(obj, prefix);
  return obj;
}
export const allDefaults = () => defaults;
// { ko: {...}, zh: {...}, ... } 처럼 언어별로 나뉜 표를 번역표에 등록 (코드는 표를 그대로 써도 됨)
export function seedTable(table, prefix) {
  const walk = (node, p) => {
    if (typeof node === 'string') {
      defaults[p] = node; seeds.ko[p] = node;
      const path = p.slice(prefix.length + 1).split('.');
      LANG_IDS.forEach((l) => { let v = table[l]; for (const k of path) v = v?.[k]; if (typeof v === 'string') seeds[l][p] = v; });
      bound.push({ key: p, set: (l, val) => { let o = table[l]; if (!o) return; for (const k of path.slice(0, -1)) o = o[k] ?? (o[k] = {}); o[path[path.length - 1]] = val; } });
    } else if (node && typeof node === 'object') Object.keys(node).forEach((k) => walk(node[k], `${p}.${k}`));
  };
  walk(table.ko, prefix);
}

/* ---------- 번역 파일 불러오기 · 언어 바꾸기 ---------- */
async function load(code) {
  if (Object.keys(dict[code]).length) return;
  try {
    const r = await fetch(`./locales/${code}.json`, { cache: 'no-cache' });
    if (r.ok) { dict[code] = await r.json(); bound.forEach((b) => { if (dict[code][b.key] != null) b.set(code, dict[code][b.key]); }); }
  } catch (e) { console.warn('[i18n] 번역 파일을 못 불러옴', code, e); }
}
const listeners = new Set();
export const onLangChange = (fn) => listeners.add(fn);
export async function setLang(code, { silent = false } = {}) {
  if (!LANG_IDS.includes(code)) code = 'ko';
  await load('ko');
  if (code !== 'ko') await load(code);
  cur = code;
  try { localStorage.setItem('cheotsap.lang', code); } catch {}
  if (hasLoc) {
    document.documentElement.lang = code === 'zh' ? 'zh-Hans' : code;
    LANG_IDS.forEach((l) => document.body?.classList.toggle('lang-' + l, l === code));
  }
  applyDom();
  if (!silent) listeners.forEach((fn) => fn(code));
}
export const savedLang = () => { try { return localStorage.getItem('cheotsap.lang'); } catch { return null; } };

// HTML의 data-i18n · data-i18n-ph(placeholder) · data-i18n-title
export function applyDom(root = hasLoc ? document : null) {
  if (!root) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const s = t(el.dataset.i18n);
    el.textContent = s;
    if (koOn() && el.dataset.i18nKo !== 'no') { const k = koOf(s); if (k) el.append(Object.assign(document.createElement('small'), { className: 'tl-ko', textContent: k })); }
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

/* ---------- 숫자 · 날짜 · 돈 ---------- */
const LOCALE = { ko: 'ko-KR', zh: 'zh-CN', vi: 'vi-VN', ru: 'ru-RU' };
export const num = (n, d = 0) => Number(n).toLocaleString(LOCALE[cur], { maximumFractionDigits: d });
// 게임 속 돈 단위는 "만원"(1만 원)
export function won(n) {
  n = Math.round(n);
  if (cur === 'ko') return `${num(n)}만원`;
  if (cur === 'zh') return `${num(n)}万韩元`;
  const neg = n < 0 ? '-' : ''; const a = Math.abs(n);
  if (cur === 'vi') return a >= 100 ? `${neg}${num(a / 100, 2)} triệu won` : `${neg}${num(a * 10000)} won`;
  return a >= 100 ? `${neg}${num(a / 100, 2)} млн вон` : `${neg}${num(a * 10)} тыс. вон`;
}
// 단위: 러시아어만 키릴 문자 단위를 쓴다
const UNITS = { ru: { mm: 'мм', 'm/s': 'м/с', kN: 'кН', MPa: 'МПа', kg: 'кг' } };
export const U = (u) => UNITS[cur]?.[u] ?? u;
const DOW = { ko: ['일', '월', '화', '수', '목', '금', '토'], zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] };
export function fmtDate(dateStr, withDow = true) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = DOW[cur][new Date(y, m - 1, d).getDay()];
  if (cur === 'zh') return `${m}月${d}日` + (withDow ? `(${w})` : '');
  if (cur === 'vi') return `${d}/${m}` + (withDow ? ` (${w})` : '');
  if (cur === 'ru') return `${d}.${String(m).padStart(2, '0')}` + (withDow ? ` (${w})` : '');
  return `${m}/${d}` + (withDow ? `(${w})` : '');
}

/* ---------- 번역 점검 (개발 모드): 한국어가 아닌 언어인데 한글이 남은 곳 표시 ---------- */
// 번역하지 않는 것: 회사 이름 · 게임 로고 · 닉네임 · 현장 말 퀴즈의 한국어 정답
export function checkHangul(keep = []) {
  document.querySelectorAll('.i18n-miss').forEach((e) => e.classList.remove('i18n-miss'));
  if (cur === 'ko') return 0;
  const walker = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT);
  const hits = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode, el = n.parentElement;
    if (!el) continue;
    let txt = n.nodeValue.replace(/지예건설|첫 삽/g, '');
    keep.forEach((k) => { if (k) txt = txt.split(k).join(''); });
    if (!/[가-힣]/.test(txt)) continue;
    if (el.closest('.tl-ko, [data-ko-ok], .hidden, script, style, .opt.term, .term-big, .plabel.me, .plabel.friend')) continue;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
    hits.add(el);
  }
  hits.forEach((e) => e.classList.add('i18n-miss'));
  return hits.size;
}
