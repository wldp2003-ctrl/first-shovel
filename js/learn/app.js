// 첫 삽 1단계 — 기초 교육 앱 (게임과 분리)
// 레슨·카드·문제·근거는 data/lessons.json 한 파일에서 읽는다. 기록은 이 기기(localStorage)에만 저장.
import { art, dressFigure } from './art.js';

// append(..., 조건 ? 요소 : null)에서 "null" 글자가 찍히지 않게
if (!Element.prototype.append.__skipNull) {
  const orig = Element.prototype.append;
  Element.prototype.append = function (...n) { return orig.apply(this, n.filter((x) => x != null && x !== false)); };
  Element.prototype.append.__skipNull = true;
}

const KEY = 'cheotsap.learn.v1';
const DONE_KEY = 'cheotsap.learn.done'; // 게임(game.html) 잠금 해제 표시
let D = null; // lessons.json
let S = null; // 학습 기록
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
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const rid = () => Math.random().toString(36).slice(2, 10);
const today = () => { const d = new Date(); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`; };
const chars = (c) => (c.text + (c.more || '')).replace(/\s/g, '').length;

/* ---------------- 기록 ---------------- */
const fresh = () => ({ v: 1, anon: rid(), created: Date.now(), pre: null, post: null, lessons: {}, wrong: [], hours: {}, name: '', certAt: null });
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) return Object.assign(fresh(), s); } catch {} return fresh(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DONE_KEY, isComplete() ? '1' : ''); } catch {} }
const L = (id) => (S.lessons[id] ||= { status: 'new', step: 'goals', card: 0, qi: 0, timeMs: 0, first: {}, retries: 0, actTries: 0 });
const lessonsDone = () => D.lessons.filter((x) => S.lessons[x.id]?.status === 'done').length;
const isComplete = () => D && lessonsDone() === D.lessons.length && !!S.post;
const nextLesson = () => D.lessons.find((x) => S.lessons[x.id]?.status !== 'done');

// 레슨 시간 재기: 화면을 보고 있는 동안만 더한다
function timeStart(id) { timeStop(); live = { id, t0: Date.now() }; }
function timeStop() { if (live) { L(live.id).timeMs += Date.now() - live.t0; live = null; save(); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { const id = live?.id; timeStop(); if (id) live = { id, t0: null }; } else if (live && live.t0 == null) live.t0 = Date.now(); });
window.addEventListener('pagehide', timeStop);

/* ---------------- 화면 틀 ---------------- */
const app = () => $('#app');
function shell() {
  app().innerHTML = '';
  app().append(h('header', { class: 'top' }, h('div', { class: 'brand' }, h('b', {}, '첫 삽'), h('span', {}, '건설현장 기초')), h('div', { class: 'prog-mini', id: 'progMini' })),
    h('main', { id: 'view' }),
    h('nav', { class: 'tabs', id: 'tabs' }, ...[
      ['home', '📘', '기초 교육'], ['review', '🔁', '다시 보기'], ['record', '📊', '내 기록'], ['practice', '🏗️', '현장 연습'],
    ].map(([id, ic, t]) => h('button', { 'data-tab': id, onclick: () => go(id) }, h('i', {}, ic), h('span', {}, t), id === 'practice' && !isComplete() ? h('em', { class: 'lock' }, '🔒') : null))));
}
function go(t) {
  timeStop();
  tab = t; if (history.state?.deep) history.back();
  shell(); document.body.classList.remove('deep');
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $('#progMini').textContent = `${lessonsDone()} / ${D.lessons.length}`;
  ({ home, review, record, practice })[t]($('#view'));
  window.scrollTo(0, 0);
}
// 레슨·점검처럼 화면 전체를 쓰는 단계 (휴대전화 뒤로 가기 → 목록)
function deep(title, onBack) {
  if (!history.state?.deep) history.pushState({ deep: true }, '');
  document.body.classList.add('deep');
  app().innerHTML = '';
  const back = h('button', { class: 'back', 'aria-label': '목록으로', onclick: () => { onBack?.(); go(tab); } }, '←');
  const view = h('main', { id: 'view', class: 'deepview' });
  app().append(h('header', { class: 'top deep' }, back, h('div', { class: 'ttl' }, title), h('div', { class: 'dots', id: 'dots' })), view);
  window.scrollTo(0, 0);
  return view;
}
window.addEventListener('popstate', () => { if (document.body.classList.contains('deep')) { timeStop(); go(tab); } });
const dots = (n, i) => { const d = $('#dots'); if (!d) return; d.innerHTML = ''; for (let k = 0; k < n; k++) d.append(h('i', { class: k < i ? 'done' : k === i ? 'on' : '' })); };

/* ---------------- 첫 화면: 기초 교육 ---------------- */
function home(v) {
  const done = lessonsDone(), n = D.lessons.length, nx = nextLesson();
  v.append(h('section', { class: 'hero' },
    h('h1', {}, '건설현장이 처음이신가요?'),
    h('p', {}, '30분이면 기초를 익힐 수 있어요'),
    h('div', { class: 'bar' }, h('i', { style: `width:${(done / n) * 100}%` })),
    h('div', { class: 'small' }, `${done} / ${n} 레슨 완료 · 레슨 하나 3~5분`)));
  if (!S.pre) v.append(h('button', { class: 'btn primary big', id: 'startBtn', onclick: () => runTest('pre') }, '시작하기'), h('p', { class: 'hint' }, '먼저 6문제로 지금 아는 것을 확인해요. 틀려도 괜찮아요.'));
  else if (nx) v.append(h('button', { class: 'btn primary big', id: 'contBtn', onclick: () => openLesson(nx.id) }, S.lessons[nx.id]?.status === 'doing' ? `이어서 하기 · ${nx.no}. ${nx.title}` : `${nx.no}. ${nx.title} 시작`));
  else if (!S.post) v.append(h('button', { class: 'btn primary big', id: 'postBtn', onclick: () => runTest('post') }, '마지막 점검 6문제 풀기'), h('p', { class: 'hint' }, '처음 점검과 비교해서 얼마나 늘었는지 보여 드려요.'));
  else v.append(h('button', { class: 'btn primary big', id: 'certBtn', onclick: showCert }, '기초 확인서 보기'));

  v.append(h('h2', { class: 'sec' }, '기초 레슨'));
  D.lessons.forEach((x) => {
    const st = S.lessons[x.id]?.status || 'new';
    const locked = !S.pre;
    v.append(h('button', { class: `lesson-row ${st}`, disabled: locked, onclick: () => openLesson(x.id) },
      h('span', { class: 'no' }, st === 'done' ? '✓' : x.no),
      h('span', { class: 'lt' }, h('b', {}, x.title), h('small', {}, `${x.kind} · ${x.domains.map((d) => D.domains[d].label.slice(0, 1)).join(' ')} · 3~5분`)),
      h('span', { class: 'st' }, st === 'done' ? '완료' : st === 'doing' ? '이어서' : '')));
  });
  v.append(h('p', { class: 'note' }, '이 앱은 법정 교육(건설업 기초안전보건교육 4시간)을 대신하지 않아요. 들은 내용을 짧게 다시 확인하고, 현장에 들어가기 전에 현장을 미리 알아 두는 도구예요.'));
}

/* ---------------- 사전·사후 점검 ---------------- */
function runTest(kind) {
  const items = D[kind];
  const ans = [];
  const v = deep(kind === 'pre' ? '처음 점검' : '마지막 점검');
  const order = items.map((q) => shuffle(q.options.map((_, k) => k)));
  const show = (i) => {
    dots(items.length, i);
    v.innerHTML = '';
    if (i >= items.length) return finish();
    const q = items[i];
    v.append(h('div', { class: 'qhead' }, `${i + 1} / ${items.length}`), q.art ? pic(q.art) : null, h('h2', { class: 'q' }, q.q),
      optionList(q, order[i], (k) => { ans[i] = k; show(i + 1); }));
  };
  const finish = () => {
    const correct = ans.map((a, i) => a === items[i].answer);
    const rec = { answers: ans, correct, score: correct.filter(Boolean).length, at: Date.now(), hour: new Date().getHours() };
    S[kind] = rec; save();
    v.innerHTML = '';
    if (kind === 'pre') {
      v.append(h('div', { class: 'result' }, h('div', { class: 'big' }, `6문제 중 ${rec.score}개`), h('p', {}, '지금 아는 만큼이에요. 레슨을 마치고 다시 풀어 볼게요.')),
        h('button', { class: 'btn primary big', onclick: () => openLesson(D.lessons[0].id) }, '레슨 1 시작'));
    } else {
      const pre = S.pre?.score ?? 0;
      v.append(h('div', { class: 'result' }, h('div', { class: 'cmp' }, h('div', {}, h('small', {}, '처음'), h('b', {}, `${pre}`)), h('span', {}, '→'), h('div', { class: 'up' }, h('small', {}, '마지막'), h('b', {}, `${rec.score}`))),
        h('p', {}, rec.score > pre ? `${rec.score - pre}문제 더 맞혔어요!` : '레슨에서 틀린 문제는 "다시 보기"에서 복습할 수 있어요.')),
      h('button', { class: 'btn primary big', onclick: showCert }, '기초 확인서 받기'));
    }
  };
  show(0);
}
function optionList(q, order, onPick) {
  if (q.optionArts) return h('div', { class: 'opts pics' }, order.map((k) => h('button', { class: 'opt pic-opt', onclick: (e) => onPick(k, e.currentTarget) }, pic(q.optionArts[k], 'pic sm'), h('span', {}, q.options[k]))));
  return h('div', { class: 'opts' }, order.map((k) => h('button', { class: 'opt', onclick: (e) => onPick(k, e.currentTarget) }, q.options[k])));
}

/* ---------------- 레슨 ---------------- */
const STEPS = ['goals', 'cards', 'activity', 'quiz', 'summary'];
function openLesson(id) {
  const x = D.lessons.find((l) => l.id === id), st = L(id);
  if (st.status === 'new') { st.status = 'doing'; st.step = 'goals'; st.card = 0; st.qi = 0; st.startAt = Date.now(); }
  if (st.status === 'done') { st.step = 'goals'; st.card = 0; st.qi = 0; st.review = true; }
  save();
  const v = deep(`${x.no}. ${x.title}`);
  timeStart(id);
  const step = (name) => { st.step = name; save(); dots(STEPS.length, STEPS.indexOf(name)); v.innerHTML = ''; window.scrollTo(0, 0); ({ goals, cards, activity, quiz, summary })[name](); };

  function goals() {
    v.append(h('div', { class: 'kind' }, x.kind), h('h2', { class: 'lead' }, '이 레슨에서 알게 될 것'),
      h('ul', { class: 'goals' }, x.goals.map((g) => h('li', {}, g))),
      h('button', { class: 'btn primary big', onclick: () => step('cards') }, '시작'));
  }
  function cardView(i, { onNext, onPrev, nextLabel }) {
    const c = x.cards[i];
    const img = Array.isArray(c.art) ? h('div', { class: `grid g${c.art.length}` }, c.art.map((a) => h('figure', {}, pic(a.art, 'pic sm'), h('figcaption', {}, a.label)))) : pic(c.art);
    return h('div', { class: 'card', 'data-chars': chars(c) }, img, h('p', { class: 'ct' }, c.text), c.more ? h('p', { class: 'cm' }, c.more) : null,
      h('div', { class: 'nav2' }, onPrev ? h('button', { class: 'btn', onclick: onPrev }, '이전') : h('span'), h('span', { class: 'cnt' }, `${i + 1} / ${x.cards.length}`), h('button', { class: 'btn primary', onclick: onNext }, nextLabel || '다음')));
  }
  function cards() {
    const i = Math.min(st.card, x.cards.length - 1);
    v.append(cardView(i, {
      onPrev: i > 0 ? () => { st.card = i - 1; step('cards'); } : null,
      onNext: () => { if (i + 1 < x.cards.length) { st.card = i + 1; step('cards'); } else { st.card = 0; step('activity'); } },
      nextLabel: i + 1 < x.cards.length ? '다음' : '한 번 해보기',
    }));
  }
  function activity() {
    const a = x.activity;
    const fin = () => { v.append(h('div', { class: 'fb good' }, a.done), h('button', { class: 'btn primary big', onclick: () => { st.qi = 0; step('quiz'); } }, '확인 문제 풀기')); };
    const fail = () => { st.actTries++; save(); };
    v.append(h('div', { class: 'kind' }, '한 번 해보기 · 30초'), h('h2', { class: 'lead' }, a.prompt));
    if (a.type === 'order') {
      const slots = h('ol', { class: 'slots' }, a.items.map(() => h('li', {}, '')));
      let k = 0; const msg = h('div', { class: 'fb' });
      const btns = shuffle(a.items).map((t) => h('button', { class: 'chip', onclick: (e) => {
        if (t !== a.items[k]) { fail(); msg.className = 'fb bad'; msg.textContent = '순서를 다시 생각해 봐요.'; e.currentTarget.classList.add('shake'); setTimeout(() => e.target.classList?.remove('shake'), 400); return; }
        slots.children[k].textContent = t; slots.children[k].classList.add('fill'); e.currentTarget.disabled = true; k++; msg.textContent = '';
        if (k === a.items.length) { chipsBox.remove(); msg.remove(); fin(); }
      } }, t));
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
        box.append(h('div', { class: 'qhead' }, `${r + 1} / ${rounds.length}`), pic(R.art), R.t ? h('p', { class: 'ct' }, R.t) : null,
          h('div', { class: 'opts' }, (a.type === 'match' ? shuffle(options.map((_, k) => k)) : options.map((_, k) => k)).map((k) => h('button', { class: 'opt', onclick: (e) => {
            if (k !== R.answer) { fail(); e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true; msg.className = 'fb bad'; msg.textContent = '다시 골라 보세요.'; return; }
            e.currentTarget.classList.add('right'); r++; setTimeout(round, 450);
          } }, options[k]))), msg);
      };
      round();
    } else if (a.type === 'dress') {
      const pick = { helmet: null, harness: null, shoes: null };
      const fig = h('div', { class: 'pic dress', html: dressFigure() });
      const draw = () => { fig.innerHTML = dressFigure({ helmet: pick.helmet, harness: pick.harness === 'yes', shoes: pick.shoes }); };
      const msg = h('div', { class: 'fb' });
      const rows = Object.entries(a.slots).map(([slot, S0]) => h('div', { class: 'slot' }, h('b', {}, S0.label), h('div', { class: 'chips' }, S0.options.map((o) => h('button', { class: 'chip', 'data-slot': slot, 'data-id': o.id, onclick: (e) => {
        pick[slot] = o.id; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === e.currentTarget)); draw();
      } }, o.t)))));
      const check = h('button', { class: 'btn primary big', onclick: () => {
        const wrong = Object.entries(a.slots).filter(([slot, S0]) => pick[slot] !== S0.answer).map(([, S0]) => S0.label);
        if (wrong.length) { fail(); msg.className = 'fb bad'; msg.textContent = `${wrong.join('·')}을(를) 다시 골라 보세요.`; return; }
        msg.className = 'fb good'; msg.textContent = '좋아요! 이제 고리를 걸어요.'; check.remove(); rows.forEach((r) => r.querySelectorAll('button').forEach((b) => (b.disabled = true)));
        const H = a.hook, hm = h('div', { class: 'fb' });
        v.append(h('h2', { class: 'q' }, H.q), h('div', { class: 'opts' }, shuffle(H.options.map((_, k) => k)).map((k) => h('button', { class: 'opt', onclick: (e) => {
          if (k !== H.answer) { fail(); e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true; hm.className = 'fb bad'; hm.textContent = '발판 끝이나 허리띠는 몸을 받쳐 주지 못해요.'; return; }
          e.currentTarget.classList.add('right'); e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true)); hm.remove(); fin();
        } }, H.options[k]))), hm);
      } }, '다 입었어요');
      v.append(fig, ...rows, check, msg);
    }
  }
  function quiz() {
    const i = st.qi;
    if (i >= x.quiz.length) return step('summary');
    const q = x.quiz[i], order = shuffle(q.options.map((_, k) => k));
    const msg = h('div', { class: 'fb' });
    v.append(h('div', { class: 'qhead' }, `확인 문제 ${i + 1} / ${x.quiz.length}`), q.art ? pic(q.art) : null, h('h2', { class: 'q' }, q.q),
      optionList(q, order, (k, btn) => {
        const firstTry = st.first[i] === undefined;
        if (k === q.answer) {
          if (firstTry) st.first[i] = true;
          S.wrong = S.wrong.filter((w) => !(w.lesson === x.id && w.qi === i && w.kind === 'quiz'));
          btn.classList.add('right'); btn.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true));
          msg.className = 'fb good'; msg.innerHTML = ''; msg.append(h('b', {}, '맞아요! '), q.why);
          v.append(h('button', { class: 'btn primary big', onclick: () => { st.qi = i + 1; step('quiz'); } }, i + 1 < x.quiz.length ? '다음 문제' : '정리하기'));
          save(); return;
        }
        // 틀리면: 이유 한 줄 → 해당 카드로 돌아가서 다시 보고 → 같은 문제 다시
        if (firstTry) st.first[i] = false;
        st.retries++;
        if (!S.wrong.some((w) => w.lesson === x.id && w.qi === i && w.kind === 'quiz')) S.wrong.push({ kind: 'quiz', lesson: x.id, qi: i, at: Date.now() });
        save();
        btn.classList.add('wrong'); btn.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true));
        msg.className = 'fb bad'; msg.innerHTML = ''; msg.append(h('b', {}, '다시 볼까요? '), q.why);
        v.append(h('button', { class: 'btn primary big', onclick: () => {
          v.innerHTML = '';
          v.append(h('div', { class: 'kind' }, '카드 다시 보기'), cardView(q.back, { onNext: () => step('quiz'), nextLabel: '문제로 돌아가기' }));
        } }, '카드 다시 보기'));
      }), msg);
  }
  function summary() {
    const firstOk = x.quiz.filter((_, i) => st.first[i]).length;
    v.append(h('div', { class: 'sum' }, h('div', { class: 'kind' }, '한 줄 정리'), h('p', { class: 'sumline' }, x.summary)),
      h('div', { class: 'small' }, `확인 문제 첫 번째 시도 ${firstOk} / ${x.quiz.length} 정답`),
      basisBox(x),
      h('button', { class: 'btn primary big', id: 'lessonDone', onclick: () => {
        st.status = 'done'; st.doneAt ||= Date.now(); st.review = false; timeStop(); save();
        const nx = nextLesson();
        if (nx) openLesson(nx.id); else if (!S.post) runTest('post'); else go('home');
      } }, (() => { const nx = D.lessons.find((l) => l.id !== x.id && S.lessons[l.id]?.status !== 'done'); return nx ? `다음: ${nx.no}. ${nx.title}` : S.post ? '목록으로' : '마지막 점검 하기'; })()));
  }
  step(STEPS.includes(st.step) ? st.step : 'goals');
}
function basisBox(x) {
  return h('details', { class: 'basis' }, h('summary', {}, '근거 보기'),
    h('ul', {}, x.basis.map((b) => h('li', {}, h('i', { class: 'lv ' + b.lv }, D.levels[b.lv]), h('span', {}, b.t)))));
}

/* ---------------- 다시 보기 ---------------- */
function review(v) {
  v.append(h('h2', { class: 'sec' }, '틀렸던 문제'));
  const wr = S.wrong.filter((w) => w.kind === 'quiz');
  if (!wr.length) v.append(h('p', { class: 'muted' }, '틀린 문제가 없어요. 레슨을 하면 여기에 모여요.'));
  wr.forEach((w) => {
    const x = D.lessons.find((l) => l.id === w.lesson), q = x?.quiz[w.qi];
    if (!q) return;
    const box = h('div', { class: 'rv' });
    const msg = h('div', { class: 'fb' });
    box.append(h('small', {}, `${x.no}. ${x.title}`), h('b', {}, q.q), optionList(q, shuffle(q.options.map((_, k) => k)), (k, btn) => {
      btn.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true));
      if (k === q.answer) { btn.classList.add('right'); msg.className = 'fb good'; msg.textContent = '맞아요! ' + q.why; S.wrong = S.wrong.filter((y) => y !== w); save(); }
      else { btn.classList.add('wrong'); msg.className = 'fb bad'; msg.textContent = q.why; }
    }), msg);
    v.append(box);
  });
  v.append(h('h2', { class: 'sec' }, '레슨별 한 장 요약'));
  D.lessons.forEach((x) => v.append(h('div', { class: 'sumcard' }, pic(Array.isArray(x.cards[0].art) ? x.cards[0].art[0].art : x.cards[0].art, 'pic xs'),
    h('div', {}, h('b', {}, `${x.no}. ${x.title}`), h('p', {}, x.summary), h('ul', {}, x.goals.map((g) => h('li', {}, g)))))));
}

/* ---------------- 내 기록 ---------------- */
function record(v) {
  v.append(h('h2', { class: 'sec' }, '점검 점수'),
    h('div', { class: 'cmp card-lite' }, h('div', {}, h('small', {}, '처음'), h('b', {}, S.pre ? `${S.pre.score}/6` : '-')), h('span', {}, '→'), h('div', { class: 'up' }, h('small', {}, '마지막'), h('b', {}, S.post ? `${S.post.score}/6` : '-'))));
  v.append(h('h2', { class: 'sec' }, '레슨별 기록'));
  const tb = h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, '레슨'), h('th', {}, '상태'), h('th', {}, '시간'), h('th', {}, '첫 시도 정답')));
  let total = 0;
  D.lessons.forEach((x) => {
    const st = S.lessons[x.id]; total += st?.timeMs || 0;
    const ok = st ? x.quiz.filter((_, i) => st.first[i]).length : 0, tried = st ? Object.keys(st.first).length : 0;
    tb.append(h('tr', {}, h('td', {}, `${x.no}. ${x.title}`), h('td', {}, st?.status === 'done' ? '완료' : st?.status === 'doing' ? '하는 중' : '-'), h('td', {}, st ? mmss(st.timeMs) : '-'), h('td', {}, tried ? `${ok}/${x.quiz.length}` : '-')));
  });
  v.append(tb, h('p', { class: 'small' }, `레슨에 쓴 시간 합계 ${mmss(total)}`));
  v.append(h('h2', { class: 'sec' }, '연구용 결과 내보내기'),
    h('p', { class: 'small' }, '이름·연락처·기기 정보는 담기지 않아요. 점수, 레슨별 시간, 정답 여부, 사용 시간대(시)만 담겨요.'),
    h('button', { class: 'btn', id: 'exportBtn', onclick: exportData }, '결과 파일 저장 (JSON)'));
  v.append(h('h2', { class: 'sec' }, '처음부터 다시'), h('button', { class: 'btn danger', onclick: () => { if (confirm('기초 교육 기록을 모두 지울까요? (현장 연습 게임 기록은 남아요)')) { localStorage.removeItem(KEY); localStorage.removeItem(DONE_KEY); S = fresh(); noteHour(); save(); go('home'); } } }, '기록 지우기'));
}
// 개인정보 없는 결과: 무작위 번호, 점수, 시간, 시간대만
export function exportPayload() {
  return {
    app: '첫 삽 기초 교육', version: D.version, anonId: S.anon, exportedDay: new Date().toISOString().slice(0, 10),
    pre: S.pre && { score: S.pre.score, correct: S.pre.correct, hour: S.pre.hour },
    post: S.post && { score: S.post.score, correct: S.post.correct, hour: S.post.hour },
    lessons: Object.fromEntries(D.lessons.map((x) => { const st = S.lessons[x.id]; return [x.id, st ? { done: st.status === 'done', timeSec: Math.round(st.timeMs / 1000), quizFirstTry: x.quiz.map((_, i) => st.first[i] ?? null), retries: st.retries, activityRetries: st.actTries } : null]; })),
    wrongNow: S.wrong.length,
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
    const left = D.lessons.length - lessonsDone();
    v.append(h('div', { class: 'lockbox' }, h('div', { class: 'icon' }, '🔒'), h('h2', {}, '현장 연습은 기초를 마치면 열려요'),
      h('p', {}, left ? `레슨 ${left}개가 남았어요.` : '마지막 점검 6문제만 남았어요.'),
      h('p', { class: 'small' }, '현장 연습은 3D 현장에서 매일 작업하며 배운 것을 반복하는 게임이에요.'),
      h('button', { class: 'btn primary big', onclick: () => go('home') }, '기초 교육으로')));
    return;
  }
  v.append(h('div', { class: 'lockbox open' }, h('div', { class: 'icon' }, '🏗️'), h('h2', {}, '현장 연습이 열렸어요'),
    h('p', {}, '3D 현장에서 작업하며 위험을 찾고, 멈추고, 알리는 연습을 해요.'),
    h('a', { class: 'btn primary big', id: 'gameLink', href: './game.html' }, '현장 연습 시작'),
    h('button', { class: 'btn', onclick: showCert }, '기초 확인서 보기')));
}

/* ---------------- 기초 확인서 ---------------- */
function showCert() {
  if (!S.certAt) { S.certAt = Date.now(); save(); }
  const v = deep('기초 확인서');
  const d = new Date(S.certAt);
  const name = h('input', { class: 'name', placeholder: '이름 (선택, 이 기기에만 저장)', maxlength: '12', value: S.name || '' });
  name.addEventListener('input', () => { S.name = name.value.trim(); save(); });
  v.append(h('div', { class: 'cert' },
    h('div', { class: 'cert-h' }, '첫 삽 · 건설현장 기초'), h('h1', {}, '기초 확인서'),
    name,
    h('p', {}, '위 사람은 첫 삽 기초 교육 레슨 6개와 이해도 점검을 마쳤습니다.'),
    h('ul', {}, D.lessons.map((x) => h('li', {}, `✓ ${x.no}. ${x.title}`))),
    h('div', { class: 'cmp' }, h('div', {}, h('small', {}, '처음 점검'), h('b', {}, `${S.pre?.score ?? '-'}/6`)), h('span', {}, '→'), h('div', { class: 'up' }, h('small', {}, '마지막 점검'), h('b', {}, `${S.post?.score ?? '-'}/6`))),
    h('div', { class: 'date' }, `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`),
    h('p', { class: 'warnline' }, '이 확인서는 법정 교육 이수증이 아닙니다.'),
    h('p', { class: 'small' }, '건설업 기초안전보건교육(4시간)은 고용노동부에 등록된 교육기관에서 받아야 해요.')),
    h('a', { class: 'btn primary big', href: './game.html', id: 'certGame' }, '현장 연습(게임) 열기'));
}

/* ---------------- 시작 ---------------- */
function noteHour() { const hr = new Date().getHours(); S.hours[hr] = (S.hours[hr] || 0) + 1; }
async function boot() {
  S = load();
  try { D = await (await fetch('./data/lessons.json')).json(); }
  catch (e) { app().innerHTML = '<p style="padding:24px">레슨 파일을 불러오지 못했어요. 인터넷에 한 번 연결한 뒤 다시 열어 주세요.</p>'; return; }
  noteHour(); save();
  const t = location.hash.replace('#', '');
  go(['home', 'review', 'record', 'practice'].includes(t) ? t : t === 'locked' ? 'practice' : 'home');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
// 자동 점검용 (tools/smoke-learn.mjs)
window.__learn = { get S() { return S; }, get D() { return D; }, exportPayload, chars };
boot();
