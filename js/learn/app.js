// 첫 삽 1단계 — 기초 교육 앱 (게임과 분리)
// 레슨·카드·문제·근거는 data/lessons.json 한 파일에서 읽는다. 기록은 이 기기(localStorage)에만 저장.
import { art, dressFigure } from './art.js';
import { icon, LESSON_ICON, LESSON_TONE } from './icons.js';
import { logoMark, sapi, building } from './brand.js';
import { sceneFloor, pair, PAIR3D } from './scene-art.js';
import { makeScene3D, renderPairs, hasGL, SCENE3D_IDS } from './scene3d.js';
import { mountSite, renderSiteStill } from './site3d.js';
import { sceneTbm, sceneScaffold, sceneLifting, sceneEquip, scenePour, sceneHot, STOP } from './scene-art2.js';
import { renderMascot } from './mascot.js';
import { makeTitle, APP_VERSION } from './title.js';

// append(..., 조건 ? 요소 : null)에서 "null" 글자가 찍히지 않게
if (!Element.prototype.append.__skipNull) {
  const orig = Element.prototype.append;
  Element.prototype.append = function (...n) { return orig.apply(this, n.filter((x) => x != null && x !== false)); };
  Element.prototype.append.__skipNull = true;
}

const KEY = 'cheotsap.learn.v1';
const DONE_KEY = 'cheotsap.learn.done'; // 게임(game.html) 잠금 해제 표시
let D = null; // lessons.json
let SRC = {}; // sources.json (id → 출처)
// 근거 검증: 화면에는 원문확인 이상만. 초안은 ?dev=1 에서만 노란 테두리로
const DEV = /[?&]dev=1/.test(location.search);
const OK_STATUS = ['원문확인', '전문가확인'];
const shown = (o) => !!o && (OK_STATUS.includes(o.status) || DEV);
const isDraft = (o) => !!o && !OK_STATUS.includes(o.status);
const T = (o) => pseudo(o == null ? '' : typeof o === 'string' ? o : o.t);
let S = null; // 학습 기록
// 화면 문구: locales/ko.json 의 learn.* 키 (번역은 나중). ?pseudo=1 → 모든 문구를 40% 길게 (다국어 대비 시험)
let LOC = {};
const PSEUDO = /[?&]pseudo=1/.test(location.search);
const pseudo = (s) => { if (!PSEUDO || !s) return s; const fill = 'Ồ ẫ Жщ ệ Ðé '; const n = Math.ceil(String(s).length * 0.4); let x = ''; while (x.length < n) x += fill; return s + ' ' + x.slice(0, n); };
export const t = (k, vars) => { let v = LOC['learn.' + k] ?? k; if (vars) v = v.replace(/\{(\w+)\}/g, (m, n) => (vars[n] ?? m)); return pseudo(v); };
const ic = (name, o) => h('span', { class: 'icw', html: icon(name, o) });
// 화면 설정·연출 상태: 학습 기록(KEY)과 따로 둬서 예전 기록 형식을 바꾸지 않는다
const UIKEY = 'cheotsap.learn.ui';
let UI = { openDay: '', floorsSeen: 0, days: [], sound: false, vibrate: true, mode: 'pic' };
let SC = { scenes: [] }; // data/scenes.json (v13 현장 위험 찾기)
let PRE = { zones: {} }; // data/prerender.json (v17 미리 렌더링한 장면·지도 이미지와 누를 곳)
const PMETA = {}; // v19: 위험 id → { focus, marks, diff } (비교 그림 위 % 좌표)
const loadUI = () => { try { Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY) || '{}')); } catch {} };
const saveUI = () => { try { localStorage.setItem(UIKEY, JSON.stringify(UI)); } catch {} };
const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function markStudyDay() { const d = dayStr(); if (!UI.days.includes(d)) { UI.days.push(d); UI.days = UI.days.slice(-60); saveUI(); } }
// 연속 출근: 오늘(또는 어제)까지 이어진 날 수. 끊겨도 벌점·경고 없음
function streak() {
  const set = new Set(UI.days); let n = 0; const d = new Date();
  if (!set.has(dayStr(d))) d.setDate(d.getDate() - 1);
  while (set.has(dayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
// v20: 움직임 줄이기 — 설정에서 고르면 그 값, 아니면 기기 설정
const reduceMotion = () => (typeof UI.motion === 'boolean' ? UI.motion : !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
// v20 환경 설정 적용: 글자 크기(#app zoom) · 움직임 줄이기(html.rm) · 그림만 모드(html.pic)
function applyPrefs() {
  const r = document.documentElement;
  r.classList.toggle('rm', reduceMotion()); r.classList.toggle('view-pic', isPic());
  r.dataset.fs = UI.fontSize || 'm'; r.dataset.q3d = UI.q3d || 'auto';
}
// 안내 음성 자동 재생: 설정 값, 없으면 그림만 모드일 때 켬
const autoSayOn = () => (typeof UI.autoSay === 'boolean' ? UI.autoSay : isPic());
function autoSay() { if (!autoSayOn() || !canSpeak()) return; clearTimeout(autoSay.t); autoSay.t = setTimeout(() => speak(screenSay()), 450); }
// 효과음(기본 꺼짐): 직접 만든 짧은 소리 (WebAudio 합성, 파일 없음)
function tap() { buzz(8); if (!UI.sound) return; tone([[660, 0, 0.05]], 0.05); }
function tone(notes, vol = 0.06) {
  try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); const t0 = actx.currentTime;
    for (const [f, at, dur] of notes) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(vol, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur); o.connect(g).connect(actx.destination); o.start(t0 + at); o.stop(t0 + at + dur + 0.02); } } catch {}
}
function toast(msg) { const el = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(el); setTimeout(() => el.remove(), 2200); }
const buzz = (ms = 15) => { if (UI.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch {} };
let tab = 'home';
let live = null; // 지금 열린 레슨의 시간 측정 { id, t0 }

/* ---------------- 도우미 ---------------- */
const $ = (s, el = document) => el.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  // 라운드 1(axe aria-prohibited-attr): 이름표(aria-label)가 붙은 span 은 그림 하나로 읽히게 role="img"
  if ((tag === 'span' || tag === 'i') && attrs?.['aria-label'] && !attrs.role) el.setAttribute('role', 'img');
  return el;
}
const pic = (id, cls = 'pic') => h('div', { class: cls, html: art(id) });
const T0 = (o) => (o == null ? '' : typeof o === 'string' ? o : o.t);
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const rid = () => Math.random().toString(36).slice(2, 10);
const today = () => { const d = new Date(); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`; };
const chars = (c) => (T0(c.text) + T0(c.more)).replace(/\s/g, '').length;
const visCards = (x) => x.cards.map((c, i) => ({ ...c, i })).filter((c) => shown(c.text));
const visQuiz = (x) => x.quiz.map((q, i) => ({ ...q, i })).filter(shown);

/* ---------------- 기록 ---------------- */
const fresh = () => ({ v: 1, anon: rid(), created: Date.now(), pre: null, post: null, lessons: {}, wrong: [], hours: {}, name: '', certAt: null });
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return Object.assign(fresh(), s); } catch {} return fresh(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DONE_KEY, isComplete() ? '1' : ''); } catch {} }
const L = (id) => (S.lessons[id] ||= { status: 'new', step: 'goals', card: 0, qi: 0, timeMs: 0, first: {}, retries: 0, actTries: 0 });
const lessonsDone = () => D.lessons.filter((x) => S.lessons[x.id]?.status === 'done').length;
const isComplete = () => !!D && !!S.post && (lessonsDone() === D.lessons.length || (allScenes() && !!S.stop?.done));
const nextLesson = () => D.lessons.find((x) => S.lessons[x.id]?.status !== 'done');

// 레슨 시간 재기: 화면을 보고 있는 동안만 더한다
function timeStart(id) { timeStop(); live = { id, t0: Date.now() }; }
function timeStop() { if (live) { L(live.id).timeMs += Date.now() - live.t0; live = null; save(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { const id = live?.id; timeStop(); if (id) live = { id, t0: null }; } else if (live && live.t0 == null) live.t0 = Date.now(); });
window.addEventListener('pagehide', timeStop);

/* ---------------- 화면 틀 ---------------- */
const app = () => $('#app');
// 듣기: 지금 화면의 할 일을 기기 음성으로 읽음 (화면마다 data-say, 없으면 제목)
function screenSay() {
  const el = [...document.querySelectorAll('main [data-say], main[data-say]')].reverse().find((e) => e.dataset.say);
  if (el) return el.dataset.say;
  const hd = document.querySelector('main h1, main h2, .top .ttl');
  return hd?.innerText?.trim() || t('say.home');
}
const sayBtn = () => (canSpeak() ? h('button', { class: 'say-btn', id: 'sayBtn', 'aria-label': t('scene.listen'), onclick: () => speak(screenSay()) }, ic('sound', { size: 22 })) : null);
function shell() {
  app().innerHTML = '';
  const n = streak();
  const nb = SC.scenes.filter((x) => S.scenes?.[x.id]?.best).length;
  // 시안: 왼쪽 삽 + 연속 출근, 오른쪽 배지 + 수. 첫 화면 듣기는 현장 카드 안에, 다른 탭은 상단 오른쪽에
  app().append(h('header', { class: 'top' }, h('h1', { class: 'sr-only' }, `${t('app.name')} · ${t('nav.' + tab)}`),
      h('span', { class: 'top-chip streak-c', title: t('home.streak', { n }), 'aria-label': t('home.streak', { n }) }, ic('shovel', { size: 24 }), h('span', { class: 't-num' }, String(n))),
      h('span', { class: 'top-chip badge-c', title: t('top.badges', { n: nb }), 'aria-label': t('top.badges', { n: nb }) }, ic('badge', { size: 24 }), h('span', { class: 't-num' }, String(nb))),
      tab === 'home' ? null : sayBtn()),
    h('main', { id: 'view', class: 'view-in' }),
    h('nav', { class: 'tabs', id: 'tabs' }, ...[
      ['home', 'map'], ['review', 'review'], ['record', 'record'], ['practice', 'practice'],
    ].map(([id, nm]) => h('button', { 'data-tab': id, onclick: () => go(id) }, ic(nm), h('span', {}, t('nav.' + id)), id === 'practice' && !isComplete() ? h('em', { class: 'lock', 'aria-label': t('nav.locked') }, ic('lock', { size: 12 })) : null))));
}
function go(tb) {
  curV3?.dispose(); curV3 = null; TITLE?.stopBg();
  timeStop();
  tab = tb; if (history.state?.deep) history.back();
  shell(); document.body.classList.remove('deep');
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tb));

  ({ home, review, record, practice })[tb]($('#view'));
  window.scrollTo(0, 0);
}
// 레슨·점검처럼 화면 전체를 쓰는 단계 (휴대전화 뒤로 가기 → 목록)
function deep(title, onBack) {
  document.querySelector('.fbar')?.remove(); document.body.classList.remove('has-fbar');
  if (!history.state?.deep) history.pushState({ deep: true }, '');
  document.body.classList.add('deep');
  app().innerHTML = '';
  const back = h('button', { class: 'back', 'aria-label': t('common.back'), onclick: () => { onBack?.(); go(tab); } }, ic('back'));
  const view = h('main', { id: 'view', class: 'deepview view-in' });
  TITLE?.stopBg();
  app().append(h('header', { class: 'top deep' }, back, h('h1', { class: 'ttl' }, title), h('div', { class: 'dots', id: 'dots' }), sayBtn()), view);
  window.scrollTo(0, 0); autoSay();
  return view;
}
window.addEventListener('popstate', () => { if (document.body.classList.contains('deep')) { timeStop(); go(tab); } });
const dots = (n, i) => { const d = $('#dots'); if (!d) return; d.innerHTML = ''; for (let k = 0; k < n; k++) d.append(h('i', { class: k < i ? 'done' : k === i ? 'on' : '' })); };

/* ---------------- 첫 화면: 현장 지도 (v13) ---------------- */
function home(v) {
  v.dataset.say = !S.pre ? t('say.homeStart') : t('say.home');
  // 3D 공사 현장 지도 (WebGL 을 못 쓰면 평면 길)
  const site = h('div', { class: 'site3d', 'aria-label': t('map.title') });
  const nDone = SC.scenes.filter((x) => sceneDone(x.id)).length;
  // v17: 지도가 무엇인지 한 줄 + 진행 (현장 한 바퀴 = 출근해서 현장을 도는 동선)
  const head = h('div', { class: 'site-head' }, h('span', { class: 'sh-ic' }, ic('walk', { size: 22 })),
    h('div', { class: 'sh-t' }, h('b', {}, t('map.loop')), h('small', {}, t('map.loopSub'))),
    h('span', { class: 'sh-n t-num', 'aria-label': t('map.progress', { n: nDone, m: SC.scenes.length }) }, t('map.progress', { n: nDone, m: SC.scenes.length })));
  v.append(unitCard(), head, site);
  warmPairs();
  const zs = siteZones();
  const onPick = (z) => (z.roof ? stopTell() : z.state === 'done' ? openCard(z.id) : openScene(z.id));
  mountSite(site, { zones: zs, onPick }).then((r) => { if (!r && site.isConnected) site.replaceWith(siteStill(zs, onPick)); });
  const td = todayScene(); if (td) v.append(todayCard(td));
  v.append(installTip());
  // 기초 레슨 6개 (v11 문장 그대로) — 글로 더 배우고 싶은 사람용
  const list = h('div', { class: 'lesson-list' });
  D.lessons.forEach((x) => {
    const st = S.lessons[x.id]?.status || 'new';
    list.append(h('button', { class: `lesson-row ${st}`, disabled: !S.pre, onclick: () => openLesson(x.id) },
      h('span', { class: 'lic tone-' + LESSON_TONE[x.id] }, ic(LESSON_ICON[x.id])),
      h('span', { class: 'lt' }, h('b', {}, `${x.no}. ${T(x.title)}`), h('small', {}, `${T(x.kind)} · ${t('home.minutes')}`)),
      h('span', { class: 'st' }, st === 'done' ? h('span', { class: 'done-ic', 'aria-label': t('home.statusDone') }, ic('check', { size: 20 })) : st === 'doing' ? h('span', { class: 'doing' }, t('home.statusDoing')) : ic('next', { size: 20 }))));
  });
  // 기초 레슨 6개 — 첫 화면에서 바로 (v14)
  v.append(h('section', { class: 'lessons6' }, h('h2', { class: 'sec head' }, ic('learn', { size: 24 }), h('span', {}, t('home.lessons6'))), h('p', { class: 'small' }, t('home.lessons6Note')), list));
  v.append(h('p', { class: 'note' }, t('home.note')));
}
// v15: 3D 비교 그림 — 장면마다 위험 켬/끔 두 장을 만들어 PAIR3D 에 채움 (한 번만)
const pairsDone = new Set(); let curV3 = null;
async function ensurePairs(id) {
  if (pairsDone.has(id) || !hasGL()) return; pairsDone.add(id);
  try { const r = await renderPairs(id); const sc = scene(id); if (!r || !sc) return; for (const z of sc.hazards) if (r[z.id]) { PAIR3D[z.bad] = r[z.id].bad; PAIR3D[z.good] = r[z.id].good; if (r[z.id].meta && !PMETA[z.id]) PMETA[z.id] = r[z.id].meta; } } catch { pairsDone.delete(id); }
}
const idle = (fn, ms) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));
function warmPairs() { if (!hasGL()) return; const ids = SCENE3D_IDS.filter((i) => !pairsDone.has(i)); let k = 0; const step = () => { if (k >= ids.length) return; ensurePairs(ids[k++]).then(() => idle(step, 600)); }; idle(step, 1500); }
// v17 지도 구역: 장소 이름 + 하는 일 아이콘. 지금 = 첫삽이 + 깃발 "여기부터", 끝냄 = 초록 체크 깃발 + 별, 잠김 = 안개 + 작은 이름표·자물쇠
const SHORT = { tbm: '출근·TBM', floor: '골조 바닥', scaffold: '비계', lifting: '양중', equip: '장비', pour: '타설', hot: '용접·밀폐' };
const WORKIC = { tbm: 'together', floor: 'stairs', scaffold: 'up', lifting: 'hook', equip: 'truck', pour: 'drop', hot: 'fire' };
const zoneName = (sc) => SHORT[sc.id] || sc.title;
function siteZones() {
  const nx = nextScene(), all = allScenes();
  const tag = (no, id, name, job, state, label, extra = '') => `<button class="zt-name" ${id ? `data-scene="${id}"` : 'id="roofBtn" data-scene=""'} ${state === 'lock' ? 'disabled' : ''} aria-label="${label}"><b class="zt-no">${no}</b>${icon(id ? WORKIC[id] : 'stop', { size: 15 })}<span>${name}</span>${state !== 'lock' && job ? `<small>${job}</small>` : ''}${state === 'lock' ? icon('lock', { size: 11 }) : ''}${extra}</button>`;
  const z = SC.scenes.map((sc, i) => {
    const open = sceneOpen(i), b = S.scenes?.[sc.id]?.best, cur = nx?.id === sc.id;
    const state = cur ? 'cur' : b ? 'done' : open ? 'cur' : 'lock';
    const label = `${sc.no}. ${sc.title} — ${t('job.' + sc.id)}`;
    const top = state === 'cur' ? `<span class="zt-who">${sapi({ size: 50, mood: 'wave' })}</span><span class="zt-flag">${icon('flag', { size: 14 })}${t('map.here')}</span>`
      : state === 'done' ? `<span class="zt-flag ok" role="img" aria-label="${b.stars}/3">${icon('check', { size: 12 })}</span>` : '';
    return { id: sc.id, no: sc.no, state, label, html: top + tag(sc.no, sc.id, zoneName(sc), t('job.' + sc.id), state, label) };
  });
  const st = S.stop?.done ? 'done' : all ? 'cur' : 'lock';
  z.push({ roof: true, id: 'roof', state: st, label: t('stop.title'), html: (st === 'cur' ? `<span class="zt-flag">${icon('flag', { size: 14 })}${t('map.here')}</span>` : st === 'done' ? `<span class="zt-flag ok">${icon('check', { size: 14 })}</span>` : '') + tag('', null, t('stop.short'), '', st, t('stop.title')) });
  return z;
}
// WebGL 을 못 쓰면: 같은 각도로 미리 렌더링한 지도 이미지 + 같은 이름표 (핀 위치 동일)
function siteStill(zs, onPick) {
  if (!PRE.map) return siteMap();
  const wrap = h('div', { class: 'site3d still' }, h('img', { class: 'site-img', src: PRE.map.img, alt: t('map.title') }));
  const marks = h('div', { class: 'site3d-marks' });
  zs.forEach((zn, i) => { const pn = PRE.map.pins[i]; if (!pn) return; const el = h('div', { class: `z-mark ${zn.state}${zn.roof ? ' roof' : ''}`, 'data-zone': zn.id, style: `left:${pn.x}%;top:${pn.y}%`, html: zn.html }); el.querySelector('.zt-name')?.addEventListener('click', () => zn.state !== 'lock' && onPick(zn)); marks.append(el); });
  wrap.append(marks);
  return wrap;
}
// 시안의 주황 현장 카드: 지금 할 일 하나 (그림 점검 → 다음 현장 → 멈추고 알려요 → 마지막 점검 → 확인서) + 듣기
function unitCard() {
  const P = isPic(), nx = nextScene();
  let id, small, title, go_, left = null;
  if (!S.pre) [id, small, title, go_, left] = ['startBtn', t('home.startSmall'), t('home.startCheck'), () => runPicTest('pre'), 'check'];
  else if (nx) [id, small, title, go_] = ['contBtn', t('unit.small', { no: nx.no, cat: nx.cat || '' }), nx.title, () => openScene(nx.id)];
  else if (!S.stop?.done) [id, small, title, go_, left] = ['stopBtn', t('home.last'), t('stop.title'), stopTell, 'stop'];
  else if (!S.post) [id, small, title, go_, left] = ['postBtn', t('home.postSmall'), t('home.post'), () => runPicTest('post'), 'check'];
  else [id, small, title, go_, left] = ['certBtn', t('home.doneSmall'), t('home.cert'), showCert, 'cert'];
  const label = nx && id === 'contBtn' ? `${nx.no}. ${nx.title}` : title;
  return h('section', { class: 'unit-card' },
    h('button', { class: 'unit-go', id, 'aria-label': label, onclick: go_ },
      P ? h('span', { class: 'unit-pic' }, left ? ic(left, { size: 30 }) : h('b', { class: 't-num' }, String(nx.no)), nx && id === 'contBtn' ? thumb(nx) : null, ic('finger', { size: 26 }))
        : h('span', { class: 'unit-t' }, h('small', {}, small), h('b', {}, title))),
    h('button', { class: 'unit-say', id: 'unitSay', 'aria-label': t('scene.listen'), onclick: () => speak(P ? title : `${small}. ${title}`) }, ic('sound', { size: 24 })));
}
// 현장 지도 = 길: 위(0 출근)에서 아래(6)로 지그재그, 마지막은 "멈추고 알려요"(준공). 지금 할 곳 = 주황 + 첫삽이, 완료 = 초록 체크, 잠김 = 회색 자물쇠
function siteMap() {
  const nx = nextScene(), all = allScenes();
  const nodes = [...SC.scenes.map((s, i) => ({ s, i, open: sceneOpen(i), b: S.scenes?.[s.id]?.best })), { roof: true }];
  const XS = [50, 74, 50, 26, 50, 74, 50, 26], GAP = 118, TOP = 64;
  const wrap = h('div', { class: 'path-wrap', style: `height:${TOP + nodes.length * GAP}px` });
  let d = '';
  nodes.forEach((n, k) => {
    const x = XS[k % XS.length], y = TOP + k * GAP;
    d += `${k ? 'L' : 'M'}${x * 3.6} ${y + 36} `;
    if (n.roof) {
      const st = S.stop?.done ? 'done' : all ? 'cur' : 'lock';
      wrap.append(h('button', { class: `p-node roof ${st}`, id: 'roofBtn', style: `left:${x}%;top:${y}px`, disabled: all ? null : true, 'aria-label': t('stop.title'), onclick: stopTell }, ic(S.stop?.done ? 'check' : all ? 'stop' : 'lock')),
        h('span', { class: 'p-label' + (all ? '' : ' lock'), style: `left:${x}%;top:${y}px` }, isPic() ? ic('flag', { size: 18 }) : t('stop.title')));
      if (st === 'cur') wrap.append(mascotAt(x, y));
      return;
    }
    const { s: sc, open, b } = n, cur = nx?.id === sc.id, st = cur ? 'cur' : b ? 'done' : open ? 'cur' : 'lock';
    wrap.append(h('span', { class: 'p-zone', style: `${x >= 50 ? 'left:0' : 'right:0'};top:${y - 4}px`, 'aria-hidden': 'true', html: SC_ART[sc.art]().replace(/id="stp"/g, 'id="stp-z"').replace(/url\(#stp\)/g, 'url(#stp-z)') }));
    wrap.append(h('button', { class: `p-node ${st}`, 'data-scene': sc.id, style: `left:${x}%;top:${y}px`, disabled: open ? null : true, 'aria-label': `${sc.no}. ${sc.title}`, onclick: () => openScene(sc.id) }, ic(b && !cur ? 'check' : open ? 'star' : 'lock')),
      h('span', { class: 'p-label' + (open ? '' : ' lock'), style: `left:${x}%;top:${y}px` }, isPic() ? String(sc.no) : `${sc.no}. ${sc.title}`, b ? stars(b.stars, 14) : null));
    if (cur) wrap.append(mascotAt(x, y));
  });
  wrap.prepend(h('svg', { class: 'path-line', viewBox: `0 0 360 ${TOP + nodes.length * GAP}`, preserveAspectRatio: 'none', html: `<path d="${d}" fill="none" stroke="var(--line)" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 18"/>` }));
  return h('section', { class: 'map', 'aria-label': t('map.title') }, wrap);
}
// 지금 할 곳 옆에 서 있는 첫삽이 + "시작!"
function mascotAt(x, y) {
  const left = x >= 50 ? x - 36 : x + 14;
  return h('span', { class: 'p-mascot-wrap' },
    h('span', { class: 'p-tip', style: `left:${x}%;top:${y - 12}px` }, isPic() ? ic('finger', { size: 18 }) : t('map.start')),
    h('span', { class: 'p-mascot', style: `left:${left}%;top:${y - 14}px`, html: sapi({ size: 72, mood: 'wave' }) }));
}
// 오늘의 위험 찾기: 깬 장면 하나를 날짜로 골라 다시 (하루 한 번, 시간 제한 없음)
function todayScene() {
  const done = SC.scenes.filter((s) => sceneDone(s.id));
  if (!done.length || UI.todayDone === dayStr()) return null;
  const k = [...dayStr()].reduce((a, c) => a + c.charCodeAt(0), 0) % done.length;
  return done[k];
}
function todayCard(sc) {
  return h('button', { class: 'today', id: 'todayBtn', 'aria-label': t('today.title'), onclick: () => swipeSet(sc.id, { today: true }) },
    h('span', { class: 'lic tone-yellow' }, ic('search')), h('span', { class: 'today-t' }, h('b', {}, ic('time', { size: 18 }), ' ', t('today.title')), isPic() ? null : h('small', {}, t('today.sub'))), thumb(sc), ic('next'));
}

function optionList(q, order, onPick) {
  if (q.optionArts) return h('div', { class: 'opts pics' }, order.map((k) => h('button', { class: 'opt pic-opt', onclick: (e) => onPick(k, e.currentTarget) }, pic(q.optionArts[k], 'pic sm'), h('span', {}, T(q.options[k])))));
  return h('div', { class: 'opts' }, order.map((k) => h('button', { class: 'opt', onclick: (e) => onPick(k, e.currentTarget) }, h('span', { class: 'opt-t' }, T(q.options[k])))));
}
// 정답: 초록 체크가 톡 (0.3초) + 짧은 진동 · 오답: 흔들림 없이 차분히
function markRight(btn) { btn.classList.add('right'); btn.append(h('span', { class: 'mark-ok' }, ic('check', { size: 20 }))); buzz(15); beep(); }
function markWrong(btn) { btn.classList.add('wrong'); btn.append(h('span', { class: 'mark-no' }, ic('cross', { size: 18 }))); }

/* ---------------- v12.1 피드백 바 (아래에서 올라옴) ---------------- */
// 정답: 연한 초록 + 기쁨 얼굴 + "계속"(진한 초록) / 오답: 연한 빨강 + 걱정 얼굴(고개 기울이기) + 이유 그림 + "알겠어요"(진한 빨강)
function feedbackBar({ ok, title, sub, say, pics, btn, id, onNext }) {
  document.querySelector('.fbar')?.remove();
  const bar = h('div', { class: 'fbar ' + (ok ? 'ok' : 'no'), role: 'status' },
    h('div', { class: 'fb-hd' }, h('span', { class: 'sapi-s', html: sapi({ size: 64, mood: ok ? 'cheer' : 'worry', cls: ok ? 'm-hop' : 'm-tilt' }) }),
      h('div', { class: 'grow' }, h('b', {}, h('span', { class: 'mk' }, ic(ok ? 'check' : 'cross', { size: 16 })), title), isPic() || !sub ? null : h('small', {}, sub)), say ? h('button', { class: 'q-say fb-say', 'aria-label': t('scene.listen'), onclick: () => speak(say) }, ic('sound', { size: 22 })) : null),
    pics ? h('div', { class: 'fb-pics' }, pics.map((x) => (typeof x === 'string' ? h('span', { class: 'pic', html: x }) : h('span', { class: 'pic ' + (x.ok ? 'ok' : 'no'), html: x.html }, h('span', { class: 'mk' }, ic(x.ok ? 'check' : 'cross', { size: 16 })))))) : null,
    h('button', { class: 'btn big ' + (ok ? 'ok-btn' : 'no-btn'), id, 'aria-label': btn, onclick: () => { bar.remove(); document.body.classList.remove('has-fbar'); onNext(); } }, ic(ok ? 'next' : 'check'), h('span', {}, btn)));
  document.body.append(bar); document.body.classList.add('has-fbar');
  if (ok) { buzz(15); beep(); } else buzz(40);
}
function confetti() {
  if (reduceMotion()) return;
  const c = h('div', { class: 'confetti', 'aria-hidden': 'true' }, Array.from({ length: 16 }, (_, i) => h('i', { style: `left:${4 + i * 6}%;animation-delay:${(i % 5) * 0.07}s` })));
  document.body.append(c); setTimeout(() => c.remove(), 1300);
}
// 화면을 떠나면 피드백 바 정리
window.addEventListener('popstate', () => { document.querySelector('.fbar')?.remove(); document.body.classList.remove('has-fbar'); });


/* ---------------- v19 글 → 그림 → 선택 ---------------- */
// 상황 문장: "**사물**" 을 굵게 + 번호(그림 속 같은 번호 표식과 연결). 원문확인 이상만
const sitText = (z) => (shown(z.situation) ? T(z.situation).replace(/\*\*/g, '') : '');
function sitLine(z, { short = false } = {}) {
  if (!shown(z.situation)) return null;
  const p = h('p', { class: 'sit' + (short ? ' short' : '') + (isDraft(z.situation) ? ' draft' : '') }); let n = 0;
  T(z.situation).split(/(\*\*[^*]+\*\*)/).forEach((part) => { if (/^\*\*/.test(part)) { n++; p.append(h('b', { class: 'sit-k' }, h('i', { class: 'sit-n t-num', 'aria-hidden': 'true' }, String(n)), part.slice(2, -2))); } else if (part) p.append(part); });
  return p;
}
// 그림 문장 띠: [누가] [어디서] [무엇을] ? — 글을 못 읽어도 무엇을 보는지
function iconStrip(z) {
  const [a, b, c] = z.iconStrip || ['worker', 'site', 'stand'];
  return h('div', { class: 'istrip', role: 'img', 'aria-label': sitText(z) || T0(z.name) }, h('span', { class: 'is-ic' }, ic(a, { size: 26 })), h('span', { class: 'is-plus' }, '+'), h('span', { class: 'is-ic place' }, ic(b, { size: 26 })), h('span', { class: 'is-plus' }, '+'), h('span', { class: 'is-ic' }, ic(c, { size: 26 })), h('span', { class: 'is-q' }, '?'));
}
// 그림 + 번호 표식 + 주목 영역 스포트라이트(주변 30% 어둡게, 주황 점선 원이 한 번 그려짐). 판단할 사물 전체를 가리킴(틀린 곳 하나만 가리키지 않음)
function stagePic(z, side, { onReady } = {}) {
  const m = PMETA[z.id], wrap = h('div', { class: 'stg' }, h('span', { class: 'pic', html: pair(z[side]) }));
  if (m) (m.marks || []).forEach((p, k) => { if (p) wrap.append(h('i', { class: 'stg-n t-num', style: `left:${p.x}%;top:${p.y}%`, 'aria-hidden': 'true' }, String(k + 1))); });
  const play = () => {
    wrap.querySelector('.stg-spot')?.remove();
    const f = m?.focus; if (!f) { onReady?.(); return; }
    const spot = h('div', { class: 'stg-spot', style: `--fx:${f.x}%;--fy:${f.y}%;--fr:${f.r}%`, 'aria-hidden': 'true' });
    spot.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="${f.x}" cy="${f.y}" rx="${f.r}" ry="${f.r * 1.45}" pathLength="100"/></svg>`;
    wrap.append(spot);
    if (reduceMotion()) { spot.classList.add('still'); onReady?.(); return; }
    setTimeout(() => spot.classList.add('on'), 500); // 0.5초 그림 전체 → 스포트라이트
    setTimeout(() => { spot.classList.add('done'); onReady?.(); }, 1600);
  };
  wrap._play = play; return wrap;
}
// "왜" 화면: 위험한 모습 / 안전한 모습 나란히 + 차이 부분 확대 원(돋보기) + 한 줄 이유 + 근거
function zoomPic(z, side) {
  const m = PMETA[z.id], f = h('figure', { class: 'why-fig ' + side }, h('span', { class: 'pic', html: pair(z[side]) }), h('span', { class: 'mk ' + (side === 'bad' ? 'mk-bad' : 'mk-good') }, ic(side === 'bad' ? 'cross' : 'check', { size: 16 })));
  const d = m?.diff, src = (pair(z[side]).match(/src="([^"]+)"/) || [])[1];
  if (d && src) {
    f.append(h('i', { class: 'why-ring', style: `left:${d.x}%;top:${d.y}%;--dr:${d.r}%` }));
    const lens = h('i', { class: 'why-lens', style: `background-image:url("${src}");background-position:calc(17cqw - ${d.x} * 2.4cqw) calc(17cqw - ${d.y} * ${(2.4 * 372 / 540).toFixed(4)}cqw)` }); f.append(lens); // 차이 부분을 가운데로 2.4배
  }
  return f;
}
function whyBox(z, ok, onNext) {
  const quote = h('div', { class: 'basis-quote', hidden: true });
  return h('div', { class: 'why ' + (ok ? 'ok' : 'no'), role: 'status' },
    h('div', { class: 'why-hd' }, h('span', { class: 'mk' }, ic(ok ? 'check' : 'cross', { size: 18 })), h('b', {}, ok ? t('v19.right') : t('v19.wrong')), h('span', { class: 'grow' }), speakBtn(`${T0(z.name)}. ${T0(z.line)}`)),
    h('div', { class: 'why-pair' }, zoomPic(z, 'bad'), zoomPic(z, 'good')),
    h('p', { class: 'why-line' }, hazIc(z.type, 18), h('span', {}, h('b', {}, T(z.name)), ' — ', T(z.line))),
    h('div', { class: 'why-basis' }, basisChips(z.line.src, quote)), quote,
    h('button', { class: 'btn primary big', id: 'whyNext', 'aria-label': t('v19.next'), onclick: onNext }, h('span', {}, t('v19.next')), ic('next')));
}

/* ---------------- v13 가요 / 멈춰요 (출근 전 1분) ---------------- */
// 그림 한 장씩: 위험하면 왼쪽(멈춰요, 손바닥), 안전하면 오른쪽(가요, 체크). 손가락으로 밀거나 아래 버튼. 틀려도 벌 없이 바른 쪽을 보여 주고 넘어감
function swipeCards(sc) {
  const pool = sc.hazards.filter((z) => shown(z.line));
  const bad = shuffle(pool).map((z) => ({ z, side: 'bad' })), good = shuffle(pool).map((z) => ({ z, side: 'good' }));
  const nb = Math.min(bad.length, 3), ng = Math.min(good.length, 5 - nb);
  return shuffle([...bad.slice(0, nb), ...good.slice(0, ng)]);
}
function swipeSet(id, o = {}) {
  const sc = scene(id), cards = swipeCards(sc), t0 = Date.now();
  const v = deep(isPic() ? '' : t('swipe.title'));
  v.dataset.say = t('swipe.ask');
  markStudyDay();
  let i = 0; const res = [];
  const dotsRow = h('div', { class: 'pt-dots sw-dots' }, cards.map(() => h('i')));
  const stage = h('div', { class: 'sw-stage' });
  const bStop = h('button', { class: 'sw-btn stop', id: 'swStop', 'aria-label': t('swipe.stop'), onclick: () => answer('bad') }, ic('stop', { size: 30 }), isPic() ? null : h('b', {}, t('swipe.stop')));
  const bGo = h('button', { class: 'sw-btn go', id: 'swGo', 'aria-label': t('swipe.go'), onclick: () => answer('good') }, ic('check', { size: 30 }), isPic() ? null : h('b', {}, t('swipe.go')));
  const sit = h('div', { class: 'sw-sit' });
  v.append(h('div', { class: 'sw-head' }, h('span', { class: 'sw-l' }, ic('back', { size: 18 }), ic('stop', { size: 22 })), isPic() ? h('span', { class: 'sw-mid' }, ic('finger', { size: 24 })) : h('p', { class: 'scene-ask small' }, t('v19.swipeHint')), h('span', { class: 'sw-r' }, ic('check', { size: 22 }), ic('next', { size: 18 }))),
    dotsRow, sit, stage, h('div', { class: 'sw-btns' }, bStop, bGo));
  let busy = false;
  const lock = (on) => { bStop.disabled = on; bGo.disabled = on; };
  function show() {
    stage.innerHTML = '';
    if (i >= cards.length) return end();
    const c = cards[i];
    // v19: ① 글로 상황 한 번 (그림 문장 띠 + 상황 문장 + 질문) → ② 그림에서 보는 곳(스포트라이트) → ③ 고르기
    sit.innerHTML = ''; sit.append(iconStrip(c.z), sitLine(c.z) || '', h('p', { class: 'sw-q' }, t('v19.ask')),
      h('button', { class: 'btn ghost sm', id: 'swReplay', 'aria-label': t('v19.replay'), onclick: () => st._play() }, ic('eye', { size: 18 }), h('span', {}, t('v19.replay'))));
    v.dataset.say = `${sitText(c.z)} ${t('v19.ask')}`;
    lock(true); busy = true;
    const st = stagePic(c.z, c.side, { onReady: () => { lock(false); busy = false; } });
    const card = h('div', { class: 'sw-card', 'data-side': c.side }, st);
    setTimeout(() => st._play(), 0);
    // 손가락으로 밀기
    let x0 = null, dx = 0;
    card.addEventListener('pointerdown', (e) => { if (busy) return; x0 = e.clientX; card.setPointerCapture?.(e.pointerId); card.style.transition = 'none'; });
    card.addEventListener('pointermove', (e) => { if (x0 == null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`; card.classList.toggle('lean-l', dx < -30); card.classList.toggle('lean-r', dx > 30); });
    const up = () => { if (x0 == null) return; x0 = null; card.style.transition = ''; if (Math.abs(dx) > 80) answer(dx < 0 ? 'bad' : 'good'); else { card.style.transform = ''; card.classList.remove('lean-l', 'lean-r'); } dx = 0; };
    card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
    stage.append(card);
  }
  function answer(side) {
    if (busy || i >= cards.length) return; busy = true;
    const c = cards[i], ok = side === c.side;
    res.push({ hz: c.z.id, side: c.side, pick: side, ok });
    const card = stage.querySelector('.sw-card');
    dotsRow.children[i].className = ok ? 'on' : 'no';
    card.append(h('span', { class: 'sw-mark ' + (ok ? 'ok' : 'no') }, ic(ok ? 'check' : 'cross', { size: 40 })));
    if (ok) { buzz(15); beep(); }
    // 틀리면 바른 쪽 버튼을 잠깐 표시
    if (!ok) (c.side === 'bad' ? bStop : bGo).classList.add('hint');
    // v19: 맞아도 틀려도 "왜" — 위험/안전 두 장 + 차이 부분 확대 원 + 한 줄 이유 + 근거. 여기서 처음으로 틀린 곳을 정확히 가리킴
    setTimeout(() => { stage.innerHTML = ''; lock(true); v.classList.add('why-on'); stage.append(whyBox(c.z, ok, () => { v.classList.remove('why-on'); bStop.classList.remove('hint'); bGo.classList.remove('hint'); i++; busy = false; show(); })); }, reduceMotion() ? 150 : 450);
  }
  function end() {
    const n = res.filter((r) => r.ok).length;
    (S.swipe ||= {})[id] = { ok: n, n: res.length, tries: (S.swipe?.[id]?.tries || 0) + 1, timeMs: Date.now() - t0, at: Date.now(), hour: new Date().getHours(), mode: isPic() ? 'pic' : 'text' };
    save();
    if (o.today) { UI.todayDone = dayStr(); saveUI(); }
    bStop.remove(); bGo.remove();
    stage.append(h('div', { class: 'result' }, h('span', { class: 'sapi-s', html: sapi({ size: 64, mood: n === res.length ? 'cheer' : 'hi' }) }),
      isPic() ? null : h('div', { class: 'big' }, t('swipe.score', { n: res.length, s: n })),
      h('div', { class: 'nav2' }, h('button', { class: 'btn', id: 'swAgain', 'aria-label': t('scene.again'), onclick: () => swipeSet(id, o) }, ic('retry'), isPic() ? null : h('span', {}, t('scene.again'))),
        h('button', { class: 'btn primary', id: 'swHome', 'aria-label': t('scene.home'), onclick: () => go('home') }, ic('map'), h('span', {}, t('scene.home')), ic('next')))));
  }
  show();
}

/* ---------------- v13 그림 점검 (사전·사후 같은 6문항, 순서만 섞음) ---------------- */
// 위험한 모습과 안전한 모습 중 안전한 쪽을 누른다. 글을 못 읽어도 풀 수 있게, 점수에 읽기 능력이 섞이지 않게
// 범위는 v11 점검 6문항과 같게: 개구부·안전대·안전모 턱끈·맞음(짐 아래)·동바리 이상 시 대피·멈추고 알리기
const PIC_TEST = ['1-1', '2-2', '0-2', '3-1', '5-1', 'keep'];
function picItems() {
  const all = Object.fromEntries(SC.scenes.flatMap((sc) => sc.hazards || []).map((z) => [z.id, z]));
  return PIC_TEST.map((id) => (id === 'keep' ? { id, bad: 'keepBad', good: 'keepGood' } : all[id])).filter(Boolean);
}
function runPicTest(kind) {
  const items = shuffle(picItems()), ans = [], t0 = Date.now();
  markStudyDay();
  const v = deep(isPic() ? '' : kind === 'pre' ? t('test.pre') : t('test.post'));
  v.dataset.say = t('test.pickSafe');
  const show = (i) => {
    dots(items.length, i);
    v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
    if (i >= items.length) return finish();
    const q = items[i], sides = shuffle(['bad', 'good']);
    v.append(h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, isPic() ? ic('check', { size: 16 }) : kind === 'pre' ? t('test.pre') : t('test.post')), t('common.of', { i: i + 1, n: items.length })),
      i === 0 && !isPic() ? h('p', { class: 'hint left' }, t('test.noAnswer')) : null,
      h('div', { class: 'pt-ask' }, h('span', { class: 'pt-good' }, ic('check', { size: 26 })), h('div', { class: 'pt-ask-t' }, h('small', {}, t('test.situ')), h('b', {}, t('test.pickSafe'))), h('button', { class: 'q-say', 'aria-label': t('scene.listen'), onclick: () => speak(`${t('test.situ')} ${t('test.pickSafe')}`) }, ic('sound', { size: 22 }))),
      h('div', { class: 'pt-opts' }, sides.map((sd, k) => h('button', { class: 'pt-opt', 'data-side': sd, 'aria-label': t('test.pickN', { n: k + 1 }), onclick: () => { ans.push({ id: q.id, pick: sd }); show(i + 1); } }, h('span', { class: 'pic', html: pair(q[sd]) })))));
  };
  const finish = () => {
    const correct = ans.map((a) => a.pick === 'good');
    const rec = { kind: 'pic', items: ans.map((a) => a.id), answers: ans.map((a) => a.pick), correct, score: correct.filter(Boolean).length, n: correct.length, at: Date.now(), hour: new Date().getHours(), timeMs: Date.now() - t0 };
    S[kind] = rec; save();
    v.innerHTML = '';
    const marks = (r) => h('span', { class: 'pt-dots', 'aria-label': `${r.score}/${r.n}` }, r.correct.map((c) => h('i', { class: c ? 'on' : '' })));
    if (kind === 'pre') {
      v.append(h('div', { class: 'result' }, h('span', { class: 'sapi-s', html: sapi({ size: 72, mood: 'hi' }) }), marks(rec),
        isPic() ? null : h('div', { class: 'big' }, t('test.score', { n: rec.n, s: rec.score })), isPic() ? null : h('p', {}, t('test.preDoneV13'))),
        h('button', { class: 'btn primary big', id: 'toScene0', 'aria-label': t('test.toScene0'), onclick: () => openScene(SC.scenes[0].id) }, thumb(SC.scenes[0]), h('span', {}, t('test.toScene0')), ic('next')));
    } else {
      const pre = S.pre?.kind === 'pic' ? S.pre : null;
      v.append(h('div', { class: 'result' }, pre ? marks(pre) : null, marks(rec),
        h('div', { class: 'cmp' }, h('div', {}, h('small', {}, t('test.preShort')), h('b', {}, pre ? String(pre.score) : '-')), ic('next'), h('div', { class: 'up' }, h('small', {}, t('test.postShort')), h('b', {}, String(rec.score)))),
        isPic() ? null : h('p', {}, !pre ? t('test.oldPre') : rec.score > pre.score ? t('test.better', { n: rec.score - pre.score }) : t('test.reviewHintV13'))),
        h('button', { class: 'btn primary big', id: 'toCert', 'aria-label': t('test.getCert'), onclick: () => (S.survey?.done ? finale(showCert) : survey(() => finale(showCert))) }, ic('cert'), isPic() ? null : h('span', {}, t('test.getCert'))));
    }
  };
  show(0);
}

/* ---------------- v20 라운드 2: 사용 설문 (SUS 10문항 + 자체 5문항, 마지막 점검 뒤, 건너뛸 수 있음) ----------------
   SUS: Brooke(1996) 10문항, 홀수 긍정·짝수 부정. 점수 = (홀수 (답-1) + 짝수 (5-답)) 합 × 2.5 → 0~100
   한국어 문장은 이 앱에서 옮긴 것(검증된 한국어판 출처 확인 전 — docs/논문자료/07_평가계획.md) */
const SURVEY = [...Array.from({ length: 10 }, (_, i) => 'sus' + (i + 1)), ...Array.from({ length: 5 }, (_, i) => 'own' + (i + 1))];
export const susScore = (a) => (a?.length === 10 && a.every((x) => x >= 1 && x <= 5) ? a.reduce((s, x, i) => s + (i % 2 === 0 ? x - 1 : 5 - x), 0) * 2.5 : null);
// 얼굴 5개: 입 곡선만 다르게 (1 찡그림 → 5 활짝)
const face = (n) => { const c = [-5, -2.5, 0, 2.5, 5][n - 1];
  return `<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="20" cy="20" r="17"/><circle cx="14" cy="16" r="1.6" fill="currentColor"/><circle cx="26" cy="16" r="1.6" fill="currentColor"/><path d="M12.5 ${26 - c / 2} Q20 ${26 + c} 27.5 ${26 - c / 2}"/></svg>`; };
function survey(then) {
  const v = deep(isPic() ? '' : t('survey.title'));
  v.dataset.say = t('survey.intro');
  const ans = (S.survey?.ans || []).slice(), t0 = Date.now();
  const save_ = (done) => { S.survey = { ans, done, at: Date.now(), timeMs: (S.survey?.timeMs || 0) + (Date.now() - t0), mode: isPic() ? 'pic' : 'text', v: 1 }; save(); };
  const start = () => { const k = ans.findIndex((x) => !x); show(k >= 0 ? k : ans.length < SURVEY.length ? ans.length : 0); };
  const show = (i) => {
    dots(SURVEY.length, i);
    v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
    if (i >= SURVEY.length) return end();
    const q = t('survey.' + SURVEY[i]);
    v.dataset.say = q;
    v.append(h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, ic('record', { size: 16 })), t('common.of', { i: i + 1, n: SURVEY.length })),
      h('div', { class: 'sv-q' }, h('b', {}, q), h('button', { class: 'q-say', 'aria-label': t('scene.listen'), onclick: () => speak(q) }, ic('sound', { size: 22 }))),
      h('div', { class: 'sv-scale', role: 'radiogroup', 'aria-label': q }, [1, 2, 3, 4, 5].map((n) => h('button', { class: 'sv-opt f' + n + (ans[i] === n ? ' on' : ''), role: 'radio', 'aria-checked': String(ans[i] === n), 'aria-label': t('survey.s' + n), 'data-n': String(n),
        onclick: () => { ans[i] = n; tap(); save_(false); setTimeout(() => show(i + 1), 180); } }, h('span', { class: 'sv-face', html: face(n) }), h('small', {}, String(n))))),
      h('div', { class: 'sv-ends', 'aria-hidden': 'true' }, h('small', {}, t('survey.lo')), h('small', {}, t('survey.hi'))),
      i > 0 ? h('button', { class: 'btn', onclick: () => show(i - 1) }, ic('back'), isPic() ? null : h('span', {}, t('common.prev'))) : null);
    autoSay();
  };
  const end = () => {
    save_(true);
    v.dataset.say = t('survey.thanks');
    v.append(h('div', { class: 'result' }, h('span', { class: 'sapi-s', html: sapi({ size: 72, mood: 'cheer' }) }), isPic() ? null : h('p', {}, t('survey.thanks'))),
      h('button', { class: 'btn primary big', id: 'svDone', 'aria-label': then ? t('survey.toCert') : t('scene.home'), onclick: () => (then ? then() : go('record')) }, ic(then ? 'cert' : 'check'), isPic() ? null : h('span', {}, then ? t('survey.toCert') : t('scene.home')), ic('next')));
  };
  // 첫 장: 무엇을 하는지 + 시작 / 건너뛰기
  v.append(h('div', { class: 'result' }, h('span', { class: 'sapi-s', html: sapi({ size: 72, mood: 'hi' }) }),
    h('div', { class: 'sv-preview', 'aria-hidden': 'true' }, [1, 3, 5].map((n) => h('span', { class: 'sv-face f' + n, html: face(n) }))),
    isPic() ? null : h('p', {}, t('survey.intro'))),
    h('button', { class: 'btn primary big', id: 'svStart', 'aria-label': t('survey.start'), onclick: start }, ic('next'), h('span', {}, t('survey.start'))),
    then ? h('button', { class: 'btn', id: 'svSkip', 'aria-label': t('survey.skip'), onclick: () => { if (!S.survey) { S.survey = { skipped: true, at: Date.now(), v: 1 }; save(); } then(); } }, ic('cert'), isPic() ? null : h('span', {}, t('survey.skip'))) : null);
}

/* ---------------- v13 마무리: 위험하면 멈추고 → 피하고 → 알려요 ---------------- */
function stopTell() {
  const v = deep(isPic() ? '' : t('stop.title'));
  v.dataset.say = t('stop.ask');
  markStudyDay();
  const order = ['stop', 'away', 'tell'], t0 = Date.now();
  let k = 0, miss = 0;
  const slots = h('div', { class: 'stop-slots' }, order.map((_, i) => h('span', { class: 'stop-slot' }, String(i + 1))));
  const msg = h('div', { class: 'scene-sheet', 'aria-live': 'polite' });
  const pick = (id, btn) => {
    if (id !== order[k]) { miss++; btn.classList.remove('nudge'); void btn.offsetWidth; btn.classList.add('nudge'); return; }
    const slot = slots.children[k]; slot.innerHTML = ''; slot.append(h('span', { class: 'pic', html: STOP[id]() })); slot.classList.add('on');
    btn.disabled = true; btn.classList.add('used'); k++; buzz(15); beep();
    if (k === order.length) done();
  };
  const cards = h('div', { class: 'stop-cards' }, shuffle(order).map((id) => h('button', { class: 'stop-card', 'data-id': id, 'aria-label': t('stop.' + id), onclick: (e) => pick(id, e.currentTarget) }, h('span', { class: 'pic', html: STOP[id]() }), isPic() ? null : h('small', {}, t('stop.' + id)))));
  v.append(isPic() ? h('div', { class: 'pt-ask' }, ic('finger', { size: 28 }), h('b', { class: 'seq' }, '1 → 2 → 3')) : h('p', { class: 'scene-ask' }, t('stop.ask')), slots, cards, msg);
  function done() {
    S.stop = { done: true, at: Date.now(), tries: (S.stop?.tries || 0) + 1, miss, timeMs: Date.now() - t0 }; save();
    cards.remove();
    const line = SC.stop.line;
    msg.append(h('div', { class: 'haz-card' },
      h('div', { class: 'haz-head' }, h('span', { class: 'sapi-s', html: sapi({ size: 48, mood: 'cheer' }) }), isPic() ? null : h('b', {}, T(line)), h('span', { class: 'grow' }), speakBtn(T0(line))),
      isPic() ? null : h('p', { class: 'small' }, t('stop.note')),
      isPic() ? null : basisFor(line.src),
      h('button', { class: 'btn primary big', id: 'stopNext', 'aria-label': S.post ? t('scene.home') : t('home.post'), onclick: () => (S.post ? go('home') : runPicTest('post')) }, ic(S.post ? 'map' : 'check'), h('span', {}, S.post ? t('scene.home') : t('home.post')), ic('next'))));
  }
}

/* ---------------- 레슨 ---------------- */
const STEPS = ['goals', 'cards', 'activity', 'quiz', 'summary'];
function openLesson(id) {
  const x = D.lessons.find((l) => l.id === id), st = L(id);
  if (st.status === 'new') { st.status = 'doing'; st.step = 'goals'; st.card = 0; st.qi = 0; st.startAt = Date.now(); }
  if (st.status === 'done') { st.step = 'goals'; st.card = 0; st.qi = 0; st.review = true; }
  save();
  const v = deep(`${x.no}. ${T(x.title)}`);
  timeStart(id);
  markStudyDay();
  const step = (name) => { st.step = name; save(); dots(STEPS.length, STEPS.indexOf(name)); v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in'); window.scrollTo(0, 0); ({ goals, cards, activity, quiz, summary })[name](); };

  function goals() {
    v.append(h('div', { class: 'lesson-hero' }, h('span', { class: 'lic lg tone-' + LESSON_TONE[x.id] }, ic(LESSON_ICON[x.id], { size: 32 })),
        h('div', {}, h('div', { class: 'kind' }, T(x.kind)), h('h2', { class: 'lead' }, t('lesson.goals')))),
      h('ul', { class: 'goals' }, x.goals.map((g) => h('li', {}, ic('check', { size: 18 }), h('span', {}, T(g))))),
      h('div', { class: 'say' }, h('span', { class: 'sapi-s', html: sapi({ size: 44, mood: 'hi' }) }), h('p', {}, t('sapi.lessonStart'))),
      h('button', { class: 'btn primary big', onclick: () => step('cards') }, h('span', {}, t('lesson.start')), ic('next')));
  }
  const vc = visCards(x), quizzes = visQuiz(x);
  let slideDir = '';
  function cardView(i, { onNext, onPrev, nextLabel }) {
    const c = vc[i];
    const img = Array.isArray(c.art) ? h('div', { class: `grid g${c.art.length}` }, c.art.map((a) => h('figure', {}, pic(a.art, 'pic sm'), h('figcaption', {}, T(a.label))))) : pic(c.art);
    const prog = h('div', { class: 'cdots', 'aria-label': t('common.of', { i: i + 1, n: vc.length }) }, vc.map((_, k) => h('i', { class: k < i ? 'done' : k === i ? 'on' : '' })));
    const card = h('div', { class: 'card' + (slideDir ? ' slide-' + slideDir : ''), 'data-chars': chars(c) }, img, h('p', { class: 'ct' + (isDraft(c.text) ? ' draft' : '') }, T(c.text)), shown(c.more) ? h('p', { class: 'cm' + (isDraft(c.more) ? ' draft' : '') }, T(c.more)) : null);
    slideDir = '';
    // 손가락으로 옆으로 밀어 넘기기 (버튼도 그대로)
    let x0 = null, y0 = 0, dx = 0;
    card.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; card.style.transition = 'none'; });
    card.addEventListener('pointermove', (e) => { if (x0 == null) return; dx = e.clientX - x0; if (Math.abs(dx) > Math.abs(e.clientY - y0)) card.style.transform = `translateX(${dx * 0.6}px)`; });
    const end = () => { if (x0 == null) return; x0 = null; card.style.transition = ''; card.style.transform = '';
      if (dx < -60) { slideDir = 'next'; onNext(); } else if (dx > 60 && onPrev) { slideDir = 'prev'; onPrev(); } };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end); card.addEventListener('pointerleave', end);
    return h('div', { class: 'card-wrap' }, h('div', { class: 'card-head' }, h('span', { class: 'lic sm tone-' + LESSON_TONE[x.id] }, ic(LESSON_ICON[x.id], { size: 18 })), prog, h('span', { class: 'cnt' }, t('common.of', { i: i + 1, n: vc.length }))),
      card,
      h('div', { class: 'nav2' }, onPrev ? h('button', { class: 'btn', 'aria-label': t('common.prev'), onclick: () => { slideDir = 'prev'; onPrev(); } }, ic('back'), h('span', {}, t('common.prev'))) : h('span'),
        h('button', { class: 'btn primary', onclick: () => { slideDir = 'next'; onNext(); } }, h('span', {}, nextLabel || t('common.next')), ic('next'))),
      i === 0 && x.no === 1 && !reduceMotion() ? h('p', { class: 'hint swipe-hint' }, t('lesson.swipe')) : null);
  }
  function cards() {
    const i = Math.min(st.card, vc.length - 1);
    const hasAct = shown(x.activity);
    v.append(cardView(i, {
      onPrev: i > 0 ? () => { st.card = i - 1; step('cards'); } : null,
      onNext: () => { if (i + 1 < vc.length) { st.card = i + 1; step('cards'); } else { st.card = 0; st.qi = 0; step(hasAct ? 'activity' : 'quiz'); } },
      nextLabel: i + 1 < vc.length ? t('common.next') : hasAct ? t('lesson.try') : t('lesson.quiz'),
    }));
  }
  function activity() {
    const a = x.activity;
    const fin = () => { buzz(15); beep(); v.append(h('div', { class: 'fb good' }, h('span', { class: 'mark-ok' }, ic('check', { size: 20 })), h('span', {}, T(a.done))), h('button', { class: 'btn primary big', onclick: () => { st.qi = 0; step('quiz'); } }, h('span', {}, t('lesson.quiz')), ic('next'))); };
    const fail = () => { st.actTries++; save(); };
    v.append(h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, t('lesson.tryTag'))), h('h2', { class: 'lead' + (isDraft(a) ? ' draft' : '') }, T(a.prompt)));
    if (a.type === 'order') {
      const slots = h('ol', { class: 'slots' }, a.items.map(() => h('li', {}, '')));
      let k = 0; const msg = h('div', { class: 'fb' });
      const btns = shuffle(a.items).map((it) => h('button', { class: 'chip', onclick: (e) => {
        if (it !== a.items[k]) { fail(); msg.className = 'fb bad'; msg.textContent = t('act.orderAgain'); return; }
        slots.children[k].textContent = T(it); slots.children[k].classList.add('fill'); e.currentTarget.disabled = true; k++; msg.textContent = ''; msg.className = 'fb';
        if (k === a.items.length) { chipsBox.remove(); msg.remove(); fin(); }
      } }, T(it)));
      const chipsBox = h('div', { class: 'chips' }, btns);
      v.append(slots, chipsBox, msg);
    } else if (a.type === 'match' || a.type === 'sort') {
      let r = 0;
      const box = h('div');
      v.append(box);
      const round = () => {
        box.innerHTML = '';
        const rounds = a.type === 'match' ? a.rounds : a.items;
        if (r >= rounds.length) return fin();
        const R = rounds[r];
        const options = a.type === 'match' ? R.options : a.categories;
        const msg = h('div', { class: 'fb' });
        box.append(h('div', { class: 'qhead' }, t('common.of', { i: r + 1, n: rounds.length })), pic(R.art), R.t ? h('p', { class: 'ct' }, T(R.t)) : null,
          h('div', { class: 'opts' }, (a.type === 'match' ? shuffle(options.map((_, k) => k)) : options.map((_, k) => k)).map((k) => h('button', { class: 'opt', onclick: (e) => {
            if (k !== R.answer) { fail(); markWrong(e.currentTarget); e.currentTarget.disabled = true; msg.className = 'fb bad'; msg.textContent = t('act.pickAgain'); return; }
            markRight(e.currentTarget); r++; setTimeout(round, 450);
          } }, h('span', { class: 'opt-t' }, T(options[k]))))), msg);
      };
      round();
    } else if (a.type === 'dress') {
      const pick = { helmet: null, harness: null, shoes: null };
      const fig = h('div', { class: 'pic dress', html: dressFigure() });
      const draw = () => { fig.innerHTML = dressFigure({ helmet: pick.helmet, harness: pick.harness === 'yes', shoes: pick.shoes }); };
      const msg = h('div', { class: 'fb' });
      const rows = Object.entries(a.slots).map(([slot, S0]) => h('div', { class: 'slot' }, h('b', {}, T(S0.label)), h('div', { class: 'chips' }, S0.options.map((o) => h('button', { class: 'chip', 'data-slot': slot, 'data-id': o.id, onclick: (e) => {
        pick[slot] = o.id; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === e.currentTarget)); draw();
      } }, T(o.t))))));
      const check = h('button', { class: 'btn primary big', onclick: () => {
        const wrong = Object.entries(a.slots).filter(([slot, S0]) => pick[slot] !== S0.answer).map(([, S0]) => T(S0.label));
        if (wrong.length) { fail(); msg.className = 'fb bad'; msg.textContent = t('act.dressAgain', { what: wrong.join('·') }); return; }
        msg.className = 'fb good'; msg.textContent = t('act.dressOk'); check.remove(); rows.forEach((r) => r.querySelectorAll('button').forEach((b) => (b.disabled = true)));
        const H = a.hook, hm = h('div', { class: 'fb' });
        v.append(h('h2', { class: 'q' }, T(H.q)), h('div', { class: 'opts' }, shuffle(H.options.map((_, k) => k)).map((k) => h('button', { class: 'opt', onclick: (e) => {
          if (k !== H.answer) { fail(); markWrong(e.currentTarget); e.currentTarget.disabled = true; hm.className = 'fb bad'; hm.textContent = `${t('quiz.again')} ${T(H.why)}`; return; }
          markRight(e.currentTarget); e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true)); hm.remove(); fin();
        } }, h('span', { class: 'opt-t' }, T(H.options[k]))))), hm);
      } }, t('act.dressDone'));
      v.append(fig, ...rows, check, msg);
    }
  }
  function quiz() {
    const i = st.qi;
    if (i >= quizzes.length) return step('summary');
    const q = quizzes[i], qi = q.i, order = shuffle(q.options.map((_, k) => k));
    const backIdx = Math.max(0, vc.findIndex((c) => c.i === q.back));
    const msg = h('div', { class: 'fb', 'aria-live': 'polite' });
    v.append(h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, t('quiz.tag')), t('common.of', { i: i + 1, n: quizzes.length })), q.art ? pic(q.art) : null, h('h2', { class: 'q' + (isDraft(q) ? ' draft' : '') }, T(q.q)),
      optionList(q, order, (k, btn) => {
        const firstTry = st.first[qi] === undefined;
        if (k === q.answer) {
          if (firstTry) st.first[qi] = true;
          S.wrong = S.wrong.filter((w) => !(w.lesson === x.id && w.qi === qi && w.kind === 'quiz'));
          markRight(btn); btn.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true));
          msg.className = 'fb good'; msg.innerHTML = ''; msg.append(h('b', {}, t('quiz.right')), ' ', T(q.why));
          v.append(h('button', { class: 'btn primary big', onclick: () => { st.qi = i + 1; step('quiz'); } }, h('span', {}, i + 1 < quizzes.length ? t('quiz.next') : t('quiz.toSummary')), ic('next')));
          save(); return;
        }
        // 틀리면: 이유 한 줄 → 해당 카드로 돌아가서 다시 보고 → 같은 문제 다시 (흔들지 않고 차분히)
        if (firstTry) st.first[qi] = false;
        st.retries++;
        if (!S.wrong.some((w) => w.lesson === x.id && w.qi === qi && w.kind === 'quiz')) S.wrong.push({ kind: 'quiz', lesson: x.id, qi, at: Date.now() });
        save();
        markWrong(btn); btn.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true));
        msg.className = 'fb bad'; msg.innerHTML = ''; msg.append(h('b', {}, t('quiz.again')), ' ', T(q.why));
        v.append(h('button', { class: 'btn primary big', onclick: () => {
          v.innerHTML = '';
          v.append(h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, t('quiz.backTag'))), cardView(backIdx, { onNext: () => step('quiz'), nextLabel: t('quiz.backToQ') }));
        } }, ic('retry'), h('span', {}, t('quiz.seeCard'))));
      }), msg);
  }
  function summary() {
    const firstOk = quizzes.filter((q) => st.first[q.i]).length;
    const nx = D.lessons.find((l) => l.id !== x.id && S.lessons[l.id]?.status !== 'done');
    // 배지: 이 레슨을 마치면 받는 원형 배지 (정리 화면에 같이 보여 줌 — 학습 시간 늘지 않게)
    v.append(h('div', { class: 'badge-get' }, badge(x, true), h('div', {}, h('b', {}, t('lesson.badge', { name: T(x.title) })), h('small', {}, t('lesson.floor', { n: Math.min(lessonsDone() + (st.status === 'done' ? 0 : 1), D.lessons.length) })))),
      shown(x.summary) ? h('div', { class: 'sum' }, h('div', { class: 'kind' }, t('lesson.summary')), h('p', { class: 'sumline' + (isDraft(x.summary) ? ' draft' : '') }, T(x.summary))) : null,
      h('div', { class: 'small' }, t('lesson.firstTry', { ok: firstOk, n: quizzes.length })),
      basisBox(x),
      h('button', { class: 'btn primary big', id: 'lessonDone', onclick: () => {
        st.status = 'done'; st.doneAt ||= Date.now(); st.review = false; timeStop(); save();
        const nn = nextLesson();
        // v13: 마지막 점검은 그림 점검 하나로 (처음 점검과 같은 방식이어야 비교됨) — 현장 7곳과 "멈추고 알려요"를 마친 뒤에
        if (nn) openLesson(nn.id); else if (!S.post && allScenes() && S.stop?.done) runPicTest('post'); else go('home');
      } }, h('span', {}, nx ? t('lesson.nextL', { no: nx.no, title: T(nx.title) }) : !S.post && allScenes() && S.stop?.done ? t('lesson.toPost') : t('lesson.toList')), ic('next')));
  }
  step(STEPS.includes(st.step) ? st.step : 'goals');
}
export function lessonFacts(x) {
  const f = [];
  x.cards.forEach((c) => { f.push(c.text); if (c.more) f.push(c.more); });
  f.push(x.activity, ...x.quiz, x.summary);
  return f.filter(Boolean);
}
// 원형 배지: 레슨 아이콘 + 표지 색 (안 받은 배지는 회색 점선)
function badge(x, got) { return h('span', { class: `badge ${got ? 'got tone-' + LESSON_TONE[x.id] : 'empty'}`, 'aria-label': `${x.no}. ${T(x.title)}` }, ic(LESSON_ICON[x.id], { size: 26 })); }
const GRADE = { 1: 'grade.1', 2: 'grade.2', 3: 'grade.3' };
// 근거 상자: 레슨에서 쓴 출처 id를 모아 sources.json으로 보여 준다
function basisBox(x) {
  const ids = [...new Set(lessonFacts(x).filter(shown).flatMap((o) => o.src || []))];
  return h('details', { class: 'basis' }, h('summary', {}, t('lesson.basis', { n: ids.length })),
    h('ul', {}, ids.map((id) => SRC[id]).filter(Boolean).map((s) => h('li', {}, h('i', { class: 'lv' }, t(GRADE[s.grade] || 'grade.0')), h('span', {}, `${s.org} 「${s.doc}」 ${s.loc}`)))));
}
// 빈 화면: 삽이 + 한 줄
const empty = (msg) => h('div', { class: 'empty' }, h('span', { class: 'sapi-s', html: sapi({ size: 64, mood: 'think' }) }), h('p', {}, msg));

/* ---------------- 다시 보기 ---------------- */
function review(v) {
  v.append(...cardShelf());
  // 해 본 장면에서 아직 못 찾은 위험
  const fs = foundSet(), tried = new Set(Object.keys(S.scenes || {}));
  const missed = allHazards().filter((z) => tried.has(z.sc.id) && !fs.has(z.id));
  v.append(h('h2', { class: 'sec' }, isPic() ? ic('search') : t('review.missed')));
  if (!missed.length) v.append(empty(t('review.missedEmpty')));
  const det = h('div', { class: 'miss-detail' });
  v.append(h('div', { class: 'missed' }, missed.map((z) => h('button', { class: 'miss-row', onclick: () => { det.innerHTML = ''; det.append(hazCard(z, () => { det.innerHTML = ''; }, t('common.close'))); det.scrollIntoView({ block: 'nearest' }); } }, hazIc(z.type, 18), isPic() ? h('span', { class: 'pic xs', html: pair(z.bad) }) : h('span', {}, T(z.name)), ic('next', { size: 18 })))), det);
  if (isPic()) return; // 그림만 규칙: 레슨(글 문제·요약)은 글과 그림 모드에서만
  v.append(h('h2', { class: 'sec' }, t('review.wrong')));
  const wr = S.wrong.filter((w) => w.kind === 'quiz').filter((w) => { const q = D.lessons.find((l) => l.id === w.lesson)?.quiz[w.qi]; return q && shown(q); });
  if (!wr.length) v.append(empty(t('review.empty')));
  wr.forEach((w) => {
    const x = D.lessons.find((l) => l.id === w.lesson), q = x.quiz[w.qi];
    const box = h('div', { class: 'rv' });
    const msg = h('div', { class: 'fb' });
    box.append(h('div', { class: 'rv-h' }, h('span', { class: 'lic sm tone-' + LESSON_TONE[x.id] }, ic(LESSON_ICON[x.id], { size: 18 })), h('small', {}, `${x.no}. ${T(x.title)}`)), h('b', {}, T(q.q)), optionList(q, shuffle(q.options.map((_, k) => k)), (k, btn) => {
      btn.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true));
      if (k === q.answer) { markRight(btn); msg.className = 'fb good'; msg.textContent = `${t('quiz.right')} ${T(q.why)}`; S.wrong = S.wrong.filter((y) => y !== w); save(); }
      else { markWrong(btn); msg.className = 'fb bad'; msg.textContent = T(q.why); }
    }), msg);
    v.append(box);
  });
  v.append(h('h2', { class: 'sec' }, t('review.summaries')));
  D.lessons.forEach((x) => v.append(h('div', { class: 'sumcard' }, h('span', { class: 'lic tone-' + LESSON_TONE[x.id] }, ic(LESSON_ICON[x.id])),
    h('div', {}, h('b', {}, `${x.no}. ${T(x.title)}`), shown(x.summary) ? h('p', {}, T(x.summary)) : null, h('ul', {}, x.goals.map((g) => h('li', {}, T(g))))))));
}

/* ---------------- 내 기록 ---------------- */
function record(v) {
  // 계급·별 (첫 화면에서 옮김)
  const sn = starSum(), max = SC.scenes.length * 3, rk = rankOf(sn), goal = rk < 2 ? RANKS[rk + 1] : max;
  v.append(h('section', { class: 'rank-card' },
    h('span', { class: 'sapi-s', html: sapi({ size: 56, mood: allScenes() ? 'cheer' : 'hi' }) }),
    h('div', { class: 'rank-main' },
      h('div', { class: 'rank-row' }, rankMark(rk), isPic() ? null : h('b', {}, t('rank.' + rk))),
      h('div', { class: 'star-row', 'aria-label': `${sn}/${max}` }, h('span', { class: 'st-on' }, ic('star', { size: 20 })), h('b', {}, String(sn)), h('small', {}, `/ ${max}`)),
      h('div', { class: 'bar', role: 'progressbar', 'aria-label': t('a11y.progStars'), 'aria-valuemin': '0', 'aria-valuemax': String(goal), 'aria-valuenow': String(sn) }, h('i', { style: `width:${Math.min(100, (sn / goal) * 100)}%` })),
      isPic() ? null : h('small', { class: 'rank-next' }, rk < 2 ? t('rank.next', { n: goal - sn, r: t('rank.' + (rk + 1)) }) : t('rank.top')))));
  // 도감: 위험 종류별로 찾은 수 / 전체, 찾은 위험은 그림으로
  v.append(h('h2', { class: 'sec' }, t('record.dex')), dex());
  v.append(h('h2', { class: 'sec' }, t('record.scenes')),
    h('div', { class: 'rec-list' }, SC.scenes.map((sc) => { const r = S.scenes?.[sc.id];
      return h('div', { class: 'rec-row' }, thumb(sc), h('span', { class: 'rec-t' }, h('b', {}, `${sc.no}. ${sc.title}`), h('small', {}, r ? `${t('record.tries', { n: r.tries })} · ${mmss(r.timeMs)}` : t('record.notYet'))), h('span', { class: 'rec-s' }, r?.best ? stars(r.best.stars, 14) : '-')); })));
  v.append(h('h2', { class: 'sec' }, t('record.change')), h('p', { class: 'small' }, t('record.changeNote')), zoneChange());
  v.append(h('h2', { class: 'sec' }, t('record.scores')),
    h('div', { class: 'cmp card-lite' }, h('div', {}, h('small', {}, t('test.preShort')), h('b', {}, S.pre ? `${S.pre.score}/${S.pre.n ?? S.pre.correct.length}` : '-')), ic('next'), h('div', { class: 'up' }, h('small', {}, t('test.postShort')), h('b', {}, S.post ? `${S.post.score}/${S.post.n ?? S.post.correct.length}` : '-'))),
    S.pre && S.post && S.pre.kind !== S.post.kind ? h('p', { class: 'small' }, t('record.kindNote')) : null);
  v.append(h('h2', { class: 'sec' }, t('record.lessons')));
  if (!Object.keys(S.lessons).length) v.append(empty(t('record.empty')));
  else {
    const list = h('div', { class: 'rec-list' });
    let total = 0;
    D.lessons.forEach((x) => {
      const st = S.lessons[x.id]; total += st?.timeMs || 0;
      const qs = visQuiz(x), ok = st ? qs.filter((q) => st.first[q.i]).length : 0, tried = st ? Object.keys(st.first).length : 0;
      list.append(h('div', { class: 'rec-row' }, h('span', { class: 'lic sm tone-' + LESSON_TONE[x.id] }, ic(LESSON_ICON[x.id], { size: 18 })),
        h('span', { class: 'rec-t' }, h('b', {}, `${x.no}. ${T(x.title)}`), h('small', {}, `${st?.status === 'done' ? t('home.statusDone') : st?.status === 'doing' ? t('home.statusDoing') : t('record.notYet')} · ${st ? mmss(st.timeMs) : '-'}`)),
        h('span', { class: 'rec-s' }, tried ? `${ok}/${qs.length}` : '-')));
    });
    v.append(h('p', { class: 'small' }, t('record.firstTryNote')), list, h('p', { class: 'small' }, ic('time', { size: 16 }), ' ', t('record.total', { time: mmss(total) })));
  }
  v.append(h('h2', { class: 'sec' }, t('survey.recTitle')), h('div', { class: 'card-lite sv-rec' },
    h('span', {}, ic('record', { size: 18 }), ' ', S.survey?.done ? t('survey.recDone', { d: new Date(S.survey.at).toLocaleDateString('ko-KR') }) : t('survey.recNot')),
    S.post ? h('button', { class: 'btn', id: 'svOpen', onclick: () => survey(null) }, ic(S.survey?.done ? 'retry' : 'next'), h('span', {}, S.survey?.done ? t('survey.again') : t('survey.start'))) : null));
  v.append(h('h2', { class: 'sec' }, t('record.export')),
    h('p', { class: 'small' }, t('record.exportNote')),
    h('button', { class: 'btn', id: 'exportBtn', onclick: exportData }, ic('download'), h('span', {}, t('record.exportBtn'))));
  v.append(h('h2', { class: 'sec' }, t('settings.title')), settingsBox());
}
function dex() {
  const all = allHazards(), fs = foundSet(), det = h('div', { class: 'miss-detail' });
  const types = HAZ_TYPES.map((ty) => [ty, all.filter((z) => z.type === ty)]).filter(([, a]) => a.length);
  return h('div', { class: 'dex' },
    h('div', { class: 'dex-types' }, types.map(([ty, a]) => { const f = a.filter((z) => fs.has(z.id)).length;
      return h('div', { class: 'dex-type' + (f === a.length ? ' full' : '') }, hazIc(ty, 18), h('b', {}, `${f}/${a.length}`), isPic() ? null : h('small', {}, SC.hazardTypes?.[ty] || ty)); })),
    h('div', { class: 'dex-grid' }, all.map((z) => fs.has(z.id)
      ? h('button', { class: 'dex-cell on', 'aria-label': T0(z.name), onclick: () => { det.innerHTML = ''; det.append(hazCard(z, () => { det.innerHTML = ''; }, t('common.close'))); det.scrollIntoView({ block: 'nearest' }); } }, h('span', { class: 'pic', html: pair(z.bad) }))
      : h('span', { class: 'dex-cell off', 'aria-label': '?' }, h('b', {}, '?'), h('small', {}, String(z.sc.no))))),
    det);
}
// 설정: v20 부터 "환경 설정" 화면 하나로 (소리·진동·기록 지우기도 거기로 옮김)
function settingsBox() {
  return h('div', { class: 'card-lite set' }, h('button', { class: 'btn set-btn', id: 'openSettings', onclick: () => TITLE.settings(() => go('record')) }, ic('settings'), h('span', {}, t('title.settings')), ic('next', { size: 18 })));
}
// 라운드 2: 기록과 함께 "처음 실행" 상태(소개 본 것·보기 방식·오프닝·출근한 날)도 지움 — 예비 시험에서 다음 참여자가 앞사람 선택을 물려받지 않게.
// 글자 크기·움직임·화질·소리·진동·음성 속도(기기 설정)는 그대로 둠
function wipeAll() {
  localStorage.removeItem(KEY); localStorage.removeItem(DONE_KEY); S = fresh();
  for (const k of ['aboutDone', 'view', 'autoSay', 'autoSayUser', 'title3d', 'todayDone', 'installShown']) delete UI[k];
  Object.assign(UI, { floorsSeen: 0, openDay: '', days: [] }); saveUI(); applyPrefs(); noteHour(); save();
}
// 개인정보 없는 결과: 무작위 번호, 점수, 시간, 시간대만
export function exportPayload() {
  return {
    app: '첫 삽 기초 교육', appVersion: APP_VERSION, version: D.version, anonId: S.anon, exportedDay: new Date().toISOString().slice(0, 10),
    scenesVersion: SC.version,
    pre: S.pre && { kind: S.pre.kind || 'text', score: S.pre.score, n: S.pre.n ?? S.pre.correct.length, correct: S.pre.correct, items: S.pre.items, hour: S.pre.hour, timeSec: S.pre.timeMs ? Math.round(S.pre.timeMs / 1000) : undefined },
    post: S.post && { kind: S.post.kind || 'text', score: S.post.score, n: S.post.n ?? S.post.correct.length, correct: S.post.correct, items: S.post.items, hour: S.post.hour, timeSec: S.post.timeMs ? Math.round(S.post.timeMs / 1000) : undefined },
    swipe: S.swipe || null,
    stopTell: S.stop ? { done: !!S.stop.done, tries: S.stop.tries, miss: S.stop.miss, timeSec: Math.round((S.stop.timeMs || 0) / 1000) } : null,
    hazardRate: (() => { const all = allHazards(), fs = foundSet(); return all.length ? +(all.filter((z) => fs.has(z.id)).length / all.length).toFixed(2) : 0; })(),
    lessons: Object.fromEntries(D.lessons.map((x) => { const st = S.lessons[x.id]; return [x.id, st ? { done: st.status === 'done', timeSec: Math.round(st.timeMs / 1000), quizFirstTry: x.quiz.map((_, i) => st.first[i] ?? null), retries: st.retries, activityRetries: st.actTries } : null]; })),
    wrongNow: S.wrong.length,
    scenes: Object.fromEntries(Object.entries(S.scenes || {}).map(([k, r]) => [k, { tries: r.tries, timeSec: Math.round(r.timeMs / 1000), last: r.last && { found: r.last.found.length, total: r.last.total, rate: +(r.last.found.length / r.last.total).toFixed(2), stars: r.last.stars, mode: r.last.mode, hour: r.last.hour, missTaps: r.last.missTaps, today: r.last.today, active: r.last.active?.length, act: r.last.act || null }, foundIds: r.seen || r.best?.found || [], best: r.best && { found: r.best.found.length, stars: r.best.stars } }])),
    usageHours: S.hours,
    survey: S.survey?.done ? { sus: S.survey.ans.slice(0, 10), susScore: susScore(S.survey.ans.slice(0, 10)), own: S.survey.ans.slice(10, 15), mode: S.survey.mode, timeSec: Math.round((S.survey.timeMs || 0) / 1000) } : S.survey?.skipped ? { skipped: true } : null,
  };
}
function exportData() {
  const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `cheotsap-result-${S.anon}.json` });
  document.body.append(a); a.click(); a.remove();
}

/* ---------------- 현장 연습 (게임) ---------------- */
function practice(v) {
  if (!isComplete()) {
    const left = SC.scenes.filter((s) => !sceneDone(s.id)).length, cleared = SC.scenes.length - left;
    v.append(h('div', { class: 'lockbox' }, h('span', { class: 'lock-ic' }, ic('lock', { size: 36 })), h('h2', {}, t('practice.lockedTitle')),
      h('p', {}, left ? t('practice.leftScenes', { n: left }) : !S.stop?.done ? t('practice.leftStop') : t('practice.leftPost')),
      h('div', { class: 'bd-wrap small-bd', html: building({ done: cleared, total: SC.scenes.length }) }),
      h('p', { class: 'small' }, t('practice.what')),
      h('button', { class: 'btn primary big', onclick: () => go('home') }, t('practice.toLearn'))));
    return;
  }
  v.append(h('div', { class: 'lockbox open' }, h('span', { class: 'lock-ic open' }, ic('unlock', { size: 36 })), h('h2', {}, t('practice.openTitle')),
    h('p', {}, t('practice.openText')),
    h('a', { class: 'btn primary big', id: 'gameLink', href: './game.html' }, ic('practice'), h('span', {}, t('practice.start'))),
    h('button', { class: 'btn', onclick: showCert }, ic('cert'), h('span', {}, t('home.cert')))));
}

/* ---------------- 완료 장면 (2초, 누르면 넘어감) ---------------- */
function finale(then) {
  if (reduceMotion()) return then();
  const el = h('div', { id: 'finale', role: 'button', 'aria-label': t('opening.skip') },
    h('div', { class: 'bd-wrap', html: building({ done: 7, total: 7 }) }),
    h('span', { class: 'sapi-s dig', html: sapi({ size: 88, mood: 'cheer' }) }),
    h('p', {}, t('finale.text')));
  document.body.append(el);
  let gone = false;
  const done = () => { if (gone) return; gone = true; el.remove(); then(); };
  el.addEventListener('pointerdown', done); setTimeout(done, 2000);
  buzz(30); beep();
}

/* ---------------- 기초 확인서 ---------------- */
function showCert() {
  if (!S.certAt) { S.certAt = Date.now(); save(); }
  const v = deep(t('cert.title'));
  const d = new Date(S.certAt);
  const name = h('input', { class: 'name', placeholder: t('cert.namePh'), maxlength: '12', value: S.name || '' });
  name.addEventListener('input', () => { S.name = name.value.trim(); save(); });
  v.append(h('div', { class: 'cert' },
    h('div', { class: 'cert-h' }, h('span', { class: 'mark', html: logoMark({ size: 28 }) }), t('app.name'), ' · ', t('app.sub')), h('h1', {}, t('cert.title')),
    name,
    h('p', {}, allScenes() ? t('cert.bodyV13') : t('cert.body')),
    allScenes() ? h('ul', { class: 'cert-scenes' }, SC.scenes.map((sc) => h('li', {}, stars(S.scenes[sc.id].best.stars, 14), h('span', {}, `${sc.no}. ${sc.title}`)))) : null,
    allScenes() ? h('p', { class: 'small' }, t('cert.found', { f: foundSet().size, n: allHazards().length })) : null,
    lessonsDone() === D.lessons.length ? h('div', { class: 'badges cert-badges' }, D.lessons.map((x) => badge(x, true))) : null,
    lessonsDone() === D.lessons.length ? h('ul', {}, D.lessons.map((x) => h('li', {}, ic('check', { size: 16 }), h('span', {}, `${x.no}. ${T(x.title)}`)))) : null,
    h('div', { class: 'cmp' }, h('div', {}, h('small', {}, t('test.pre')), h('b', {}, `${S.pre?.score ?? '-'}/${S.pre?.n ?? S.pre?.correct?.length ?? 6}`)), ic('next'), h('div', { class: 'up' }, h('small', {}, t('test.post')), h('b', {}, `${S.post?.score ?? '-'}/${S.post?.n ?? S.post?.correct?.length ?? 6}`))),
    h('div', { class: 'date' }, `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`),
    h('p', { class: 'warnline' }, t('cert.notLegal')),
    h('p', { class: 'small' }, t('cert.legalNote'))),
    h('a', { class: 'btn primary big', href: './game.html', id: 'certGame' }, ic('practice'), h('span', {}, t('cert.toGame'))));
}

/* 처음 실행 안내(v12~v19: 안내 3장 → 언어 → 사전 점검)는 v20 에서 title.js 로 옮김: 안내 1장 → "이 앱은?" 1·3장, 2장 → 2장, 3장(법정 교육 아님) → 타이틀 아래·정보, 언어 → 환경 설정 */

/* ---------------- 소리 (기본 꺼짐) ---------------- */
let actx = null;
function beep() {
  if (!UI.sound) return;
  try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.06, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.15); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.16); } catch {}
}

/* ---------------- 홈 화면 추가 안내 (기초 1개 완료 뒤 한 번) ---------------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
function installTip() {
  if (UI.installShown || lessonsDone() < 1 || window.matchMedia?.('(display-mode: standalone)').matches) return null;
  const box = h('div', { class: 'install' }, ic('download'), h('div', {}, h('b', {}, t('install.title')), h('small', {}, installEvt ? t('install.text') : t('install.manual'))),
    installEvt ? h('button', { class: 'btn', onclick: async () => { installEvt.prompt(); UI.installShown = true; saveUI(); box.remove(); } }, t('install.add')) : null,
    h('button', { class: 'btn ghost', 'aria-label': t('install.close'), onclick: () => { UI.installShown = true; saveUI(); box.remove(); } }, t('install.close')));
  return box;
}

/* ---------------- v13 현장 위험 찾기 ---------------- */
// 그림 모드(기본): 글을 읽지 않아도 되게 — 손가락 안내, 그림·아이콘·색·표정으로만 진행. 글 모드: 같은 화면에 글을 함께
// v14: 그림과 글을 항상 함께 — 글을 숨기는 그림 모드는 없앰 (교수님 말씀은 "그림을 함께")
// v20: 그림만 모드를 설정에서 다시 고를 수 있게 (기본은 글과 그림 — v14 결정 유지)
const isPic = () => UI.view === 'pic';
const SC_ART = { sceneFloor, sceneTbm, sceneScaffold, sceneLifting, sceneEquip, scenePour, sceneHot };
const HAZ_TYPES = ['fall', 'trip', 'pierce', 'struck', 'hit', 'caught', 'collapse', 'shock', 'fire', 'suffocate', 'heat'];
const scene = (id) => SC.scenes.find((s) => s.id === id);
const SR = (id) => (S.scenes ||= {})[id] ||= { tries: 0, timeMs: 0, best: null, last: null };
// 음성(선택): 기기 음성으로 한 줄 읽기. 소리 없이도 이해되게 그림이 먼저
const canSpeak = () => 'speechSynthesis' in window;
function speak(text) { if (!canSpeak()) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = UI.rate === 'slow' ? 0.75 : 0.95; speechSynthesis.speak(u); } catch {} }
const speakBtn = (text) => canSpeak() ? h('button', { class: 'btn icon-only speak', 'aria-label': t('scene.listen'), onclick: () => speak(text) }, ic('sound', { size: 26 }), isPic() ? null : h('span', {}, t('scene.listen'))) : null;
// 위험 종류 아이콘: 경고(노랑 삼각형) 안에
const hazIc = (type, size = 22) => h('span', { class: 'haz-ic' }, ic(HAZ_TYPES.includes(type) ? type : 'accidents', { size }));
const stars = (n, size = 28) => h('span', { class: 'stars', 'aria-label': `${n}/3` }, [1, 2, 3].map((k) => h('span', { class: 'st-' + (k <= n ? 'on' : 'off') }, ic('star', { size }))));

function openScene(id, o = {}) {
  const sc = scene(id), rec = SR(id);
  // v17: 먼저 알고(미리 보기) → 찾고 → 정리(현장 안전 카드). 미리 보기에서 이번에 낼 위험을 정해 넘긴다
  if (!o.go) { const pickIds = pickHz(sc, rec, o).map((z) => z.id); return previewScene(sc, pickIds, () => openScene(id, { ...o, go: true, hz: pickIds })); }
  const v = deep(isPic() ? `${sc.no}` : `${sc.no}. ${sc.title}`);
  markStudyDay();
  const t0 = Date.now();
  let spent = 0;
  let found = [], tapsMiss = 0, ended = false;
  const pool = sc.hazards.filter((z) => shown(z.line));
  const hz = o.hz ? pool.filter((z) => o.hz.includes(z.id)) : pickHz(sc, rec, o);
  rec.tries++; save();
  // v17: 미리 렌더링한 장면 이미지가 있으면 그것(가볍고 지도와 같은 그림), 없으면 실시간 3D
  const preV = PRE.zones?.[sc.id]?.variants?.find((x) => x.on.length === hz.length && hz.every((z) => x.on.includes(z.id)));
  const use3d = !preV && hasGL() && SCENE3D_IDS.includes(sc.id);
  const off = sc.hazards.filter((z) => !hz.includes(z)); // 꺼진 위험 = 이번엔 안전한 곳
  const total = hz.length;
  // 시안: 머리 = X(닫기) + 둥근 주황 진행 막대
  const prog = h('i', { style: 'width:0%' });
  const hd = document.querySelector('.top.deep');
  hd.innerHTML = ''; hd.classList.add('q-top');
  hd.append(h('button', { class: 'q-x', id: 'sceneClose', 'aria-label': t('common.close'), onclick: () => go(tab) }, ic('cross', { size: 26 })),
    h('div', { class: 'q-prog', role: 'progressbar', 'aria-label': t('a11y.progFound'), 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': '0' }, prog));
  // 찾은 칸: 찾으면 노랑(주의) 네모 + 체크, 아직은 회색 점선 네모
  // v17: 빈칸 = 미리 본 위험 종류 아이콘 (무엇을 찾는지 아는 상태에서 찾기) → 찾으면 노랑으로 채워짐
  const slots = h('div', { class: 'haz-slots', 'aria-label': t('scene.count', { f: 0, n: total }) }, hz.map((z) => h('span', { class: 'haz-slot', 'data-id': z.id, title: SC.hazardTypes?.[z.type] || '' }, ic(HAZ_TYPES.includes(z.type) ? z.type : 'warn', { size: 22 }), h('i', { class: 'slot-ok' }, ic('check', { size: 12 })))));
  const box = h('div', { class: 'scene-box', html: SC_ART[sc.art](sc.layered ? hz.map((z) => z.id) : undefined) });
  const ask = t('scene.askTypes', { n: hz.length });
  v.dataset.say = `${sc.situation || ''} ${ask}`;
  const layer = h('div', { class: 'scene-layer' });
  box.append(layer);
  // v15: 근로자 눈높이 3D 장면 (WebGL 이 없으면 그림 그대로). 누를 곳은 3D 위치를 화면에 투영한 값
  let A3 = null;
  const A = (q) => A3?.hazards[q.id] || A3?.safe[q.id] || q.area;
  // 점검 도구용: 지금 열린 장면에서 위험·함정의 실제 누를 자리 (3D 투영 또는 그림 좌표)
  window.__learn.areaOf = (zid) => { const q = [...sc.hazards, ...sc.safe].find((x) => x.id === zid); return q ? A(q) : null; };
  window.__learn.ready3d = () => !use3d || !!A3;
  curV3?.dispose(); curV3 = null;
  if (preV) { A3 = preV.areas; window.__learn.areas3d = A3; box.querySelector('svg')?.remove(); box.prepend(h('img', { class: 'scene-img', src: preV.img, alt: sc.situation || sc.title, draggable: 'false' })); box.classList.add('is3d'); }
  if (use3d) makeScene3D(sc.id, { on: hz.map((z) => z.id) }).then((v3) => {
    if (!v3) return; if (!box.isConnected) { v3.dispose(); return; }
    curV3 = v3; A3 = v3.areas(); window.__learn.areas3d = A3;
    box.querySelector('svg')?.remove(); box.prepend(v3.canvas); box.classList.add('is3d');
  });
  ensurePairs(sc.id);
  const pct = (a) => ({ left: `${(a.x / 400) * 100}%`, top: `${(a.y / 300) * 100}%`, width: `${(a.r * 2 / 400) * 100}%` });
  const ring = (a, cls) => { const p = pct(a); const el = h('span', { class: 'ring ' + cls, style: `left:${p.left};top:${p.top};width:${p.width}` }); layer.append(el); return el; };
  const sheet = h('div', { class: 'scene-sheet', 'aria-live': 'polite' });
  const endBtn = h('button', { class: 'q-end', id: 'sceneEnd', 'aria-label': t('scene.end'), title: t('scene.end'), onclick: () => finish() }, ic('flag', { size: 22 }), isPic() ? null : h('span', {}, t('scene.endShort')));
  // 시안: 지시 줄 = 손가락 네모 + "위험한 곳을 누르세요" + 듣기 네모
  v.append(h('div', { class: 'q-ask' }, h('span', { class: 'q-finger' }, ic('finger', { size: 26 })), h('div', { class: 'q-ask-t' }, sc.situation ? h('small', {}, sc.situation) : null, h('h1', {}, ask)),
      h('button', { class: 'q-say', id: 'sceneSay', 'aria-label': t('scene.listen'), onclick: () => speak(`${sc.situation || ''} ${ask}`) }, ic('sound', { size: 24 }))),
    h('div', { class: 'q-slots' }, slots, endBtn), box, sheet);
  // 그림 모드 안내: 손가락이 장면을 두 번 눌러 보이는 애니메이션 (답 위치는 알려 주지 않음)
  if (!reduceMotion()) { const f = h('span', { class: 'finger-demo' }, ic('finger', { size: 40 })); box.append(f); setTimeout(() => f.remove(), 2200); }

  box.addEventListener('click', (e) => {
    if (ended) return;
    const r = box.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400, y = ((e.clientY - r.top) / r.height) * 300;
    const near = (a) => Math.hypot(a.x - x, a.y - y) <= a.r;
    const z = hz.filter((q) => !found.includes(q.id) && near(A(q))).sort((p, q) => Math.hypot(A(p).x - x, A(p).y - y) - Math.hypot(A(q).x - x, A(q).y - y))[0];
    if (z) { found.push(z.id); ring(A(z), 'hit'); armHint(); slots.querySelectorAll('.nudge').forEach((e) => e.classList.remove('nudge')); layer.querySelectorAll('.ring.hint').forEach((e) => e.remove()); slots.querySelector(`[data-id="${z.id}"]`).classList.add('on'); prog.style.width = `${(found.length / total) * 100}%`; prog.parentElement.setAttribute('aria-valuenow', String(found.length)); showHazard(z); return; }
    const sf = [...sc.safe, ...off].find((q) => near(A(q)));
    if (sf) { ring(A(sf), 'trap'); showSafe(off.includes(sf) ? { area: A(sf) } : sf); return; }
    tapsMiss++;
    const rp = h('span', { class: 'ripple', style: `left:${(x / 400) * 100}%;top:${(y / 300) * 100}%` }); layer.append(rp); setTimeout(() => rp.remove(), 500);
    layer.querySelector('.ok-toast')?.remove();
    const tt = h('span', { class: 'ok-toast', style: `left:${Math.min(80, Math.max(20, (x / 400) * 100))}%;top:${(y / 300) * 100}%` }, ic('check', { size: 14 }), t('scene.okHere')); layer.append(tt); setTimeout(() => tt.remove(), 1200);
  });

  // 시안: 찾음 → 아래에서 초록 피드백 바 (위험한 모습 X → 안전한 모습 체크 + 한 줄)
  function showHazard(z) {
    const last = found.length >= total;
    feedbackBar({ ok: true, title: t('fb.found'), sub: `${T(z.name)} — ${T(z.line)}`, say: `${T0(z.name)}. ${T0(z.line)}`, pics: [{ html: pair(z.bad), ok: false }, { html: pair(z.good), ok: true }],
      btn: last ? t('scene.seeResult') : t('fb.continue'), id: 'hzNext', onNext: () => { if (last) finish(); } });
  }
  // 시안: 안전한 곳을 누름 → 아래에서 빨강 피드백 바 ("거긴 안전해요" + 아직 못 찾은 위험 하나를 힌트 그림으로)
  // v17: 안전한 곳(함정)을 누름 → 벌점 없이 "여기는 괜찮아요" + 왜 괜찮은지 (정답 힌트는 주지 않음)
  function showSafe(sf) {
    feedbackBar({ ok: true, title: t('scene.okHere'), sub: (sf.name ? T(sf.name) + ' — ' : '') + t('scene.trapWhy'), say: `${t('scene.okHere')}. ${sf.name ? T0(sf.name) : ''}`,
      pics: null, btn: t('scene.keep'), id: 'trapNext', onNext: () => {} });
  }
  // v17 힌트: 30초 동안 못 찾으면 ① 빈칸 아이콘이 그 방향으로 흔들림 → 15초 더 ② 위치가 깜빡임 (② 를 쓰면 별 하나 줄어듦)
  const hinted = new Set(); let hintT = 0;
  function armHint() { clearTimeout(hintT); if (!ended) hintT = setTimeout(() => hint(1), 30000); }
  function hint(lv) {
    if (ended || !v.isConnected) return;
    const z = hz.find((q) => !found.includes(q.id)); if (!z) return; const a = A(z);
    if (lv === 1) { const dx = a.x - 200, dy = a.y - 150, L = Math.hypot(dx, dy) || 1, sl = slots.querySelector(`[data-id="${z.id}"]`);
      sl.style.setProperty('--hx', `${((dx / L) * 7).toFixed(1)}px`); sl.style.setProperty('--hy', `${((dy / L) * 7).toFixed(1)}px`); sl.classList.add('nudge'); clearTimeout(hintT); hintT = setTimeout(() => hint(2), 15000); }
    else { hinted.add(z.id); layer.querySelectorAll('.ring.hint').forEach((e) => e.remove()); ring(a, 'hint'); }
  }
  window.__learn.hint = (lv) => hint(lv);
  armHint();
  // 끝: 놓친 곳을 보여 주고 별
  function finish() {
    if (ended) return; ended = true; clearTimeout(hintT);
    endBtn.remove();
    const ms = Date.now() - t0; rec.timeMs += ms; spent = ms;
    const missed = hz.filter((z) => !found.includes(z.id));
    missed.forEach((z) => ring(A(z), 'miss'));
    // 찾기 → 어떻게 할까 (찾은 위험 하나를 무작위로)
    const q = shuffle(hz.filter((z) => found.includes(z.id) && z.act))[0];
    if (q) askAct(q, (act) => result(missed, act)); else result(missed, null);
  }
  function askAct(z, then) {
    sheet.innerHTML = '';
    v.dataset.say = t('act.ask');
    const opts = shuffle(['stop', 'tell', 'ppe']);
    const box2 = h('div', { class: 'act-card', id: 'actCard', 'data-hz': z.id },
      h('div', { class: 'act-q' }, h('span', { class: 'pic', html: pair(z.bad) }), h('span', { class: 'act-ask' }, ic('finger', { size: 26 }), h('b', {}, '?')), h('p', {}, h('small', {}, t('act.situ', { name: T0(z.name) })), h('br'), t('act.ask')), speakBtn(`${t('act.situ', { name: T0(z.name) })} ${t('act.ask')}`)),
      h('div', { class: 'act-opts' }, opts.map((a) => h('button', { class: 'act-opt', 'data-act': a, 'aria-label': t('act.' + a), onclick: (e) => pick(a, e.currentTarget) }, h('span', { class: 'pic', html: STOP[a]() }), isPic() ? null : h('small', {}, t('act.' + a))))));
    const done = { picked: false };
    function pick(a, btn) {
      if (done.picked) return; done.picked = true;
      const right = a === z.act;
      box2.querySelectorAll('.act-opt').forEach((b) => (b.disabled = true));
      if (right) markRight(btn); else { markWrong(btn); markRight(box2.querySelector(`[data-act="${z.act}"]`)); }
      const line = SC.acts[z.act];
      feedbackBar({ ok: right, title: right ? t('fb.right') : t('fb.wrong'), sub: T(line), say: T0(line), pics: right ? null : [STOP[z.act]()],
        btn: right ? t('fb.continue') : t('fb.gotIt'), id: 'actNext', onNext: () => then({ hz: z.id, pick: a, ok: right }) });
    }
    sheet.append(box2);
    sheet.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }
  function result(missed, act) {
    v.dataset.say = '';
    const n = found.length, st = Math.max(1, (n >= total ? 3 : n * 2 >= total ? 2 : 1) - (hinted.size ? 1 : 0));
    rec.last = { found: [...found], total, active: hz.map((z) => z.id), stars: st, at: Date.now(), hour: new Date().getHours(), mode: isPic() ? 'pic' : 'text', missTaps: tapsMiss, today: !!o.today, act, hints: hinted.size };
    if (!rec.first) rec.first = { found: n, total, at: Date.now() }; // 처음 찾은 수 (효과 비교용)
    rec.seen = [...new Set([...(rec.seen || []), ...found])];
    if (o.today) { UI.todayDone = dayStr(); saveUI(); }
    const firstClear = !rec.best;
    if (!rec.best || st > rec.best.stars || n > rec.best.found.length) rec.best = { found: [...found], stars: st };
    if (st === 3) confetti();
    save();
    // 시안: 화면 전체를 완료 화면으로 — 큰 첫삽이 → 배지 → "현장 0 완료!" → 별·찾은 위험·걸린 시간 → 계속
    const detail = h('div', { class: 'miss-detail' });
    const P = isPic(), sub = n >= total ? t('done.all', { title: sc.title, n: total }) : t('scene.result', { n: total, f: n });
    const sec = Math.round(spent / 1000), clock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const stat = (cls, head, val, label) => h('div', { class: 'stat ' + cls, 'aria-label': label }, h('div', { class: 'st-hd' }, head), h('div', { class: 'st-bd t-num' }, val));
    v.innerHTML = ''; window.scrollTo(0, 0);
    // 시안: 완료 화면은 머리(X·진행 막대) 없이 캐릭터부터
    document.querySelector('.top.deep')?.classList.add('q-hide');
    v.dataset.say = sub;
    v.append(h('section', { class: 'done-v' },
      h('div', { class: 'done-mascot', html: sapi({ size: 96, mood: st === 3 ? 'proud' : st === 2 ? 'cheer' : 'think', cls: st === 3 ? 'm-hop' : '' }) }),
      P ? stars(st, 34) : h('h1', {}, t('done.title', { no: sc.no })),
      P ? null : h('p', { class: 'done-sub' }, sub),
      h('div', { class: 'done-stats' },
        stat('s1', P ? ic('star', { size: 18 }) : t('done.stars'), String(st), t('done.stars') + ' ' + st),
        stat('s2', P ? ic('search', { size: 18 }) : t('done.found'), `${n}/${total}`, t('done.found') + ' ' + n + '/' + total),
        stat('s3', P ? ic('time', { size: 18 }) : t('done.time'), clock, t('done.time') + ' ' + clock)),
      hinted.size ? h('p', { class: 'small hint-note' }, ic('idea', { size: 16 }), ' ', t('scene.hintUsed')) : null,
      // v17 정리: 현장 안전 카드 (끝내면 자동으로)
      h('h2', { class: 'sec card-sec' }, ic('cert', { size: 22 }), h('span', {}, t('card.made'))),
      safetyCard(sc),
      afterBtn(),
      // 시안 아래 (스크롤): 놓친 위험 · 가요/멈춰요 · 다시 하기 · 근거
      missed.length ? h('div', { class: 'missed' }, P ? null : h('b', {}, t('scene.missed')),
        missed.map((z) => h('button', { class: 'miss-row', onclick: () => { detail.innerHTML = ''; detail.append(hazCard(z, () => { detail.innerHTML = ''; }, t('common.close'))); detail.scrollIntoView({ block: 'nearest' }); } }, hazIc(z.type, 18), P ? h('span', { class: 'pic xs', html: pair(z.bad) }) : h('span', {}, T(z.name)), ic('next', { size: 18 })))) : null,
      detail,
      h('div', { class: 'nav2 done-more' },
        h('button', { class: 'btn', id: 'sceneAgain', 'aria-label': t('scene.again'), onclick: () => openScene(id) }, ic('retry'), P ? null : h('span', {}, t('scene.again'))),
        h('button', { class: 'btn', id: 'swipeBtn', 'aria-label': t('swipe.title'), onclick: () => swipeSet(id) }, ic('stop', { size: 20 }), ic('check', { size: 20 }), P ? null : h('span', {}, t('swipe.title')))),
      P ? null : sceneBasis(sc)));
  }
  // 결과 다음 버튼: 다음 장면 → (다 깼으면) 멈추고 알려요 → 처음으로
  function afterBtn() {
    const i = SC.scenes.indexOf(sc), nx = SC.scenes[i + 1];
    const btn = (bid, label, fn) => h('button', { class: 'btn primary big done-go', id: bid, 'aria-label': label, onclick: fn }, h('span', {}, t('fb.continue')), ic('next'));
    if (!o.today && nx && sceneOpen(i + 1)) return btn('sceneNext', `${nx.no}. ${nx.title}`, () => openScene(nx.id));
    if (!o.today && allScenes() && !S.stop?.done) return btn('sceneStop', t('stop.title'), stopTell);
    return btn('sceneHome', t('scene.home'), () => go('home'));
  }
}

/* ---------------- v17 먼저 알고 → 찾고 → 정리 ---------------- */
// 이번에 낼 위험: 처음엔 전부(측정용), 다시 할 때는 무작위 2~4개. 미리 렌더링한 장면은 그 조합(variants) 중에서
function pickHz(sc, rec, o = {}) {
  const pool = sc.hazards.filter((z) => shown(z.line));
  if (!rec.tries || o.all || !(sc.layered || hasGL() || PRE.zones?.[sc.id])) return pool;
  const vs = (PRE.zones?.[sc.id]?.variants || []).filter((x) => x.on.length < pool.length && x.on.every((i) => pool.some((z) => z.id === i)));
  if (vs.length) { const pk = vs[Math.floor(Math.random() * vs.length)]; return pool.filter((z) => pk.on.includes(z.id)); }
  return shuffle(pool).slice(0, Math.min(pool.length, 2 + Math.floor(Math.random() * (Math.min(4, pool.length) - 1)))).sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
}
// 근거 배지: 출처 id → 짧은 이름 (법령 조·기본서 쪽). 누르면 원문 인용
function srcShort(id) {
  const s = SRC[id]; if (!s) return id;
  if (/기본서/.test(s.doc)) return t('basis.kb', { p: (s.loc.match(/^\d+쪽/) || [''])[0] });
  const m = (s.loc || '').match(/제\d+조(의\d+)?/) || (s.doc || '').match(/제\d+조(의\d+)?/);
  if (/기준에 관한 규칙/.test(s.doc)) return t('basis.rule', { a: m ? m[0] : '' });
  if (/시행규칙/.test(s.doc)) return t('basis.byl', { a: (s.doc.match(/\[별표 \d+\]/) || [''])[0] });
  return `${s.org} ${m ? m[0] : ''}`.trim();
}
function basisChips(ids, quoteBox) {
  return h('span', { class: 'basis-chips' }, [...new Set(ids)].filter((i) => SRC[i]).map((i) => h('button', { class: 'basis-chip', 'data-src': i, 'aria-label': `${t('basis.label')}: ${srcShort(i)}`, onclick: (e) => { e.stopPropagation(); const s = SRC[i]; if (!quoteBox) return; const same = quoteBox.dataset.src === i && !quoteBox.hidden; quoteBox.hidden = same; quoteBox.dataset.src = i; quoteBox.innerHTML = ''; if (!same) quoteBox.append(h('b', {}, `${s.org} 「${s.doc}」 ${s.loc}`), h('q', {}, s.quote || ''), h('small', {}, t(GRADE[s.grade] || 'grade.0'))); } }, ic('book', { size: 12 }), srcShort(i))));
}
// ① 미리 보기: 여기서 하는 일 + 조심할 것 N가지(위험 종류 아이콘만, 위치·정답은 안 보여 줌)
function previewScene(sc, ids, go_) {
  const v = deep(`${sc.no}. ${sc.title}`);
  const hz = sc.hazards.filter((z) => ids.includes(z.id)), i = SC.scenes.indexOf(sc);
  const types = hz.map((z) => z.type), tnames = [...new Set(types)].map((ty) => SC.hazardTypes?.[ty] || ty);
  const kb = [...new Set(hz.flatMap((z) => z.line.src))];
  const say = `${t('work.' + sc.id)} ${t('pv.watch', { n: hz.length })} ${types.map((ty) => SC.hazardTypes?.[ty] || ty).join(', ')}.`;
  v.dataset.say = say;
  const top = h('figure', { class: 'pv-top' });
  const zimg = PRE.zones?.[sc.id]?.zone;
  if (zimg) top.append(h('img', { src: zimg, alt: sc.title }));
  else { top.innerHTML = SC_ART[sc.art]().replace(/id="stp"/g, 'id="stp-pv"').replace(/url\(#stp\)/g, 'url(#stp-pv)'); if (hasGL()) renderSiteStill({ w: 780, h: 520, zone: i, fmt: 'image/jpeg', q: 0.85 }).then((r) => { if (top.isConnected) { top.innerHTML = ''; top.append(h('img', { src: r.url, alt: sc.title })); } }).catch(() => {}); }
  top.append(h('figcaption', { class: 'pv-step' }, h('b', { class: 't-num' }, '1'), t('pv.step1'), h('i', {}, '→'), h('span', {}, '2 ' + t('pv.step2')), h('i', {}, '→'), h('span', {}, '3 ' + t('pv.step3'))));
  const quote = h('div', { class: 'basis-quote', hidden: true });
  const expert = hz.every((z) => z.line.status === '전문가확인');
  v.append(top, h('section', { class: 'pv-card' },
    h('div', { class: 'pv-work' }, h('span', { class: 'pv-wic' }, ic(WORKIC[sc.id] || 'worker', { size: 36 })), h('div', {}, h('small', {}, t('pv.work')), h('b', {}, t('work.' + sc.id)))),
    h('h2', { class: 'pv-h' }, t('pv.watch', { n: hz.length })),
    h('div', { class: 'pv-types' }, hz.map((z, k) => h('span', { class: 'pv-type', 'data-type': z.type }, h('em', { class: 't-num' }, String(k + 1)), hazIc(z.type, 30), h('small', {}, SC.hazardTypes?.[z.type] || z.type)))),
    h('p', { class: 'pv-note' }, ic('search', { size: 16 }), ' ', t('pv.note')),
    h('p', { class: 'pv-origin' }, t('pv.origin', { types: tnames.join('·') }), ' ', basisChips(kb, quote), expert ? h('span', { class: 'expert-chip' }, ic('check', { size: 12 }), t('basis.expert')) : null),
    quote,
    h('div', { class: 'pv-go' }, speakBtn(say), h('button', { class: 'btn primary big', id: 'previewGo', 'aria-label': t('pv.go'), onclick: go_ }, ic('search'), h('span', {}, t('pv.go')), ic('next')))));
}
// ③ 정리: 현장 안전 카드 한 장 = 한 구역 (장면 + 번호 핀, 위험(X) → 안전(O) + 한 줄 + 종류 아이콘 + 근거 배지)
const cardHz = (sc) => sc.hazards.filter((z) => shown(z.line));
async function cardSnap(sc) {
  const all = cardHz(sc).map((z) => z.id), pv = PRE.zones?.[sc.id]?.variants?.find((x) => all.every((i) => x.on.includes(i)));
  if (pv) return { img: pv.img, areas: pv.areas.hazards };
  if (!hasGL() || !SCENE3D_IDS.includes(sc.id)) return null;
  const v3 = await makeScene3D(sc.id, { on: all }); if (!v3) return null;
  const r = { img: v3.canvas.toDataURL('image/jpeg', 0.85), areas: v3.areas().hazards }; v3.dispose(); return r;
}
function safetyCard(sc, { compact = false } = {}) {
  const rec = S.scenes?.[sc.id], fs = foundSet(), hz = cardHz(sc), st = rec?.best?.stars || 0;
  const snap = h('div', { class: 'sc-snap' }, h('span', { class: 'sc-snap-wait', html: SC_ART[sc.art]().replace(/id="stp"/g, 'id="stp-c' + sc.id + '"').replace(/url\(#stp\)/g, 'url(#stp-c' + sc.id + ')') }));
  ensurePairs(sc.id).then(() => card.querySelectorAll('.sc-pic').forEach((el) => { el.innerHTML = pair(el.dataset.pic); }));
  cardSnap(sc).then((r) => { if (!r || !snap.isConnected) return; snap.innerHTML = ''; snap.append(h('img', { src: r.img, alt: sc.title }));
    hz.forEach((z, k) => { const a = r.areas[z.id]; if (a) snap.append(h('span', { class: 'sc-pin' + (fs.has(z.id) ? '' : ' miss'), style: `left:${(a.x / 400) * 100}%;top:${(a.y / 300) * 100}%` }, String(k + 1))); }); });
  const quote = h('div', { class: 'basis-quote', hidden: true });
  const expert = hz.every((z) => z.line.status === '전문가확인');
  const card = h('article', { class: 'scard' + (compact ? ' compact' : ''), id: 'scard-' + sc.id, 'data-scene': sc.id },
    h('header', { class: 'sc-head' }, h('span', { class: 'sc-ic' }, ic(WORKIC[sc.id] || 'worker', { size: 22 })), h('div', { class: 'grow' }, h('small', {}, t('card.kicker', { no: sc.no })), h('b', {}, `${zoneName(sc)} · ${t('job.' + sc.id)}`)), st ? stars(st, 16) : null),
    snap,
    h('ol', { class: 'sc-rows' }, hz.map((z, k) => {
      const miss = !fs.has(z.id), ppe = z.act === 'ppe';
      return h('li', { class: 'sc-row' + (miss ? ' miss' : ''), 'data-id': z.id },
        miss ? h('span', { class: 'sc-again' }, ic('retry', { size: 12 }), t('card.again')) : null,
        h('div', { class: 'sc-pair' }, h('b', { class: 'sc-no t-num' }, String(k + 1)),
          h('span', { class: 'sc-fig bad' }, h('span', { class: 'sc-pic', 'data-pic': z.bad, html: pair(z.bad) }), h('i', { class: 'mk mk-bad', 'aria-label': t('scene.bad') }, ic('cross', { size: 14 }))),
          h('span', { class: 'sc-arrow' }, ic('next', { size: 16 })),
          h('span', { class: 'sc-fig good' }, h('span', { class: 'sc-pic', 'data-pic': z.good, html: pair(z.good) }), h('i', { class: 'mk mk-good', 'aria-label': t('scene.good') }, ic('check', { size: 14 })))),
        h('div', { class: 'sc-line' }, h('span', { class: 'sc-type' + (ppe ? ' must' : '') }, hazIc(z.type, 16), h('small', {}, SC.hazardTypes?.[z.type] || '')), sitLine(z, { short: true }), h('p', {}, T(z.line)), basisChips(z.line.src, quote)));
    })),
    quote,
    expert ? h('p', { class: 'expert-chip' }, ic('check', { size: 12 }), t('basis.expert')) : null,
    h('footer', { class: 'sc-foot' }, ic('stop', { size: 20 }), h('b', {}, t('card.stop'))));
  return h('div', { class: 'scard-wrap' }, card,
    h('div', { class: 'sc-actions' },
      h('button', { class: 'btn', id: 'cardSave', 'aria-label': t('card.save'), onclick: () => saveCard(sc) }, ic('download'), h('span', {}, t('card.save'))),
      speakBtn(hz.map((z, k) => `${k + 1}. ${T0(z.line)}`).join(' ') + ' ' + t('card.stop'))));
}
function openCard(id) {
  const sc = scene(id); const v = deep(`${sc.no}. ${sc.title}`);
  v.dataset.say = t('card.title');
  v.append(h('h2', { class: 'sec card-sec' }, ic('cert', { size: 22 }), h('span', {}, t('card.title'))), safetyCard(sc),
    h('div', { class: 'nav2 done-more' },
      h('button', { class: 'btn primary', id: 'cardAgain', 'aria-label': t('card.replay'), onclick: () => openScene(id) }, ic('retry'), h('span', {}, t('card.replay'))),
      h('button', { class: 'btn', id: 'swipeBtn', 'aria-label': t('swipe.title'), onclick: () => swipeSet(id) }, ic('stop', { size: 20 }), ic('check', { size: 20 }), h('span', {}, t('swipe.title')))),
    sceneBasis(sc));
}
// 카드를 이미지(PNG)로: TBM 에서 반장에게 보여 줄 한 장. 개인정보(이름·기록) 없음
const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
async function cardPNG(sc) {
  await ensurePairs(sc.id);
  const hz = cardHz(sc), fs = foundSet(), r = await cardSnap(sc);
  const W = 1080, P = 48, ROW = 236, F = tok('--font') || 'sans-serif', FH = tok('--font-head') || F;
  const H = 150 + 600 + hz.length * ROW + 160;
  // 라운드 1: 글꼴이 조각(unicode-range)으로 나뉘어 있어 캔버스에 쓸 글자 조각을 먼저 받음
  try { const txt = [sc.title, zoneName(sc), t('job.' + sc.id), t('card.kicker', { no: sc.no }), t('card.title'), ...hz.flatMap((z) => [T0(z.line), T0(z.name), SC.hazardTypes?.[z.type] || '', ...z.line.src.map(srcShort)])].join(''); await Promise.all(['500', '600', '800'].map((w) => document.fonts?.load(`${w} 24px "Pretendard Variable"`, txt))); await document.fonts?.load('40px "Black Han Sans"', txt); } catch {}
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = tok('--bg'); g.fillRect(0, 0, W, H);
  // 머리: 아스팔트 띠 + 노랑 줄무늬
  g.fillStyle = tok('--asphalt'); g.fillRect(0, 0, W, 130);
  for (let x = -40; x < W; x += 48) { g.fillStyle = tok('--brand'); g.beginPath(); g.moveTo(x, 130); g.lineTo(x + 24, 130); g.lineTo(x + 40, 112); g.lineTo(x + 16, 112); g.fill(); }
  g.fillStyle = tok('--brand'); g.font = `40px ${FH}`; g.fillText(`${sc.no}. ${zoneName(sc)} · ${t('job.' + sc.id)}`, P, 70);
  g.fillStyle = tok('--on-asphalt-2'); g.font = `600 24px ${F}`; g.fillText(t('card.kicker', { no: sc.no }), P, 102);
  // 장면 + 번호 핀
  const im = await loadImg(r?.img); const sy = 150, sh = 600;
  if (im) { g.drawImage(im, P, sy, W - 2 * P, sh); hz.forEach((z, k) => { const a = r.areas[z.id]; if (!a) return; const x = P + (a.x / 400) * (W - 2 * P), y = sy + (a.y / 300) * sh; g.fillStyle = tok(fs.has(z.id) ? '--danger' : '--caution'); g.strokeStyle = tok('--bg'); g.lineWidth = 5; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); g.stroke(); g.fillStyle = tok(fs.has(z.id) ? '--bg' : '--ink'); g.font = `30px ${FH}`; g.textAlign = 'center'; g.fillText(String(k + 1), x, y + 11); g.textAlign = 'left'; }); }
  // 줄: 번호 · 위험(X) → 안전(O) · 한 줄 · 근거
  const wrap = (text, x, y, w, lh) => { let line = '', yy = y; for (const wd of String(text).split(' ')) { const tryL = line ? line + ' ' + wd : wd; if (line && g.measureText(tryL).width > w) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tryL; } g.fillText(line, x, yy); return yy; };
  for (const [k, z] of hz.entries()) {
    const y = sy + sh + 24 + k * ROW, miss = !fs.has(z.id);
    if (miss) { g.fillStyle = tok('--caution'); g.fillRect(0, y - 8, 14, ROW - 16); }
    g.fillStyle = tok('--danger'); g.beginPath(); g.arc(P + 22, y + 30, 22, 0, 7); g.fill(); g.fillStyle = tok('--bg'); g.font = `28px ${FH}`; g.textAlign = 'center'; g.fillText(String(k + 1), P + 22, y + 40); g.textAlign = 'left';
    const pics = [[z.bad, '--danger', 'x'], [z.good, '--safe-dark', 'o']];
    for (const [j, [pid, col, mk]] of pics.entries()) { const x = P + 60 + j * 290, ii = await loadImg((pair(pid).match(/src="([^"]+)"/) || [])[1]); g.fillStyle = tok('--line'); g.fillRect(x, y, 270, 186); if (ii) g.drawImage(ii, x, y, 270, 186); g.strokeStyle = tok(col); g.lineWidth = 6; g.strokeRect(x, y, 270, 186); g.fillStyle = tok(col); g.beginPath(); g.arc(x + 246, y + 24, 20, 0, 7); g.fill(); g.strokeStyle = tok('--bg'); g.lineWidth = 5; g.beginPath(); if (mk === 'x') { g.moveTo(x + 238, y + 16); g.lineTo(x + 254, y + 32); g.moveTo(x + 254, y + 16); g.lineTo(x + 238, y + 32); } else g.arc(x + 246, y + 24, 9, 0, 7); g.stroke(); }
    g.fillStyle = tok('--ink'); g.font = `800 30px ${F}`; const ty = wrap(T0(z.line), P + 650, y + 34, W - P - 650 - P, 40);
    g.fillStyle = tok('--ink-2'); g.font = `500 22px ${F}`; wrap([SC.hazardTypes?.[z.type] || '', ...z.line.src.map(srcShort)].map((x) => x.replace(/ /g, ' ')).join(' · '), P + 650, ty + 40, W - P - 650 - P, 30);
    if (miss) { g.fillStyle = tok('--caution-dark'); g.font = `800 22px ${F}`; g.fillText(t('card.again'), P + 650, y + 176); }
  }
  // 발: 멈추고 알려요
  const fy = H - 130; g.fillStyle = tok('--asphalt'); g.fillRect(0, fy, W, 130);
  g.fillStyle = tok('--danger'); g.beginPath(); g.arc(P + 34, fy + 64, 34, 0, 7); g.fill(); g.fillStyle = tok('--bg'); g.fillRect(P + 18, fy + 58, 32, 12);
  g.fillStyle = tok('--bg'); g.font = `40px ${FH}`; g.fillText(t('card.stop'), P + 90, fy + 78);
  g.fillStyle = tok('--on-asphalt-2'); g.font = `500 20px ${F}`; g.fillText(t('card.foot'), P + 90, fy + 110);
  return c.toDataURL('image/png');
}
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
async function saveCard(sc) {
  const url = await cardPNG(sc), name = `cheotsap-card-${sc.no}.png`;
  try { const blob = await (await fetch(url)).blob(), file = new File([blob], name, { type: 'image/png' }); if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: t('card.title') }); return; } } catch {}
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
}
// 다시 보기 탭 맨 위: "이것만은 꼭" 7장 요약 + 현장 안전 카드 모음
function cardShelf() {
  const must = SC.scenes.map((sc) => ({ sc, z: sc.hazards.find((z) => z.id === sc.must) || cardHz(sc)[0] })).filter((x) => x.z && shown(x.z.line));
  const box = h('section', { class: 'must7' }, h('div', { class: 'must-h' }, h('h2', { class: 'sec' }, ic('star', { size: 22 }), h('span', {}, t('review.must'))), speakBtn(must.map(({ sc, z }) => `${sc.no}. ${T0(z.line)}`).join(' '))),
    h('p', { class: 'small' }, t('review.mustNote')),
    h('ol', { class: 'must-list' }, must.map(({ sc, z }) => h('li', { class: sceneDone(sc.id) ? 'on' : 'off' }, h('b', { class: 't-num' }, String(sc.no)), hazIc(z.type, 18), h('span', {}, T(z.line))))));
  const grid = h('div', { class: 'card-grid' }, SC.scenes.map((sc) => { const d = sceneDone(sc.id), zimg = PRE.zones?.[sc.id]?.zone;
    return h('button', { class: 'card-cell ' + (d ? 'on' : 'off'), 'data-scene': sc.id, disabled: !d, 'aria-label': `${sc.no}. ${zoneName(sc)}`, onclick: () => openCard(sc.id) },
      zimg ? h('img', { src: zimg, alt: '' }) : h('span', { class: 'cc-art', html: SC_ART[sc.art]().replace(/id="stp"/g, 'id="stp-g' + sc.id + '"').replace(/url\(#stp\)/g, 'url(#stp-g' + sc.id + ')') }),
      h('span', { class: 'cc-t' }, h('b', { class: 't-num' }, String(sc.no)), h('span', {}, zoneName(sc)), d ? stars(S.scenes[sc.id].best.stars, 11) : ic('lock', { size: 12 }))); }));
  return [box, h('h2', { class: 'sec' }, ic('cert', { size: 22 }), h('span', {}, t('review.cards'))), grid];
}
// 내 기록: 구역별 처음 찾은 수 → 다시 찾은 수 (효과 증거)
function zoneChange() {
  const rows = SC.scenes.map((sc) => { const r = S.scenes?.[sc.id]; if (!r?.best) return null; const f = r.first || { found: r.best.found.length, total: r.last?.total || cardHz(sc).length };
    const now = r.last || { found: r.best.found, total: f.total }; return h('div', { class: 'rec-row zc' }, h('span', { class: 'rec-t' }, h('b', {}, `${sc.no}. ${zoneName(sc)}`), h('small', {}, t('record.hints', { n: r.last?.hints || 0 }))),
      h('span', { class: 'zc-v t-num' }, `${f.found}/${f.total}`), ic('next', { size: 16 }), h('span', { class: 'zc-v up t-num' }, `${now.found.length}/${now.total}`)); }).filter(Boolean);
  return rows.length ? h('div', { class: 'rec-list' }, h('div', { class: 'zc-head small' }, h('span', {}, t('record.zone')), h('span', {}, t('record.first')), h('span', {}, t('record.latest'))), rows) : empty(t('record.empty'));
}
function sceneBasis(sc) { return basisFor([...sc.hazards.flatMap((z) => [...z.line.src, ...z.name.src]), ...sc.safe.flatMap((q) => q.name.src)]); }
function basisFor(src) {
  const ids = [...new Set(src)];
  return h('details', { class: 'basis' }, h('summary', {}, t('lesson.basis', { n: ids.length })),
    h('ul', {}, ids.map((i) => SRC[i]).filter(Boolean).map((s) => h('li', {}, h('i', { class: 'lv' }, t(GRADE[s.grade] || 'grade.0')), h('span', {}, `${s.org} 「${s.doc}」 ${s.loc}`)))));
}
// 현장 지도·별·계급 (순위·시간 제한·벌점 없음)
const sceneDone = (id) => !!S.scenes?.[id]?.best;
const sceneOpen = (i) => !!S.pre && (i === 0 || sceneDone(SC.scenes[i - 1].id));
const allScenes = () => SC.scenes.length > 0 && SC.scenes.every((s) => sceneDone(s.id));
const nextScene = () => SC.scenes.find((s, i) => sceneOpen(i) && !sceneDone(s.id));
const starSum = () => SC.scenes.reduce((a, s) => a + (S.scenes?.[s.id]?.best?.stars || 0), 0);
const RANKS = [0, 10, 18]; // 견습 → 점검원(별 10) → 안전 지킴이(별 18). 숫자는 시험 뒤 조정
const rankOf = (n) => (n >= RANKS[2] ? 2 : n >= RANKS[1] ? 1 : 0);
const rankMark = (k) => h('span', { class: 'rank-mark r' + k, 'aria-label': t('rank.' + k) }, [0, 1, 2].map((j) => h('span', { class: j <= k ? 'on' : '' }, ic('ppe', { size: 20 }))));
const thumb = (sc) => h('span', { class: 'thumb', 'aria-hidden': 'true', html: SC_ART[sc.art]().replace(/id="stp"/g, 'id="stp-t"').replace(/url\(#stp\)/g, 'url(#stp-t)') });
const allHazards = () => SC.scenes.flatMap((sc) => (sc.hazards || []).filter((z) => shown(z.line)).map((z) => ({ ...z, sc })));
const foundSet = () => new Set(Object.values(S.scenes || {}).flatMap((r) => [...(r.seen || []), ...(r.best?.found || [])]));
// 찾은 위험 카드: 위험한 모습 → 안전한 모습 + 한 줄(글 모드) + 듣기 (장면·도감·다시 보기에서 같이 씀)
function hazCard(z, onNext, label) {
  return h('div', { class: 'haz-card' },
    h('div', { class: 'haz-head' }, hazIc(z.type), isPic() ? null : h('b', { class: isDraft(z.name) ? 'draft' : '' }, T(z.name)), h('span', { class: 'grow' }), speakBtn(`${sitText(z)} ${T0(z.line)}`)),
    sitLine(z, { short: true }),
    h('div', { class: 'why-pair' }, zoomPic(z, 'bad'), zoomPic(z, 'good')),
    isPic() ? null : h('p', { class: 'haz-line' + (isDraft(z.line) ? ' draft' : '') }, T(z.line)),
    h('button', { class: 'btn primary big', onclick: onNext }, ic('search'), h('span', {}, label), ic('next')));
}
// 그림 모드 / 글 모드 바꾸기 (상단 버튼)
function modeBtn() {
  return h('button', { class: 'mode-btn', id: 'modeBtn', 'aria-label': isPic() ? t('mode.toText') : t('mode.toPic'), onclick: () => { UI.view = isPic() ? 'text' : 'pic'; saveUI(); applyPrefs(); go(tab); } },
    h('span', { class: 'mode-on' }, ic(isPic() ? 'eye' : 'textmode', { size: 20 })), h('span', { class: 'mode-off' }, ic(isPic() ? 'textmode' : 'eye', { size: 16 })));
}

/* ---------------- 오프닝 "첫 삽" ---------------- */
// 하루 첫 실행: 1.8초 전체 · 그 뒤: 0.5초 짧게 · 동작 줄이기: 애니메이션 없이 로고만 · 누르면 바로 넘어감
function opening() {
  return new Promise((resolve) => {
    // v20: 처음 실행만 전체(1.8초), 그 뒤로는 짧게(0.5초)
    const today = dayStr(), full = !UI.openDay, still = reduceMotion();
    UI.openDay = today; saveUI();
    const ms = still ? 600 : full ? 1800 : 500;
    // 라운드 1: index.html 에 이미 그려진 정적 오프닝(tools/gen-opening.mjs)을 이어 씀 — 시간은 그것이 그려진 때부터
    let el = document.getElementById('opening');
    if (!el) { el = h('div', { id: 'opening', role: 'button', 'aria-label': t('opening.skip') },
      h('div', { class: 'op-mark', html: logoMark({ size: 132 }) }),
      h('div', { class: 'op-name' }, t('app.name')), h('div', { class: 'op-sub' }, t('app.sub')),
      h('div', { class: 'op-mascot', html: sapi({ size: 96, mood: 'wave' }) })); document.body.append(el); }
    el.className = still ? 'still' : full ? 'full' : 'short';
    const left = Math.max(120, ms - (performance.now() - (window.__opT0 ?? performance.now())));
    let gone = false;
    // v20: 끝날 때 로고가 앞으로 다가오며 사라지고(삽 뜬 자리에서 뒤로 빠지는 느낌) 타이틀 배경이 이어짐 (0.6초)
    const done = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), still ? 0 : 600); resolve(); };
    el.addEventListener('pointerdown', done);
    setTimeout(done, left);
    window.__opening = { full, still, ms };
  });
}

/* ---------------- 시작 ---------------- */
function noteHour() { const hr = new Date().getHours(); S.hours[hr] = (S.hours[hr] || 0) + 1; }
let TITLE = null;
async function boot() {
  S = load(); loadUI(); applyPrefs();
  // 예전 기록에서 공부한 날 채우기 (연속 출근 표시용)
  if (!UI.days.length) { const ts = [S.created, S.pre?.at, S.post?.at, ...Object.values(S.lessons || {}).flatMap((l) => [l.startAt, l.doneAt])].filter(Boolean); UI.days = [...new Set(ts.map((x) => dayStr(new Date(x))))].sort().slice(-60); }
  // 라운드 1: 데이터 네 파일과 문구 파일을 한꺼번에 요청 (하나씩 기다리면 느린 4G에서 약 2초 더 걸림 — 측정)
  const getJ = (u) => fetch(u).then((r) => r.json());
  const [jL, jS, jC, jP] = [getJ('./data/lessons.json'), getJ('./data/sources.json'), getJ('./data/scenes.json'), getJ('./data/prerender.json')];
  jP.catch(() => {});
  // 라운드 1: 교육 앱 문구만 뽑은 작은 파일(ko-learn.json, 빌드 때 ko.json 에서 만듦) — 없으면 전체 ko.json
  try { LOC = await (await fetch('./locales/ko-learn.json')).json(); } catch { try { LOC = await (await fetch('./locales/ko.json')).json(); } catch {} }
  const op = opening();
  // 라운드 1: 화면 CSS·글꼴 CSS 를 그리기를 막지 않게 받으므로, 다 받은 뒤에 앱 화면을 보여 줌 (스타일 없는 화면이 번쩍이지 않게)
  await Promise.all(['cssLearn', 'cssFonts'].map((id) => new Promise((ok) => { const l = document.getElementById(id); if (!l || l.rel === 'stylesheet' || l.sheet) return ok(); l.addEventListener('load', ok); l.addEventListener('error', ok); setTimeout(ok, 8000); })));
  document.documentElement.classList.remove('boot');
  try { [D, SRC, SC] = await Promise.all([jL, jS.then((x) => Object.fromEntries(x.sources.map((s) => [s.id, s]))), jC]); }
  catch (e) { app().innerHTML = ''; app().append(h('p', { style: 'padding:24px' }, t('app.loadFail'))); return; }
  try { PRE = await jP; for (const [zid, zp] of Object.entries(PRE.zones || {})) { const sc = SC.scenes.find((x) => x.id === zid); for (const z of sc?.hazards || []) if (zp.pairs?.[z.id]) { PAIR3D[z.bad] = zp.pairs[z.id].bad; PAIR3D[z.good] = zp.pairs[z.id].good; if (zp.pairs[z.id].meta) PMETA[z.id] = zp.pairs[z.id].meta; pairsDone.add(zid); } } } catch { PRE = { zones: {} }; }
  noteHour(); save();
  TITLE = makeTitle({ h, t, ic, icon, sapi, logoMark, renderMascot, UI, saveUI, isPic, canSpeak, speak, sayBtn, dots, autoSay, autoSayOn, reduceMotion, applyPrefs, tap, toast, hasGL, mountSite, T, shown, srcShort,
    get S() { return S; }, get SC() { return SC; }, get PRE() { return PRE; }, get SRC() { return SRC; }, starSum, allScenes, go,
    continueGame: () => go('home'), preTest: () => runPicTest('pre'), postTest: () => runPicTest('post'), exportData, wipe: wipeAll });
  await op;
  const hs = location.hash.replace('#', '');
  // v20: 주소에 화면이 있으면 그 화면, 아니면 타이틀 화면(메인 메뉴)
  if (['home', 'review', 'record', 'practice', 'locked'].includes(hs)) go(hs === 'locked' ? 'practice' : hs);
  else TITLE.showTitle({ fromOpening: true });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
// 자동 점검용 (tools/smoke-learn.mjs)
window.__learn = { get TITLE() { return TITLE; }, applyPrefs, swipeSet: (id, o) => swipeSet(id, o), get SC() { return SC; }, openScene: (id, o) => openScene(id, { go: true, ...o }), preview: (id) => openScene(id), openCard: (id) => openCard(id), cardPNG: (id) => cardPNG(scene(id)), get PRE() { return PRE; }, goHome: () => go('home'), go: (x) => go(x), get S() { return S; }, get D() { return D; }, get SRC() { return SRC; }, get UI() { return UI; }, exportPayload, chars, lessonFacts, DEV, t };
if (DEV) document.documentElement.classList.add('dev');
boot();
