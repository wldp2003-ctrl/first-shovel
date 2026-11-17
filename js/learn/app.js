// 첫 삽 1단계 — 기초 교육 앱 (게임과 분리)
// 레슨·카드·문제·근거는 data/lessons.json 한 파일에서 읽는다. 기록은 이 기기(localStorage)에만 저장.
import { art, dressFigure } from './art.js';
import { icon, LESSON_ICON, LESSON_TONE } from './icons.js';
import { logoMark, sapi, building } from './brand.js';
import { sceneFloor, pair } from './scene-art.js';
import { sceneTbm, sceneScaffold, sceneLifting, sceneEquip, scenePour, sceneHot, STOP } from './scene-art2.js';

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
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
  app().append(h('header', { class: 'top' }, h('div', { class: 'brand' }, h('span', { class: 'mark', html: logoMark({ size: 28 }) }), h('b', {}, t('app.name')), h('span', {}, t('app.sub'))),
      n > 0 ? h('div', { class: 'streak', title: t('home.streak', { n }) }, ic('streak', { size: 16 }), h('span', {}, t('home.streak', { n }))) : null, sayBtn(), modeBtn(), h('button', { class: 'gear', 'aria-label': t('settings.title'), onclick: () => { go('record'); setTimeout(() => $('.set')?.scrollIntoView({ block: 'center' }), 50); } }, ic('settings')), h('div', { class: 'prog-mini', id: 'progMini' })),
    h('main', { id: 'view', class: 'view-in' }),
    h('nav', { class: 'tabs', id: 'tabs' }, ...[
      ['home', 'learn'], ['review', 'review'], ['record', 'record'], ['practice', 'practice'],
    ].map(([id, nm]) => h('button', { 'data-tab': id, onclick: () => go(id) }, ic(nm), h('span', {}, t('nav.' + id)), id === 'practice' && !isComplete() ? h('em', { class: 'lock', 'aria-label': t('nav.locked') }, ic('lock', { size: 12 })) : null))));
}
function go(tb) {
  timeStop();
  tab = tb; if (history.state?.deep) history.back();
  shell(); document.body.classList.remove('deep');
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tb));
  $('#progMini').textContent = `${lessonsDone()} / ${D.lessons.length}`;
  ({ home, review, record, practice })[tb]($('#view'));
  window.scrollTo(0, 0);
}
// 레슨·점검처럼 화면 전체를 쓰는 단계 (휴대전화 뒤로 가기 → 목록)
function deep(title, onBack) {
  if (!history.state?.deep) history.pushState({ deep: true }, '');
  document.body.classList.add('deep');
  app().innerHTML = '';
  const back = h('button', { class: 'back', 'aria-label': t('common.back'), onclick: () => { onBack?.(); go(tab); } }, ic('back'));
  const view = h('main', { id: 'view', class: 'deepview view-in' });
  app().append(h('header', { class: 'top deep' }, back, h('div', { class: 'ttl' }, title), h('div', { class: 'dots', id: 'dots' }), sayBtn()), view);
  window.scrollTo(0, 0);
  return view;
}
window.addEventListener('popstate', () => { if (document.body.classList.contains('deep')) { timeStop(); go(tab); } });
const dots = (n, i) => { const d = $('#dots'); if (!d) return; d.innerHTML = ''; for (let k = 0; k < n; k++) d.append(h('i', { class: k < i ? 'done' : k === i ? 'on' : '' })); };

/* ---------------- 첫 화면: 현장 지도 (v13) ---------------- */
function home(v) {
  v.dataset.say = !S.pre ? t('say.homeStart') : t('say.home');
  const n = starSum(), max = SC.scenes.length * 3, rk = rankOf(n), goal = rk < 2 ? RANKS[rk + 1] : max;
  v.append(h('section', { class: 'rank-card' },
    h('span', { class: 'sapi-s', html: sapi({ size: 56, mood: allScenes() ? 'cheer' : 'hi' }) }),
    h('div', { class: 'rank-main' },
      h('div', { class: 'rank-row' }, rankMark(rk), isPic() ? null : h('b', {}, t('rank.' + rk))),
      h('div', { class: 'star-row', 'aria-label': `${n}/${max}` }, h('span', { class: 'st-on' }, ic('star', { size: 20 })), h('b', {}, String(n)), h('small', {}, `/ ${max}`)),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(goal), 'aria-valuenow': String(n) }, h('i', { style: `width:${Math.min(100, (n / goal) * 100)}%` })),
      isPic() ? null : h('small', { class: 'rank-next' }, rk < 2 ? t('rank.next', { n: goal - n, r: t('rank.' + (rk + 1)) }) : t('rank.top')))));
  v.append(nextStep(), siteMap());
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
  v.append(h('details', { class: 'more-lessons', open: isPic() ? null : true }, h('summary', {}, ic('learn', { size: 20 }), h('span', {}, t('home.lessonsMore'))), isPic() ? null : h('p', { class: 'small' }, t('home.lessonsMoreNote')), list));
  v.append(h('p', { class: 'note' }, t('home.note')));
}
// 지금 할 일 하나: 그림 점검 → 다음 장면 → 멈추고 알려요 → 마지막 점검 → 확인서
function nextStep() {
  const P = isPic(), nx = nextScene();
  const cta = (id, onclick, left, small, title) => h('button', { class: 'btn primary big cta', id, onclick, 'aria-label': title }, h('span', { class: 'cta-ic' }, left), h('span', { class: 'cta-t' }, P ? null : h('small', {}, small), P ? ic('finger', { size: 22 }) : h('b', {}, title)), ic('next'));
  if (!S.pre) return cta('startBtn', () => runPicTest('pre'), ic('check'), t('home.startSmall'), t('home.startCheck'));
  if (nx) return cta('contBtn', () => openScene(nx.id), thumb(nx), t('home.nextScene'), `${nx.no}. ${nx.title}`);
  if (!S.stop?.done) return cta('stopBtn', stopTell, ic('stop'), t('home.last'), t('stop.title'));
  if (!S.post) return cta('postBtn', () => runPicTest('post'), ic('check'), t('home.postSmall'), t('home.post'));
  return cta('certBtn', showCert, ic('cert'), t('home.doneSmall'), t('home.cert'));
}
// 현장 지도: 건물 한 동. 아래(0 출근)부터 위(6)로, 지붕은 "멈추고 알려요"(준공)
function siteMap() {
  const nx = nextScene(), all = allScenes();
  const bld = h('div', { class: 'bld' });
  bld.append(h('button', { class: 'roof' + (S.stop?.done ? ' done' : all ? ' open' : ''), id: 'roofBtn', disabled: all ? null : true, 'aria-label': t('stop.title'), onclick: stopTell },
    h('span', { class: 'roof-flag' }, ic(S.stop?.done ? 'flag' : 'stop', { size: 22 })), isPic() ? null : h('span', {}, t('stop.title')), all ? null : ic('lock', { size: 14 })));
  SC.scenes.map((s, i) => [s, i]).reverse().forEach(([s, i]) => {
    const open = sceneOpen(i), b = S.scenes?.[s.id]?.best;
    bld.append(h('button', { class: `floor${open ? '' : ' locked'}${b ? ' done' : ''}${nx?.id === s.id ? ' cur' : ''}`, disabled: open ? null : true, 'data-scene': s.id, 'aria-label': `${s.no}. ${s.title}`, onclick: () => openScene(s.id) },
      h('span', { class: 'fl-no' }, String(s.no)), thumb(s),
      h('span', { class: 'fl-t' }, isPic() ? null : h('b', {}, s.title), b ? stars(b.stars, 18) : open ? ic('finger', { size: 20 }) : ic('lock', { size: 16 }))));
  });
  bld.append(h('div', { class: 'bld-ground' }));
  return h('section', { class: 'map', 'aria-label': t('map.title') }, isPic() ? null : h('h2', { class: 'sec' }, t('map.title')), bld);
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
    h('span', { class: 'lic tone-yellow' }, ic('search')), h('span', { class: 'today-t' }, isPic() ? ic('time', { size: 20 }) : h('b', {}, t('today.title')), isPic() ? null : h('small', {}, t('today.sub'))), thumb(sc), ic('next'));
}

function optionList(q, order, onPick) {
  if (q.optionArts) return h('div', { class: 'opts pics' }, order.map((k) => h('button', { class: 'opt pic-opt', onclick: (e) => onPick(k, e.currentTarget) }, pic(q.optionArts[k], 'pic sm'), h('span', {}, T(q.options[k])))));
  return h('div', { class: 'opts' }, order.map((k) => h('button', { class: 'opt', onclick: (e) => onPick(k, e.currentTarget) }, h('span', { class: 'opt-t' }, T(q.options[k])))));
}
// 정답: 초록 체크가 톡 (0.3초) + 짧은 진동 · 오답: 흔들림 없이 차분히
function markRight(btn) { btn.classList.add('right'); btn.append(h('span', { class: 'mark-ok' }, ic('check', { size: 20 }))); buzz(15); beep(); }
function markWrong(btn) { btn.classList.add('wrong'); btn.append(h('span', { class: 'mark-no' }, ic('cross', { size: 18 }))); }

/* ---------------- v13 가요 / 멈춰요 (출근 전 1분) ---------------- */
// 그림 한 장씩: 위험하면 왼쪽(멈춰요 ✋), 안전하면 오른쪽(가요 ✓). 손가락으로 밀거나 아래 버튼. 틀려도 벌 없이 바른 쪽을 보여 주고 넘어감
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
  v.append(h('div', { class: 'sw-head' }, h('span', { class: 'sw-l' }, ic('back', { size: 18 }), ic('stop', { size: 22 })), isPic() ? h('span', { class: 'sw-mid' }, ic('finger', { size: 24 })) : h('p', { class: 'scene-ask' }, t('swipe.ask')), h('span', { class: 'sw-r' }, ic('check', { size: 22 }), ic('next', { size: 18 }))),
    dotsRow, stage, h('div', { class: 'sw-btns' }, bStop, bGo));
  let busy = false;
  function show() {
    stage.innerHTML = '';
    if (i >= cards.length) return end();
    const c = cards[i];
    const card = h('div', { class: 'sw-card', 'data-side': c.side }, h('span', { class: 'pic', html: pair(c.z[c.side]) }));
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
    card.classList.add(side === 'bad' ? 'out-l' : 'out-r');
    setTimeout(() => { bStop.classList.remove('hint'); bGo.classList.remove('hint'); i++; busy = false; show(); }, reduceMotion() ? 200 : ok ? 520 : 1100);
  }
  function end() {
    const n = res.filter((r) => r.ok).length;
    (S.swipe ||= {})[id] = { ok: n, n: res.length, tries: (S.swipe?.[id]?.tries || 0) + 1, timeMs: Date.now() - t0, at: Date.now(), hour: new Date().getHours(), mode: UI.mode || 'pic' };
    save();
    if (o.today) { UI.todayDone = dayStr(); saveUI(); }
    bStop.remove(); bGo.remove();
    stage.append(h('div', { class: 'result' }, h('span', { class: 'sapi-s', html: sapi({ size: 64, mood: n === res.length ? 'cheer' : 'hi' }) }),
      isPic() ? null : h('div', { class: 'big' }, t('swipe.score', { n: res.length, s: n })),
      h('div', { class: 'nav2' }, h('button', { class: 'btn', id: 'swAgain', 'aria-label': t('scene.again'), onclick: () => swipeSet(id, o) }, ic('retry'), isPic() ? null : h('span', {}, t('scene.again'))),
        h('button', { class: 'btn primary', id: 'swHome', 'aria-label': t('scene.home'), onclick: () => go('home') }, isPic() ? ic('learn') : h('span', {}, t('scene.home')), ic('next')))));
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
      h('div', { class: 'pt-ask' }, h('span', { class: 'pt-good' }, ic('check', { size: 26 })), ic('finger', { size: 28 }), isPic() ? null : h('b', {}, t('test.pickSafe'))),
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
        h('button', { class: 'btn primary big', id: 'toScene0', 'aria-label': t('test.toScene0'), onclick: () => openScene(SC.scenes[0].id) }, isPic() ? thumb(SC.scenes[0]) : h('span', {}, t('test.toScene0')), ic('next')));
    } else {
      const pre = S.pre?.kind === 'pic' ? S.pre : null;
      v.append(h('div', { class: 'result' }, pre ? marks(pre) : null, marks(rec),
        h('div', { class: 'cmp' }, h('div', {}, h('small', {}, t('test.preShort')), h('b', {}, pre ? String(pre.score) : '-')), ic('next'), h('div', { class: 'up' }, h('small', {}, t('test.postShort')), h('b', {}, String(rec.score)))),
        isPic() ? null : h('p', {}, !pre ? t('test.oldPre') : rec.score > pre.score ? t('test.better', { n: rec.score - pre.score }) : t('test.reviewHintV13'))),
        h('button', { class: 'btn primary big', id: 'toCert', 'aria-label': t('test.getCert'), onclick: () => finale(showCert) }, ic('cert'), isPic() ? null : h('span', {}, t('test.getCert'))));
    }
  };
  show(0);
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
      h('button', { class: 'btn primary big', id: 'stopNext', 'aria-label': S.post ? t('scene.home') : t('home.post'), onclick: () => (S.post ? go('home') : runPicTest('post')) }, isPic() ? ic(S.post ? 'learn' : 'check') : h('span', {}, S.post ? t('scene.home') : t('home.post')), ic('next'))));
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
  // 해 본 장면에서 아직 못 찾은 위험
  const fs = foundSet(), tried = new Set(Object.keys(S.scenes || {}));
  const missed = allHazards().filter((z) => tried.has(z.sc.id) && !fs.has(z.id));
  v.append(h('h2', { class: 'sec' }, isPic() ? ic('search') : t('review.missed')));
  if (!missed.length) v.append(empty(t('review.missedEmpty')));
  const det = h('div', { class: 'miss-detail' });
  v.append(h('div', { class: 'missed' }, missed.map((z) => h('button', { class: 'miss-row', onclick: () => { det.innerHTML = ''; det.append(hazCard(z, () => { det.innerHTML = ''; }, t('common.close'))); det.scrollIntoView({ block: 'nearest' }); } }, hazIc(z.type, 18), isPic() ? h('span', { class: 'pic xs', html: pair(z.bad) }) : h('span', {}, T(z.name)), ic('next', { size: 18 })))), det);
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
  // 도감: 위험 종류별로 찾은 수 / 전체, 찾은 위험은 그림으로
  v.append(h('h2', { class: 'sec' }, t('record.dex')), dex());
  v.append(h('h2', { class: 'sec' }, t('record.scenes')),
    h('div', { class: 'rec-list' }, SC.scenes.map((sc) => { const r = S.scenes?.[sc.id];
      return h('div', { class: 'rec-row' }, thumb(sc), h('span', { class: 'rec-t' }, h('b', {}, `${sc.no}. ${sc.title}`), h('small', {}, r ? `${t('record.tries', { n: r.tries })} · ${mmss(r.timeMs)}` : t('record.notYet'))), h('span', { class: 'rec-s' }, r?.best ? stars(r.best.stars, 14) : '-')); })));
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
// 설정: 소리(기본 꺼짐)·진동·기록 지우기
function settingsBox() {
  const row = (name, key, label) => h('label', { class: 'set-row' }, ic(name), h('span', {}, label), h('input', { type: 'checkbox', role: 'switch', checked: UI[key] ? true : null, onchange: (e) => { UI[key] = e.target.checked; saveUI(); if (key === 'sound' && UI.sound) beep(); } }));
  return h('div', { class: 'card-lite set' },
    row('sound', 'sound', t('settings.sound')), row('vibrate', 'vibrate', t('settings.vibrate')),
    h('div', { class: 'set-row' }, ic('globe'), h('span', {}, t('settings.lang')), h('b', {}, '한국어')),
    h('button', { class: 'btn danger', onclick: () => { if (confirm(t('settings.wipeAsk'))) { localStorage.removeItem(KEY); localStorage.removeItem(DONE_KEY); S = fresh(); UI.floorsSeen = 0; saveUI(); noteHour(); save(); go('home'); } } }, t('settings.wipe')));
}
// 개인정보 없는 결과: 무작위 번호, 점수, 시간, 시간대만
export function exportPayload() {
  return {
    app: '첫 삽 기초 교육', version: D.version, anonId: S.anon, exportedDay: new Date().toISOString().slice(0, 10),
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

/* ---------------- 처음 실행: 안내 3장 → 언어 → 사전 점검 ---------------- */
function intro() {
  const v = deep(t('intro.title'));
  const slides = [
    { art: sapi({ size: 120, mood: 'hi' }), h: t('intro.s1h'), p: t('intro.s1p') },
    { art: `<div class="intro-scene">${sceneFloor()}</div><div class="intro-icons">${['fall', 'struck', 'hit', 'collapse', 'shock'].map((x) => `<span class="haz-ic">${icon(x)}</span>`).join('')}</div>`, h: t('intro.s2h'), p: t('intro.s2p') },
    { art: `<span class="intro-cert">${icon('cert', { size: 72 })}</span>`, h: t('intro.s3h'), p: t('intro.s3p') },
  ];
  let i = 0;
  const finish = () => { UI.introDone = true; saveUI(); lang(); };
  const show = () => {
    dots(slides.length + 1, i);
    v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
    const s = slides[i];
    v.append(h('div', { class: 'intro' }, h('div', { class: 'intro-art', html: s.art }), h('h2', {}, s.h), h('p', {}, s.p)),
      h('div', { class: 'nav2' }, h('button', { class: 'btn', id: 'introSkip', onclick: finish }, t('intro.skip')),
        h('button', { class: 'btn primary', id: 'introNext', onclick: () => { if (++i < slides.length) show(); else finish(); } }, h('span', {}, i + 1 < slides.length ? t('common.next') : t('intro.go')), ic('next'))));
  };
  // 언어 고르기: 지금은 한국어만. 다른 언어는 "준비 중"(회색)
  const lang = () => {
    dots(slides.length + 1, slides.length);
    v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
    const langs = [['ko', '한국어', true], ['en', 'English', false], ['vi', 'Tiếng Việt', false], ['zh', '中文', false], ['ru', 'Русский', false]];
    v.append(h('div', { class: 'intro' }, h('span', { class: 'intro-cert' }, ic('globe', { size: 56 })), h('h2', {}, t('intro.langH'))),
      h('div', { class: 'opts langs' }, langs.map(([id, nm, ok]) => h('button', { class: 'opt' + (ok ? ' right sel' : ''), disabled: !ok, 'data-lang': id, lang: id }, h('span', { class: 'opt-t' }, nm), ok ? h('span', { class: 'mark-ok' }, ic('check', { size: 20 })) : h('small', { class: 'soon' }, t('intro.soon'))))),
      h('h2', { class: 'mode-h' }, t('intro.modeH')),
      h('div', { class: 'mode-pick' }, [['pic', ['eye', 'finger'], t('intro.modePic')], ['text', ['textmode'], t('intro.modeText')]].map(([m, icn, lb]) => h('button', { class: 'mode-opt' + ((UI.mode || 'pic') === m ? ' sel' : ''), 'data-mode': m, 'aria-pressed': String((UI.mode || 'pic') === m), onclick: () => { UI.mode = m; saveUI(); lang(); } }, h('span', { class: 'mode-ics' }, icn.map((n) => ic(n, { size: 30 }))), h('b', {}, lb)))),
      h('button', { class: 'btn primary big', id: 'langGo', onclick: () => runPicTest('pre') }, h('span', {}, t('intro.toPre')), ic('next')));
  };
  show();
}

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
const isPic = () => UI.mode !== 'text';
const SC_ART = { sceneFloor, sceneTbm, sceneScaffold, sceneLifting, sceneEquip, scenePour, sceneHot };
const HAZ_TYPES = ['fall', 'trip', 'pierce', 'struck', 'hit', 'caught', 'collapse', 'shock', 'fire', 'suffocate', 'heat'];
const scene = (id) => SC.scenes.find((s) => s.id === id);
const SR = (id) => (S.scenes ||= {})[id] ||= { tries: 0, timeMs: 0, best: null, last: null };
// 음성(선택): 기기 음성으로 한 줄 읽기. 소리 없이도 이해되게 그림이 먼저
const canSpeak = () => 'speechSynthesis' in window;
function speak(text) { if (!canSpeak()) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.95; speechSynthesis.speak(u); } catch {} }
const speakBtn = (text) => canSpeak() ? h('button', { class: 'btn icon-only speak', 'aria-label': t('scene.listen'), onclick: () => speak(text) }, ic('sound', { size: 26 }), isPic() ? null : h('span', {}, t('scene.listen'))) : null;
// 위험 종류 아이콘: 경고(노랑 삼각형) 안에
const hazIc = (type, size = 22) => h('span', { class: 'haz-ic' }, ic(HAZ_TYPES.includes(type) ? type : 'accidents', { size }));
const stars = (n, size = 28) => h('span', { class: 'stars', 'aria-label': `${n}/3` }, [1, 2, 3].map((k) => h('span', { class: 'st-' + (k <= n ? 'on' : 'off') }, ic('star', { size }))));

function openScene(id, o = {}) {
  const sc = scene(id), rec = SR(id);
  const v = deep(isPic() ? `${sc.no}` : `${sc.no}. ${sc.title}`);
  markStudyDay();
  const t0 = Date.now();
  let found = [], tapsMiss = 0, ended = false;
  rec.tries++; save();
  // 무작위 출제: 레이어로 그린 장면은 처음엔 위험 전부(측정용), 다시 할 때는 2~4개를 골라 낸다. 안 낸 위험은 안전한 모습으로 그려짐
  const pool = sc.hazards.filter((z) => shown(z.line));
  const hz = sc.layered && rec.tries > 1 && !o.all ? shuffle(pool).slice(0, Math.min(pool.length, 2 + Math.floor(Math.random() * (Math.min(4, pool.length) - 1)))).sort((a, b) => pool.indexOf(a) - pool.indexOf(b)) : pool;
  const off = sc.hazards.filter((z) => !hz.includes(z)); // 꺼진 위험 = 이번엔 안전한 곳
  const total = hz.length;
  // 찾은 위험 칸 (노랑 삼각형 자리 — 찾으면 채워짐)
  const slots = h('div', { class: 'haz-slots', 'aria-label': t('scene.count', { f: 0, n: total }) }, hz.map((z) => h('span', { class: 'haz-slot', 'data-id': z.id }, hazIc(z.type, 16))));
  const box = h('div', { class: 'scene-box', html: SC_ART[sc.art](sc.layered ? hz.map((z) => z.id) : undefined) });
  v.dataset.say = t('scene.ask');
  const layer = h('div', { class: 'scene-layer' });
  box.append(layer);
  const pct = (a) => ({ left: `${(a.x / 400) * 100}%`, top: `${(a.y / 300) * 100}%`, width: `${(a.r * 2 / 400) * 100}%` });
  const ring = (a, cls) => { const p = pct(a); const el = h('span', { class: 'ring ' + cls, style: `left:${p.left};top:${p.top};width:${p.width}` }); layer.append(el); return el; };
  const sheet = h('div', { class: 'scene-sheet', 'aria-live': 'polite' });
  const endBtn = h('button', { class: 'btn', id: 'sceneEnd', onclick: () => finish() }, ic('flag'), isPic() ? null : h('span', {}, t('scene.end')));
  v.append(h('div', { class: 'scene-top' }, h('span', { class: 'lic sm tone-yellow' }, ic('search', { size: 18 })), slots, endBtn),
    isPic() ? null : h('p', { class: 'scene-ask' }, t('scene.ask')),
    box, sheet);
  // 그림 모드 안내: 손가락이 장면을 두 번 눌러 보이는 애니메이션 (답 위치는 알려 주지 않음)
  if (!reduceMotion()) { const f = h('span', { class: 'finger-demo' }, ic('finger', { size: 40 })); box.append(f); setTimeout(() => f.remove(), 2200); }

  box.addEventListener('click', (e) => {
    if (ended) return;
    const r = box.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400, y = ((e.clientY - r.top) / r.height) * 300;
    const near = (a) => Math.hypot(a.x - x, a.y - y) <= a.r;
    const z = hz.filter((q) => !found.includes(q.id) && near(q.area)).sort((p, q) => Math.hypot(p.area.x - x, p.area.y - y) - Math.hypot(q.area.x - x, q.area.y - y))[0];
    if (z) { found.push(z.id); ring(z.area, 'hit'); slots.querySelector(`[data-id="${z.id}"]`).classList.add('on'); buzz(15); beep(); showHazard(z); return; }
    const sf = [...sc.safe, ...off].find((q) => near(q.area));
    if (sf) { ring(sf.area, 'safe'); showSafe(off.includes(sf) ? { area: sf.area } : sf); return; }
    tapsMiss++;
    const rp = h('span', { class: 'ripple', style: `left:${(x / 400) * 100}%;top:${(y / 300) * 100}%` }); layer.append(rp); setTimeout(() => rp.remove(), 500);
  });

  // 찾은 위험: 위험한 모습 → 안전한 모습 두 장 + 한 줄(글 모드) + 듣기
  function showHazard(z) {
    sheet.innerHTML = '';
    sheet.append(hazCard(z, () => { sheet.innerHTML = ''; if (found.length >= total) finish(); }, found.length >= total ? t('scene.seeResult') : t('scene.keep')));
    sheet.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }
  // 함정(이미 안전한 곳): 회색 엄지 — 맞았다/틀렸다가 아니라 "여긴 괜찮아요"
  function showSafe(sf) {
    sheet.innerHTML = '';
    sheet.append(h('div', { class: 'haz-card safe-card' }, h('div', { class: 'haz-head' }, h('span', { class: 'thumb-ic' }, ic('thumb', { size: 22 })), isPic() ? null : h('b', {}, t('scene.safe')), h('span', { class: 'grow' }), speakBtn(t('scene.safe'))),
      isPic() || !sf.name ? null : h('p', { class: 'haz-line' }, T(sf.name)),
      h('button', { class: 'btn big', onclick: () => { sheet.innerHTML = ''; } }, isPic() ? ic('search') : h('span', {}, t('scene.keep')), ic('next'))));
  }
  // 끝: 놓친 곳을 보여 주고 별
  function finish() {
    if (ended) return; ended = true;
    endBtn.remove();
    const ms = Date.now() - t0; rec.timeMs += ms;
    const missed = hz.filter((z) => !found.includes(z.id));
    missed.forEach((z) => ring(z.area, 'miss'));
    // 찾기 → 어떻게 할까 (찾은 위험 하나를 무작위로)
    const q = shuffle(hz.filter((z) => found.includes(z.id) && z.act))[0];
    if (q) askAct(q, (act) => result(missed, act)); else result(missed, null);
  }
  function askAct(z, then) {
    sheet.innerHTML = '';
    v.dataset.say = t('act.ask');
    const opts = shuffle(['stop', 'tell', 'ppe']);
    const box2 = h('div', { class: 'act-card', id: 'actCard', 'data-hz': z.id },
      h('div', { class: 'act-q' }, h('span', { class: 'pic', html: pair(z.bad) }), h('span', { class: 'act-ask' }, ic('finger', { size: 26 }), h('b', {}, '?')), isPic() ? null : h('p', {}, t('act.ask')), speakBtn(t('act.ask'))),
      h('div', { class: 'act-opts' }, opts.map((a) => h('button', { class: 'act-opt', 'data-act': a, 'aria-label': t('act.' + a), onclick: (e) => pick(a, e.currentTarget) }, h('span', { class: 'pic', html: STOP[a]() }), isPic() ? null : h('small', {}, t('act.' + a))))));
    const done = { picked: false };
    function pick(a, btn) {
      if (done.picked) return; done.picked = true;
      const right = a === z.act;
      box2.querySelectorAll('.act-opt').forEach((b) => (b.disabled = true));
      if (right) markRight(btn); else { markWrong(btn); markRight(box2.querySelector(`[data-act="${z.act}"]`)); }
      const line = SC.acts[z.act];
      box2.append(h('div', { class: 'act-fb ' + (right ? 'good' : 'bad') }, h('span', { class: 'sapi-s', html: sapi({ size: 44, mood: right ? 'cheer' : 'think' }) }), isPic() ? null : h('b', {}, T(line)), h('span', { class: 'grow' }), speakBtn(T0(line))),
        h('button', { class: 'btn primary big', id: 'actNext', 'aria-label': t('scene.seeResult'), onclick: () => then({ hz: z.id, pick: a, ok: right }) }, isPic() ? ic('star') : h('span', {}, t('scene.seeResult')), ic('next')));
    }
    sheet.append(box2);
    sheet.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }
  function result(missed, act) {
    v.dataset.say = '';
    const n = found.length, st = n >= total ? 3 : n * 2 >= total ? 2 : 1;
    rec.last = { found: [...found], total, active: hz.map((z) => z.id), stars: st, at: Date.now(), hour: new Date().getHours(), mode: UI.mode || 'pic', missTaps: tapsMiss, today: !!o.today, act };
    rec.seen = [...new Set([...(rec.seen || []), ...found])];
    if (o.today) { UI.todayDone = dayStr(); saveUI(); }
    if (!rec.best || st > rec.best.stars || n > rec.best.found.length) rec.best = { found: [...found], stars: st };
    save();
    sheet.innerHTML = '';
    const detail = h('div', { class: 'miss-detail' });
    sheet.append(h('div', { class: 'scene-result' },
      h('div', { class: 'res-top' }, h('span', { class: 'sapi-s', html: sapi({ size: 64, mood: st === 3 ? 'cheer' : 'hi' }) }), stars(st, 34)),
      h('div', { class: 'res-icons' }, hz.map((z) => h('span', { class: 'res-ic ' + (found.includes(z.id) ? 'on' : 'off') }, hazIc(z.type, 18)))),
      isPic() ? null : h('p', { class: 'res-t' }, t('scene.result', { n: total, f: n })),
      missed.length ? h('div', { class: 'missed' }, isPic() ? null : h('b', {}, t('scene.missed')),
        missed.map((z) => h('button', { class: 'miss-row', onclick: () => { detail.innerHTML = ''; detail.append(hazCard(z, () => { detail.innerHTML = ''; }, t('common.close'))); detail.scrollIntoView({ block: 'nearest' }); } }, hazIc(z.type, 18), isPic() ? h('span', { class: 'pic xs', html: pair(z.bad) }) : h('span', {}, T(z.name)), ic('next', { size: 18 })))) : null,
      detail,
      isPic() ? null : sceneBasis(sc),
      h('button', { class: 'btn swipe-go', id: 'swipeBtn', 'aria-label': t('swipe.title'), onclick: () => swipeSet(id) }, ic('stop', { size: 20 }), ic('check', { size: 20 }), isPic() ? null : h('span', {}, t('swipe.title'))),
      h('div', { class: 'nav2' }, h('button', { class: 'btn', id: 'sceneAgain', 'aria-label': t('scene.again'), onclick: () => openScene(id) }, ic('retry'), isPic() ? null : h('span', {}, t('scene.again'))), afterBtn())));
    sheet.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }
  // 결과 다음 버튼: 다음 장면 → (다 깼으면) 멈추고 알려요 → 처음으로
  function afterBtn() {
    const i = SC.scenes.indexOf(sc), nx = SC.scenes[i + 1];
    if (!o.today && nx && sceneOpen(i + 1)) return h('button', { class: 'btn primary', id: 'sceneNext', 'aria-label': `${nx.no}. ${nx.title}`, onclick: () => openScene(nx.id) }, isPic() ? thumb(nx) : h('span', {}, t('scene.next', { no: nx.no })), ic('next'));
    if (!o.today && allScenes() && !S.stop?.done) return h('button', { class: 'btn primary', id: 'sceneStop', 'aria-label': t('stop.title'), onclick: stopTell }, ic('stop'), isPic() ? null : h('span', {}, t('stop.title')), ic('next'));
    return h('button', { class: 'btn primary', id: 'sceneHome', 'aria-label': t('scene.home'), onclick: () => go('home') }, isPic() ? ic('learn') : h('span', {}, t('scene.home')), ic('next'));
  }
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
    h('div', { class: 'haz-head' }, hazIc(z.type), isPic() ? null : h('b', { class: isDraft(z.name) ? 'draft' : '' }, T(z.name)), h('span', { class: 'grow' }), speakBtn(T0(z.line))),
    h('div', { class: 'pair' },
      h('figure', { class: 'bad' }, h('div', { class: 'pic', html: pair(z.bad) }), h('span', { class: 'mk mk-bad' }, ic('cross', { size: 18 })), isPic() ? null : h('figcaption', {}, t('scene.bad'))),
      h('span', { class: 'pair-arrow' }, ic('next')),
      h('figure', { class: 'good' }, h('div', { class: 'pic', html: pair(z.good) }), h('span', { class: 'mk mk-good' }, ic('check', { size: 18 })), isPic() ? null : h('figcaption', {}, t('scene.good')))),
    isPic() ? null : h('p', { class: 'haz-line' + (isDraft(z.line) ? ' draft' : '') }, T(z.line)),
    h('button', { class: 'btn primary big', onclick: onNext }, isPic() ? ic('search') : h('span', {}, label), ic('next')));
}
// 그림 모드 / 글 모드 바꾸기 (상단 버튼)
function modeBtn() {
  return h('button', { class: 'mode-btn', id: 'modeBtn', 'aria-label': isPic() ? t('mode.toText') : t('mode.toPic'), onclick: () => { UI.mode = isPic() ? 'text' : 'pic'; saveUI(); go(tab); } },
    h('span', { class: 'mode-on' }, ic(isPic() ? 'eye' : 'textmode', { size: 20 })), h('span', { class: 'mode-off' }, ic(isPic() ? 'textmode' : 'eye', { size: 16 })));
}

/* ---------------- 오프닝 "첫 삽" ---------------- */
// 하루 첫 실행: 1.8초 전체 · 그 뒤: 0.5초 짧게 · 동작 줄이기: 애니메이션 없이 로고만 · 누르면 바로 넘어감
function opening() {
  return new Promise((resolve) => {
    const today = dayStr(), full = UI.openDay !== today, still = reduceMotion();
    UI.openDay = today; saveUI();
    const ms = still ? 600 : full ? 1800 : 500;
    const el = h('div', { id: 'opening', class: still ? 'still' : full ? 'full' : 'short', role: 'button', 'aria-label': t('opening.skip') },
      h('div', { class: 'op-mark', html: logoMark({ size: 132 }) }),
      h('div', { class: 'op-name' }, t('app.name')), h('div', { class: 'op-sub' }, t('app.sub')));
    document.body.append(el);
    let gone = false;
    const done = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), still ? 0 : 200); resolve(); };
    el.addEventListener('pointerdown', done);
    setTimeout(done, ms);
    window.__opening = { full, still, ms };
  });
}

/* ---------------- 시작 ---------------- */
function noteHour() { const hr = new Date().getHours(); S.hours[hr] = (S.hours[hr] || 0) + 1; }
async function boot() {
  S = load(); loadUI();
  // 예전 기록에서 공부한 날 채우기 (연속 출근 표시용)
  if (!UI.days.length) { const ts = [S.created, S.pre?.at, S.post?.at, ...Object.values(S.lessons || {}).flatMap((l) => [l.startAt, l.doneAt])].filter(Boolean); UI.days = [...new Set(ts.map((x) => dayStr(new Date(x))))].sort().slice(-60); }
  try { LOC = await (await fetch('./locales/ko.json')).json(); } catch {}
  const op = opening();
  document.documentElement.classList.remove('boot');
  try { D = await (await fetch('./data/lessons.json')).json(); SRC = Object.fromEntries((await (await fetch('./data/sources.json')).json()).sources.map((s) => [s.id, s])); SC = await (await fetch('./data/scenes.json')).json(); }
  catch (e) { app().innerHTML = ''; app().append(h('p', { style: 'padding:24px' }, t('app.loadFail'))); return; }
  noteHour(); save();
  await op;
  const hs = location.hash.replace('#', '');
  go(['home', 'review', 'record', 'practice'].includes(hs) ? hs : hs === 'locked' ? 'practice' : 'home');
  if (!S.pre && !UI.introDone && !hs) intro(); // 처음 실행: 안내 3장 → 언어 → 사전 점검
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
// 자동 점검용 (tools/smoke-learn.mjs)
window.__learn = { swipeSet: (id, o) => swipeSet(id, o), get SC() { return SC; }, openScene: (id, o) => openScene(id, o), goHome: () => go('home'), go: (x) => go(x), get S() { return S; }, get D() { return D; }, get SRC() { return SRC; }, get UI() { return UI; }, exportPayload, chars, lessonFacts, DEV, t };
if (DEV) document.documentElement.classList.add('dev');
boot();
