// 첫 삽 — 메인 게임 로직
import * as S from './scene.js';
import { t as $t, U, num } from './lang.js';
import { buildModel } from './models.js';
import {
  COMPANY, ACTIONS_PER_DAY, COUNTRIES, BUILDINGS, PHASES, TOOLS, EQUIP, LATE_ITEMS, hireCost, MAX_WORKERS,
  WORKER_NAMES, LINES, BRIEF_TALK, TEST, NOTES, CONFLICTS, TALKS, QUESTS, QUICK_CHAT, CITIES, QUIZ_LEVELS, notesFor,
} from './data.js';
import { MG, mgDefaults, needsHoist, hoistPrice, floorLabel, FLOORS } from './data2.js';
import { loadSave, save as persist, saveNow, wipe } from './store.js';
import { fetchForecast, getWeather, describe, effect, isLive, addDays, fmtDate, ymd } from './weather.js';
import * as A from './audio.js';
import { $, h, openModal, anyModal, closeAllModals, toast, shuffle, won, sleep } from './ui.js';
import { runRemicon, runRemiconLite, runQuiz, runConflict, runTalk, quizLevelFor } from './minigames.js';
import { runCyl, runRebar, runCpm, runWindow, runHide, runLunch, runFieldQuiz } from './games2.js';
import { runPatrol, runGlass } from './walkgames.js';
import { currentFloor, floorText, maybeEvent, tickEvents, goToFloor, addEvent, SHORT } from './hoist.js';
import { shouldNight, nightCard, applyNightConsequences, nightReportLine } from './night.js';
import { walkActive } from './walk.js';
import { runSafetyCourse } from './safety.js';
import { LANGS, MULTI_LANG } from './i18n.js';
import { setLang, savedLang, setShowKo, onLangChange, LANG_IDS, LANG_NAMES, DEV, checkHangul, missingKeys } from './lang.js';
import { startNet, onlineFriends, sendTo, netMode, publishNow } from './net.js';

/* ---------------- 상태 ---------------- */
const rid = () => Math.random().toString(36).slice(2, 10);
const freshStats = () => ({ actions: 0, quizCorrect: 0, hires: 0, remiconCorrect: 0, remiconReject: 0, stopDayEarn: 0, conflicts: 0, onTime: 0, talks: 0, helps: 0, levelGood: 0, craneGood: 0,
  hoists: 0, eventsSolved: 0, nights: 0, cleanBuilds: 0, cylOk: 0, rebarOk: 0, cpmOk: 0, patrolFound: 0, windowOk: 0, glassOk: 0, hideOk: 0, lunchOk: 0, hoistWarn: 0 });
const defaultState = () => ({
  v: 2, id: rid(), nick: '', track: null, lang: 'ko', music: true, sfx: true, city: 'gwangju',
  startDate: ymd(new Date()), day: 1, money: 30, actionsLeft: ACTIONS_PER_DAY, gifts: 3,
  mg: mgDefaults('field'), helpsLeft: 10,
  bIdx: 0, progress: 0, started: false, startDay: 0, ext: 0, lastPhase: 0,
  workers: 0, tools: [], equip: [], late: [], morale: 60, conflict: null,
  stats: freshStats(), quests: [], notes: {}, test: { pre: null, post: null },
  safety: { done: false, record: null }, todo: { done: {}, hadConflict: false, conflictDone: false },
  completed: [], finished: false, preAsked: false,
  // 2차: 호이스트 · 층별 이벤트 · 야간 당직
  hoist: null, events: [], evToday: 0, evCap: 1, slowActs: 0, nearMiss: [], bNearMiss: 0, night: null, nightDay: 0, evShield: 0, morning: [],
});
// 이전 저장 기록(v1)도 그대로 이어서 할 수 있게 변환
function migrate(saved) {
  const out = Object.assign(defaultState(), saved, { stats: Object.assign(freshStats(), saved.stats || {}) });
  out.v = 2;
  // v10: 학생 트랙 삭제 — 예전 저장의 track이 무엇이든 신규 근로자(field) 트랙으로 이어서 한다
  if (out.track) out.track = 'field';
  if (!MULTI_LANG) out.lang = 'ko';
  const def = mgDefaults('field'), mg = {};
  for (const k in def) mg[k] = typeof saved.mg?.[k] === 'number' ? Math.max(0, Math.min(saved.mg[k], def[k])) : def[k];
  out.mg = mg;
  const t = saved.todo || {};
  out.todo = { done: t.done || { remicon: !!t.remicon, quiz: !!t.quiz }, hadConflict: !!t.hadConflict, conflictDone: !!t.conflictDone };
  const okQ = (id) => { const q = QUESTS.find((x) => x.id === id); return q && (!q.tr || q.tr === out.track); };
  out.quests = (out.quests || []).filter((q) => okQ(q.id));
  out.doneQuests = (out.doneQuests || []).filter((id) => QUESTS.some((x) => x.id === id));
  ['events', 'nearMiss', 'morning'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
  if (typeof out.hoist !== 'number') out.hoist = null;
  return out;
}
let st = defaultState();
let demo = false, demoSnap = null, viewing = null;
const save = () => { if (!demo) persist(st); };

/* ---------------- 계산 ---------------- */
const curDef = () => BUILDINGS[Math.min(st.bIdx, BUILDINGS.length - 1)];
const countryIdxOf = (def) => COUNTRIES.findIndex((c) => c.id === def.c);
const dateOf = (day) => addDays(st.startDate, day - 1);
const todayWx = () => getWeather(dateOf(st.day));
const todayEf = () => effect(todayWx());
const stageMult = () => 1 + st.bIdx * 0.3;
const has = (list, id) => st[list].includes(id);
const hasHoist = () => st.hoist === st.bIdx && st.started;
const deadlineDay = () => st.startDay + curDef().days - 1 + st.ext;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function rates() {
  const w = todayWx(), ef = effect(w);
  let my = 5;
  TOOLS.forEach((t) => { if (has('tools', t.id)) my *= t.mult; });
  if (has('late', 'laser')) my *= 1.5;
  let eq = 1;
  EQUIP.forEach((e) => { if (has('equip', e.id) && !(e.id === 'crane' && ef.craneStop)) eq = Math.max(eq, e.mult); });
  if (has('late', 'pump')) eq *= 1.3;
  const m = st.morale;
  const moraleMult = m >= 50 ? 1 + 0.15 * (m - 50) / 50 : 1 - 0.15 * (50 - m) / 50;
  const crew = st.workers * 3 * eq * moraleMult * (st.conflict != null ? 0.7 : 1);
  const robot = has('late', 'robot') ? 40 : 0;
  const slow = st.slowActs > 0 ? 0.5 : 1;
  return { my, crew, robot, eq, moraleMult, ef, w, slow, total: Math.round((my + crew + robot) * ef.mult * slow) };
}
function planned(atStartOfDay = false) {
  if (!st.started) return 0;
  const D = curDef().days + st.ext;
  const used = atStartOfDay ? 0 : (ACTIONS_PER_DAY - st.actionsLeft) / ACTIONS_PER_DAY;
  return clamp01((st.day - st.startDay + used) / D);
}
const actual = () => clamp01(st.progress / curDef().work);
function shownBlocks() { const m = buildModel(curDef().id); return Math.floor(actual() * m.blocks.length); }
function curPhase() {
  const m = buildModel(curDef().id), n = shownBlocks();
  if (n <= 0) return 0;
  return m.blocks[Math.min(n, m.blocks.length - 1)][4];
}
function nextCost() {
  if (todayEf().stop || st.actionsLeft <= 0) return 0;
  if (st.finished) return 0;
  if (!st.started) return 5 + st.bIdx * 4;
  return Math.max(5, Math.ceil(st.actionsLeft / ACTIONS_PER_DAY * Math.max(1, st.workers) * 10));
}
function statusText(startOfDay = false) {
  if (st.finished) return { t: $t('main.statusText.5'), c: 'ok' };
  if (!st.started) return { t: $t('main.statusText.4'), c: 'info' };
  const dl = deadlineDay();
  if (st.day > dl) return { t: $t('main.statusText.3', { v1: st.day - dl }), c: 'late' };
  const gap = planned(startOfDay) - actual();
  if (gap >= 0.08) return { t: $t('main.statusText.2', { v1: Math.round(gap * 100) }), c: 'late' };
  return { t: $t('main.statusText.1'), c: 'ok' };
}
function ddayText() {
  const def = curDef();
  if (st.finished) return $t('main.ddayText.4');
  if (!st.started) return $t('main.ddayText.3', { days: def.days });
  const dl = deadlineDay(), d = dl - st.day;
  return $t('main.ddayText.2', { v1: fmtDate(dateOf(dl), false), v2: d > 0 ? 'D-' + d : d === 0 ? 'D-day' : $t('main.ddayText.1', { v1: -d }) });
}

/* ---------------- 모듈 연결용 컨텍스트 ---------------- */
const ctx = {
  get st() { return st; }, demo: () => demo, curDef: () => curDef(), actual: () => actual(), curPhase: () => curPhase(),
  wind: () => todayWx().wind, todayWx: () => todayWx(), tomorrowWx: () => getWeather(dateOf(st.day + 1)),
  hasHoist: () => hasHoist(), hasCrane: () => has('equip', 'crane'), stageMult: () => stageMult(),
  note: (id) => note(id), earn: (a, l) => earn(a, l), save: () => save(), refresh: () => refreshAll(),
};

/* ---------------- 배움 노트 ---------------- */
function note(id) {
  if (st.notes[id]) return;
  st.notes[id] = st.day;
  const n = NOTES.find((x) => x.id === id);
  A.sfx('pop');
  toast($t('main.note.1', { t: n.t }), 'note');
  save();
}

/* ---------------- UI 갱신 ---------------- */
function refreshTop() {
  $('#money').textContent = won(st.money);
  const w = todayWx(), d = describe(w), ef = effect(w);
  $('#dateTxt').textContent = $t('main.refreshTop.7', { day: st.day, v2: fmtDate(dateOf(st.day)) });
  $('#wxIcon').textContent = d.icon;
  $('#wxTemp').textContent = `${Math.round(w.tmax)}°`;
  $('#moraleTxt').textContent = $t('main.refreshTop.6', { v1: st.morale >= 70 ? '😄' : st.morale >= 40 ? '🙂' : '😣', v2: Math.round(st.morale) });
  $('#crewTxt').textContent = $t('main.refreshTop.5', { workers: st.workers });
  $('#wxNote').textContent = ef.stop ? $t('main.refreshTop.4') : ef.mult < 1 ? $t('main.refreshTop.3', { name: d.name, v2: Math.round(ef.mult * 100) }) + (ef.craneStop ? $t('main.refreshTop.2') : '') : `${d.name}${isLive() ? '' : $t('main.refreshTop.1')}`;
  $('#conflictTag').classList.toggle('hidden', st.conflict == null);
  $('#musicBtn').classList.toggle('off', !st.music);
  $('#introMusic')?.classList.toggle('off', !st.music);
}
function refreshSite() {
  const def = curDef(), c = COUNTRIES[countryIdxOf(def)];
  $('#scFlag').textContent = c.flag;
  $('#scName').textContent = st.finished ? $t('main.refreshSite.24') : def.name;
  const ph = curPhase();
  const fl = st.started && !st.finished ? currentFloor(def, actual()) : 0;
  $('#scPhase').textContent = st.finished ? $t('main.refreshSite.23') : st.started ? (floorText(def, fl, PHASES[ph]) || PHASES[ph]) : $t('main.refreshSite.22');
  // 층별 이벤트 · 층 이동 버튼
  const evBox = $('#scEvent'); evBox.innerHTML = '';
  st.events.forEach((e) => evBox.append(h('button', { class: 'evtag', onclick: () => goToFloor(ctx, e.floor) }, $t('main.refreshSite.21', { v1: floorLabel(def.id, e.floor), v2: SHORT[e.id], left: e.left }), h('b', {}, $t('main.refreshSite.20')))));
  if (st.slowActs > 0) evBox.append(h('div', { class: 'evslow' }, $t('main.refreshSite.19', { slowActs: st.slowActs })));
  evBox.classList.toggle('hidden', !evBox.childNodes.length);
  const lb = $('#liftBtn');
  lb.classList.toggle('hidden', !st.started || st.finished);
  lb.textContent = FLOORS[def.id]?.walk ? $t('main.refreshSite.18') : hasHoist() ? $t('main.refreshSite.17') : $t('main.refreshSite.16');
  const dd = $('#scDday'); dd.textContent = ddayText(); dd.classList.toggle('late', st.started && st.day > deadlineDay());
  // 공정표
  const m = buildModel(def.id), tot = m.blocks.length, a = actual();
  let cum = 0;
  const box = $('#scPhases'); box.innerHTML = '';
  PHASES.forEach((p, i) => {
    const from = cum / tot; cum += m.counts[i]; const to = cum / tot;
    const fill = clamp01((a - from) / Math.max(1e-6, to - from));
    const el = h('div', { class: fill >= 1 ? 'done' : (st.started && i === ph ? 'cur' : '') }, h('i', { style: { width: (fill * 100) + '%' } }), h('span', {}, p));
    box.append(el);
  });
  const pl = planned();
  $('#barPlan').style.width = (pl * 100) + '%'; $('#pctPlan').textContent = Math.round(pl * 100) + '%';
  $('#barAct').style.width = (a * 100) + '%'; $('#pctAct').textContent = Math.round(a * 100) + '%';
  const s = statusText();
  const warn = $('#scWarn');
  warn.classList.toggle('hidden', !(st.started && s.c === 'late'));
  warn.textContent = '⚠️ ' + (s.c === 'late' ? (st.day > deadlineDay() ? s.t : $t('main.refreshSite.15', { t: s.t })) : '');
  // 버튼
  const wb = $('#workBtn'), ef = todayEf(), r = rates();
  wb.classList.toggle('start', !st.started && !st.finished);
  if (st.finished) { wb.disabled = true; wb.querySelector('.lbl').textContent = $t('main.refreshSite.14'); $('#workSub').textContent = $t('main.refreshSite.13'); }
  else if (!st.started) { wb.disabled = false; wb.querySelector('.lbl').textContent = $t('main.refreshSite.12'); $('#workSub').textContent = $t('main.refreshSite.11', { days: def.days }); }
  else if (ef.stop) { wb.disabled = true; wb.querySelector('.lbl').textContent = $t('main.refreshSite.10'); $('#workSub').textContent = $t('main.refreshSite.9'); }
  else if (st.actionsLeft <= 0) { wb.disabled = true; wb.querySelector('.lbl').textContent = $t('main.refreshSite.8'); $('#workSub').textContent = $t('main.refreshSite.7'); }
  else { wb.disabled = false; wb.querySelector('.lbl').textContent = $t('main.refreshSite.6'); $('#workSub').textContent = $t('main.refreshSite.5', { actionsLeft: st.actionsLeft, ACTIONS_PER_DAY, total: r.total }); }
  const cost = nextCost(), nb = $('#nextBtn');
  nb.classList.toggle('pay', cost > 0);
  nb.querySelector('.lbl').textContent = cost > 0 ? (st.started ? $t('main.refreshSite.4') : $t('main.refreshSite.3')) : $t('main.refreshSite.2');
  $('#nextSub').textContent = cost > 0 ? won(cost) : $t('main.refreshSite.1');
  // 알림 점
  const sideAvail = Object.values(st.mg).some((v) => v > 0) || st.conflict != null;
  $('#dotSide').classList.toggle('hidden', !sideAvail);
  $('#dotQuest').classList.toggle('hidden', !st.quests.some((q) => questProgress(q) >= questDef(q).n));
}
function refreshAll() { refreshTop(); refreshSite(); if (!$('#sheet').classList.contains('hidden')) renderTab(curTab); }

/* ---------------- 3D 동기화 ---------------- */
function syncScene() {
  viewing = null; $('#viewBar')?.remove();
  const def = curDef(), ci = countryIdxOf(def);
  const list = BUILDINGS.map((b, i) => ({ b, i })).filter((x) => x.b.c === def.c);
  const states = list.map(({ b, i }) => {
    const n = buildModel(b.id).blocks.length;
    if (i < st.bIdx || st.finished) return { shown: n };
    if (i === st.bIdx) return { shown: shownBlocks() };
    return { shown: 0 };
  });
  const focus = Math.max(0, list.findIndex((x) => x.i === st.bIdx));
  S.setCountry(ci, states, st.finished ? list.length - 1 : focus);
  S.setWorkers(st.workers);
  S.ensureMe();
  S.setCrane(has('equip', 'crane'), todayEf().craneStop);
  S.setHoist(hasHoist());
  S.setWeather(describe(todayWx()).kind);
  S.setFriends(onlineFriends().slice(0, 6).map((f) => ({ id: f.id, nick: f.nick })));
}
function updateCurrentBlocks(animate = true) {
  const def = curDef();
  const list = BUILDINGS.filter((b) => b.c === def.c);
  S.setShown(list.indexOf(def), shownBlocks(), animate);
}

/* ---------------- 착공 · 작업 · 날 넘기기 ---------------- */
function startConstruction() {
  const def = curDef();
  st.started = true; st.startDay = st.day; st.ext = 0; st.lastPhase = 0;
  if (todayEf().stop) { st.ext = 1; note('weather'); }
  A.sfx('build');
  toast($t('main.startConstruction.3', { name: def.name, v2: fmtDate(dateOf(deadlineDay())), days: def.days }));
  S.say($t('main.startConstruction.2'), 0) || S.say($t('main.startConstruction.1'), 'me');
  save(); refreshAll();
}
function floatNum(text) {
  const el = h('div', { class: 'floatnum' }, text);
  $('#actions').append(el); setTimeout(() => el.remove(), 900);
}
function doWork() {
  if (st.finished || viewing != null) return;
  if (!st.started) return startConstruction();
  const ef = todayEf();
  if (ef.stop) return toast($t('main.doWork.5'), 'bad');
  if (st.actionsLeft <= 0) return toast($t('main.doWork.4'));
  st.actionsLeft--; st.stats.actions++;
  const r = rates();
  st.progress += r.total;
  if (st.slowActs > 0) st.slowActs--;
  A.sfx('build'); S.workPulse();
  floatNum($t('main.doWork.3', { total: r.total }));
  updateCurrentBlocks(true);
  const ph = curPhase();
  if (ph > st.lastPhase) {
    st.lastPhase = ph;
    toast($t('main.doWork.2', { v1: PHASES[ph] }));
    note('sequence');
    S.say($t('main.doWork.1', { v1: PHASES[ph] }));
  }
  if (st.progress >= curDef().work) { save(); refreshAll(); return complete(); }
  tickEvents(ctx);
  maybeEvent(ctx);
  if (st.actionsLeft === 0) S.say(pick(LINES.done));
  save(); refreshAll();
}
function nextDay() {
  if (viewing != null) return;
  const cost = nextCost();
  if (cost > 0) {
    if (st.money < cost) return toast($t('main.nextDay.7', { v1: won(cost) }), 'bad');
    const m = openModal({ title: st.started ? $t('main.nextDay.6') : $t('main.nextDay.5'), body: h('div', { class: 'col' },
      h('div', { class: 'fb' }, st.started
        ? $t('main.nextDay.4', { actionsLeft: st.actionsLeft, workers: st.workers, v3: won(cost) })
        : $t('main.nextDay.3', { v1: won(cost) })),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onclick: () => m.close() }, $t('main.nextDay.2')),
        h('button', { class: 'btn primary', onclick: () => { m.close(); st.money -= cost; if (st.started) st.morale = Math.max(0, st.morale - 12); endOfDay(); } }, $t('main.nextDay.1', { v1: won(cost) })))) });
    return;
  }
  endOfDay();
}
// 하루 마감 → (당직 순번이면) 야간 당직 → 다음 날
function endOfDay() {
  if (shouldNight(ctx)) nightCard(ctx, advanceDay);
  else advanceDay();
}
function advanceDay() {
  if (!st.finished && st.started && st.actionsLeft === ACTIONS_PER_DAY && !todayEf().stop) {} // 미룬 날
  st.day++;
  st.actionsLeft = ACTIONS_PER_DAY; st.gifts = 3; st.helpsLeft = 10;
  st.mg = mgDefaults('field');
  st.evToday = 0;
  st.evCap = Math.min(3, 1 + Math.floor(Math.random() * 3) + (getWeather(dateOf(st.day)).wind >= 8 ? 1 : 0));
  st.morale = Math.max(0, st.morale - 3);
  if (st.conflict == null && st.workers >= 1 && Math.random() < 0.35) st.conflict = Math.floor(Math.random() * CONFLICTS.length);
  st.todo = { done: {}, hadConflict: st.conflict != null, conflictDone: false };
  st.morning = demo ? [] : applyNightConsequences(ctx);
  const fireAlarm = st.morning.includes('fireAlarm');
  st.morning = st.morning.filter((x) => x !== 'fireAlarm');
  const ef = todayEf();
  if (ef.stop) { if (st.started && !st.finished) st.ext++; note('weather'); }
  A.sfx('pop');
  save();
  S.setWeather(describe(todayWx()).kind);
  S.setCrane(has('equip', 'crane'), ef.craneStop);
  refreshAll();
  publishNow();
  showBriefing(() => {
    if (fireAlarm && st.started && !st.finished) { const f = Math.max(1, currentFloor(curDef(), actual())); setTimeout(() => addEvent(ctx, 'fireAlarm', f), 900); }
  });
}

/* ---------------- 준공 ---------------- */
function complete() {
  const def = curDef();
  const dl = deadlineDay();
  const late = Math.max(0, st.day - dl);
  const bonus = late === 0 ? Math.round(def.reward * 0.1) : 0;
  const penalty = late > 0 ? Math.round(def.reward * Math.min(0.5, late * 0.1)) : 0;
  const total = def.reward + bonus - penalty;
  st.money += total;
  if (late === 0) st.stats.onTime++;
  const nm = st.bNearMiss || 0;
  if (nm === 0) st.stats.cleanBuilds++;
  const usedDays = st.day - st.startDay + 1;
  st.completed.push({ id: def.id, day: st.day, late, ext: st.ext, total, nearMiss: nm });
  st.events = []; st.hoist = null; st.bNearMiss = 0; st.slowActs = 0;
  S.setHoist(false); $('#radio')?.remove();
  const prevC = def.c;
  const ext = st.ext;
  st.bIdx++; st.progress = 0; st.started = false; st.ext = 0; st.lastPhase = 0;
  if (st.bIdx >= BUILDINGS.length) { st.finished = true; st.bIdx = BUILDINGS.length - 1; st.progress = def.work; }
  note('schedule');
  save();
  A.sfx('fanfare');
  S.say($t('main.complete.19'));
  const m = openModal({ title: $t('main.complete.18'), body: h('div', { class: 'col' },
    h('div', { class: 'conf-title' }, $t('main.complete.17', { name: def.name })),
    h('div', { class: 'tiny muted' }, def.fact),
    h('div', { class: 'settle' },
      h('div', { class: 'r' }, h('span', {}, $t('main.complete.16')), h('b', {}, $t('main.complete.15', { v1: fmtDate(dateOf(st.day - usedDays + 1), false), v2: fmtDate(dateOf(st.day), false), usedDays }))),
      h('div', { class: 'r' }, h('span', {}, $t('main.complete.14')), h('b', {}, $t('main.complete.13', { days: def.days }))),
      h('div', { class: 'r' }, h('span', {}, $t('main.complete.12')), h('b', {}, $t('main.complete.11', { ext }))),
      h('div', { class: 'r' }, h('span', {}, $t('main.complete.10')), h('b', {}, won(def.reward))),
      late === 0 ? h('div', { class: 'r' }, h('span', {}, $t('main.complete.9')), h('b', { class: 'plus' }, '+' + won(bonus)))
        : h('div', { class: 'r' }, h('span', {}, $t('main.complete.8', { late })), h('b', { class: 'minus' }, '-' + won(penalty))),
      h('div', { class: 'r total' }, h('span', {}, $t('main.complete.7')), h('b', {}, won(total))),
      h('div', { class: 'r' }, h('span', {}, $t('main.complete.6')), h('b', { class: nm ? 'minus' : 'plus' }, nm ? $t('main.complete.5', { nm }) : $t('main.complete.4')))),
    h('div', { class: 'tiny muted' }, $t('main.complete.3')),
    h('button', { class: 'btn primary big', onclick: () => m.close() }, $t('main.complete.2'))) });
  m.onClose = () => {
    if (st.completed.length === 1 && st.test.pre && !st.test.post) toast($t('main.complete.1'));
    if (st.finished) return showEnding(false);
    if (curDef().c !== prevC) countryComplete(prevC, () => { syncScene(); refreshAll(); queueTalk('complete'); });
    else { syncScene(); refreshAll(); queueTalk('complete'); }
  };
  refreshAll();
}
function countryComplete(cid, then) {
  const c = COUNTRIES.find((x) => x.id === cid), next = COUNTRIES[countryIdxOf(curDef())];
  A.sfx('fanfare');
  const m = openModal({ title: $t('main.countryComplete.7'), body: h('div', { class: 'col', style: { textAlign: 'center' } },
    h('div', { style: { fontSize: '60px' } }, c.flag),
    h('div', { class: 'conf-title' }, $t('main.countryComplete.6', { name: c.name })),
    h('div', {}, $t('main.countryComplete.5', { COMPANY, name: c.name })),
    h('div', { class: 'fb' }, $t('main.countryComplete.4', { flag: next.flag, name: next.name, v3: BUILDINGS.filter((b) => b.c === next.id).map((b) => b.name).join(', ') })),
    h('button', { class: 'btn primary big', onclick: () => m.close() }, $t('main.countryComplete.1', { name: next.name }))) });
  m.onClose = then;
}

/* ---------------- 브리핑 ---------------- */
function showBriefing(then) {
  const w = todayWx(), d = describe(w), ef = effect(w), def = curDef();
  const s = statusText(true);
  const talk = shuffle(BRIEF_TALK).slice(0, 2);
  const sched = h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, $t('main.showBriefing.32')), h('th', {}, $t('main.showBriefing.31')), h('th', {}, $t('main.showBriefing.30'))));
  BUILDINGS.forEach((b, i) => {
    const c = COUNTRIES.find((x) => x.id === b.c);
    let stTxt;
    if (i < st.bIdx || st.finished) stTxt = $t('main.showBriefing.29');
    else if (i === st.bIdx) stTxt = st.started ? ddayText().replace($t('main.showBriefing.28'), '') : $t('main.showBriefing.27');
    else stTxt = '-';
    sched.append(h('tr', { class: i === st.bIdx && !st.finished ? 'cur' : '' }, h('td', {}, `${c.flag} ${b.name}`), h('td', {}, $t('main.showBriefing.26', { days: b.days })), h('td', {}, stTxt)));
  });
  const todo = [[$t('main.showBriefing.25', { v1: ACTIONS_PER_DAY - st.actionsLeft, ACTIONS_PER_DAY }), st.actionsLeft === 0]];
  MG.field.forEach((g) => todo.push([`${g.icon} ${g.name}`, !!st.todo.done?.[g.id]]));
  // 오늘 예상 이벤트 층
  let expect = null;
  if (st.started && !st.finished && !ef.stop && !FLOORS[def.id]?.walk) {
    const f1 = Math.max(1, currentFloor(def, actual()));
    const f2 = Math.max(f1, currentFloor(def, Math.min(1, (st.progress + rates().total * st.actionsLeft) / def.work)));
    const ph = curPhase();
    const lab = f1 === f2 ? floorLabel(def.id, f1) : FLOORS[def.id]?.zones ? `${floorLabel(def.id, f1)}~${floorLabel(def.id, f2)}` : $t('main.showBriefing.24', { f1, f2 });
    expect = $t('main.showBriefing.23', { v1: PHASES[ph], lab, v3: ph === 1 ? $t('main.showBriefing.21') : $t('main.showBriefing.20'), v4: effect(w).craneStop || w.wind >= 8 ? $t('main.showBriefing.22') : '' });
  }
  const nightLine = nightReportLine(st);
  if (st.todo.hadConflict || st.conflict != null) todo.push([$t('main.showBriefing.19'), st.conflict == null]);
  const pl = planned(true), a = actual();
  const m = openModal({ title: $t('main.showBriefing.18', {  }), body: h('div', { class: 'col' },
    h('div', { class: 'brief-date' }, $t('main.showBriefing.17', { day: st.day, v2: fmtDate(dateOf(st.day)) })),
    h('div', { class: 'brief-wx' }, h('div', { class: 'big' }, d.icon), h('div', {},
      h('b', {}, `${CITIES.find((c) => c.id === st.city).name} ${d.name} · ${Math.round(w.tmin)}° / ${Math.round(w.tmax)}° · 💧${num(w.rain, 1)}${U('mm')} · 🌬${num(w.wind, 1)}${U('m/s')}`),
      h('div', { class: 'tiny muted' }, isLive() && w.live ? $t('main.showBriefing.16') : $t('main.showBriefing.15')),
      h('ul', {}, ef.notes.map((n) => h('li', {}, n))))),
    ef.stop ? h('div', { class: 'status late' }, $t('main.showBriefing.14')) : null,
    h('div', { class: 'fb' },
      h('div', {}, h('b', {}, `${COUNTRIES[countryIdxOf(def)].flag} ${st.finished ? $t('main.showBriefing.13') : def.name}`), ' · ', ddayText()),
      h('div', { class: 'barrow' }, h('span', {}, $t('main.showBriefing.12')), h('div', { class: 'bar plan' }, h('i', { style: { width: pl * 100 + '%' } })), h('em', {}, Math.round(pl * 100) + '%')),
      h('div', { class: 'barrow' }, h('span', {}, $t('main.showBriefing.11')), h('div', { class: 'bar act' }, h('i', { style: { width: a * 100 + '%' } })), h('em', {}, Math.round(a * 100) + '%'))),
    h('div', { class: 'status ' + s.c }, s.t),
    expect ? h('div', { class: 'fb' }, expect) : null,
    nightLine ? h('div', { class: 'fb night' }, nightLine, ...(st.morning || []).map((t) => h('div', { class: 'tiny minus' }, '→ ' + t))) : null,
    st.events.length ? h('div', { class: 'fb bad' }, $t('main.showBriefing.10') + st.events.map((e) => $t('main.showBriefing.9', { v1: floorLabel(def.id, e.floor), v2: SHORT[e.id], left: e.left })).join(', ')) : null,
    h('div', { class: 'chat' }, talk.map(([who, t]) => h('div', { class: 'msg' }, h('b', {}, who), h('div', { class: 'say' }, t)))),
    h('div', { class: 'sec' }, $t('main.showBriefing.8')),
    h('div', { class: 'schedule' }, sched),
    h('div', { class: 'sec' }, $t('main.showBriefing.7')),
    h('ul', { class: 'todo' }, todo.map(([t, done]) => h('li', { class: done ? 'done' : '' }, h('span', {}, t), h('span', {}, done ? '✔' : '○')))),
    h('button', { class: 'btn primary big', onclick: () => m.close() }, $t('main.showBriefing.6'))) });
  m.onClose = () => {
    then?.();
    if (!st.test.pre && !st.preAsked) {
      st.preAsked = true; save();
      const q = openModal({ title: $t('main.showBriefing.5'), body: h('div', { class: 'col' },
        h('div', {}, $t('main.showBriefing.4')),
        h('div', { class: 'tiny muted' }, $t('main.showBriefing.3')),
        h('div', { class: 'grid2' }, h('button', { class: 'btn', onclick: () => q.close() }, $t('main.showBriefing.2')), h('button', { class: 'btn primary', onclick: () => { q.close(); runTest('pre'); } }, $t('main.showBriefing.1')))) });
    }
  };
}

function showForecast() {
  const body = h('div', { class: 'col' });
  const render = () => {
    body.innerHTML = '';
    body.append(h('div', { class: 'set-row' }, h('span', {}, $t('main.render.7')), h('div', { class: 'seg' }, CITIES.map((c) => h('button', { class: c.id === st.city ? 'on' : '', onclick: async () => {
      st.city = c.id; save(); body.querySelector('.seg').style.opacity = .5;
      await fetchForecast(st.city); render(); refreshAll(); S.setWeather(describe(todayWx()).kind);
    } }, c.name)))));
    body.append(h('div', { class: 'tiny ' + (isLive() ? '' : 'muted') }, isLive() ? $t('main.render.6') : $t('main.render.5')));
    for (let k = 0; k < 5; k++) {
      const day = st.day + k, w = getWeather(dateOf(day)), d = describe(w), ef = effect(w);
      body.append(h('div', { class: 'wxday' + (ef.stop ? ' stop' : '') },
        h('div', {}, h('b', {}, k === 0 ? $t('main.render.4') : $t('main.render.3', { day })), h('div', { class: 'tiny' }, fmtDate(dateOf(day)))),
        h('div', { class: 'ic' }, d.icon),
        h('div', {}, h('div', {}, `${d.name} ${Math.round(w.tmin)}°/${Math.round(w.tmax)}° · 💧${num(w.rain, 1)}${U('mm')} · 🌬${num(w.wind, 1)}${U('m/s')}${w.live ? '' : $t('main.render.2')}`),
          h('div', { class: 'tiny ' + (ef.stop ? 'minus' : 'muted') }, ef.notes.join(' / ')))));
    }
  };
  render();
  openModal({ title: $t('main.render.1'), body });
}

/* ---------------- 대화 · 갈등 ---------------- */
let talkQueued = null;
function queueTalk(ctx) {
  const pool = TALKS.filter((t) => t.ctx === ctx || (ctx === 'minigame' && t.ctx === 'any'));
  const t = pick(pool);
  setTimeout(() => {
    if (anyModal()) { talkQueued = t; return; }
    openTalk(t);
  }, 500);
}
function openTalk(t) {
  runTalk(t, (d) => { st.morale = Math.max(0, Math.min(100, st.morale + d)); st.stats.talks++; save(); refreshAll(); });
}
function afterMinigame(m) {
  if (m) m.onClose = () => { refreshAll(); if (Math.random() < 0.6) queueTalk('minigame'); };
}
// 걷기 게임처럼 결과 카드가 나중에 뜨는 경우: 결과 카드를 닫으면 대화가 이어지도록 예약
function talkLater() { if (Math.random() < 0.6) talkQueued = pick(TALKS.filter((t) => t.ctx === 'minigame' || t.ctx === 'any')); }

/* ---------------- 돈 벌기 ---------------- */
function earn(amount, label) {
  st.money += amount;
  if (todayEf().stop && amount > 0) st.stats.stopDayEarn++;
  A.sfx('coin');
  toast(`💰 ${label} +${won(amount)}`);
  save(); refreshAll();
}

/* ---------------- 탭 ---------------- */
let curTab = null;
function openTab(tab) {
  if (curTab === tab && !$('#sheet').classList.contains('hidden')) return closeSheet();
  curTab = tab;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#sheet').classList.remove('hidden');
  renderTab(tab);
  A.sfx('tap');
}
function closeSheet() { $('#sheet').classList.add('hidden'); curTab = null; document.querySelectorAll('#nav button').forEach((b) => b.classList.remove('active')); }
function renderTab(tab) {
  const body = $('#sheetBody'); body.innerHTML = '';
  const titles = { shop: $t('main.renderTab.5'), side: $t('main.renderTab.4'), quest: $t('main.renderTab.3'), together: $t('main.renderTab.2'), map: $t('main.renderTab.1') };
  $('#sheetTitle').textContent = titles[tab];
  ({ shop: tabShop, side: tabSide, quest: tabQuest, together: tabTogether, map: tabMap })[tab](body);
}

function itemRow(ic, title, sub, btnLabel, onClick, opts = {}) {
  return h('div', { class: 'item' + (opts.owned ? ' owned' : '') + (opts.locked ? ' locked' : '') },
    h('div', { class: 'ic' }, ic), h('div', { class: 'tx' }, h('b', {}, title), h('small', {}, sub), opts.extra || null),
    btnLabel ? h('button', { class: 'btn ' + (opts.primary === false ? '' : 'primary'), disabled: !!opts.disabled, onclick: onClick }, btnLabel) : null);
}

function tabShop(body) {
  const r = rates();
  body.append(h('div', { class: 'tiny muted' }, $t('main.tabShop.24', { v1: Math.round(r.my), workers: st.workers, v3: r.eq.toFixed(1), v4: r.moraleMult.toFixed(2), v5: st.conflict != null ? $t('main.tabShop.22') : '', v6: r.robot ? $t('main.tabShop.23') : '', v7: r.ef.mult.toFixed(2), total: r.total })));
  body.append(h('div', { class: 'sec' }, $t('main.tabShop.21')));
  const hc = hireCost(st.workers);
  body.append(itemRow('👷', $t('main.tabShop.20', { workers: st.workers, MAX_WORKERS }), $t('main.tabShop.19'), st.workers >= MAX_WORKERS ? $t('main.tabShop.18') : won(hc), () => {
    if (st.money < hc) return toast($t('main.tabShop.17'), 'bad');
    st.money -= hc; st.workers++; st.stats.hires++;
    S.setWorkers(st.workers); A.sfx('coin');
    setTimeout(() => S.say(LINES.hired[0], st.workers - 1), 300);
    toast($t('main.tabShop.16', { v1: WORKER_NAMES[(st.workers - 1) % WORKER_NAMES.length] }));
    save(); refreshAll();
  }, { disabled: st.workers >= MAX_WORKERS }));
  body.append(h('div', { class: 'sec' }, $t('main.tabShop.15')));
  TOOLS.forEach((t, i) => {
    const owned = has('tools', t.id), prevOk = i === 0 || has('tools', TOOLS[i - 1].id);
    body.append(itemRow(t.icon, t.name, t.desc, owned ? $t('main.tabShop.14') : won(t.price), () => buy('tools', t), { owned, disabled: owned || !prevOk, locked: !prevOk }));
  });
  body.append(h('div', { class: 'sec' }, $t('main.tabShop.13')));
  EQUIP.forEach((e) => {
    const owned = has('equip', e.id);
    body.append(itemRow(e.icon, e.name, e.desc, owned ? $t('main.tabShop.12') : won(e.price), () => buy('equip', e), { owned, disabled: owned }));
  });
  const def = curDef();
  if (needsHoist(def.id) && !st.finished) {
    body.append(h('div', { class: 'sec' }, $t('main.tabShop.11')));
    const hp = hoistPrice(st.bIdx), own = hasHoist();
    body.append(itemRow('🔼', $t('main.tabShop.10', { name: def.name }), st.started ? $t('main.tabShop.9') : $t('main.tabShop.8'), own ? $t('main.tabShop.7') : won(hp), () => {
      if (st.money < hp) return toast($t('main.tabShop.6'), 'bad');
      st.money -= hp; st.hoist = st.bIdx; st.stats.hoists++; A.sfx('build'); S.setHoist(true);
      toast($t('main.tabShop.5')); S.say($t('main.tabShop.4'));
      save(); refreshAll();
    }, { owned: own, disabled: own || !st.started, locked: !st.started }));
  }
  body.append(h('div', { class: 'sec' }, $t('main.tabShop.3')));
  LATE_ITEMS.forEach((e) => {
    const owned = has('late', e.id), locked = st.bIdx < e.minStage;
    body.append(itemRow(e.icon, e.name, locked ? $t('main.tabShop.2', { v1: BUILDINGS[e.minStage].name }) : e.desc, owned ? $t('main.tabShop.1') : won(e.price), () => buy('late', e), { owned, locked, disabled: owned || locked }));
  });
}
function buy(list, item) {
  if (st.money < item.price) return toast($t('main.buy.3'), 'bad');
  st.money -= item.price; st[list].push(item.id); A.sfx('coin');
  toast($t('main.buy.2', { icon: item.icon, name: item.name }));
  if (item.id === 'crane') { S.setCrane(true, todayEf().craneStop); S.say($t('main.buy.1'), 0); note('lifting'); }
  save(); refreshAll();
}

function gameDone(id, reward, label, extra) {
  st.todo.done = st.todo.done || {}; st.todo.done[id] = true;
  extra?.();
  earn(reward, label);
}
function startGame(g) {
  const sm = stageMult(), lang = st.lang || 'ko', lv = quizLevelFor('student', st.bIdx);
  st.mg[g.id]--; save(); closeSheet();
  const fin = (note_, extra) => (r) => { note(note_); gameDone(g.id, r.reward, g.name, () => extra?.(r)); };
  let m = null;
  switch (g.id) {
    case 'remicon': m = runRemicon({ stageMult: sm, onFinish: fin('remicon', (r) => { if (r.correct) st.stats.remiconCorrect++; if (r.rejected) st.stats.remiconReject++; }) }); break;
    case 'remiconLite': m = runRemiconLite({ stageMult: sm, lang, onFinish: fin('remicon', (r) => { if (r.correct) st.stats.remiconCorrect++; if (r.rejected) st.stats.remiconReject++; }) }); break;
    case 'cyl': m = runCyl({ stageMult: sm, onFinish: fin('strength', (r) => { if (r.correct) st.stats.cylOk++; }) }); break;
    case 'rebar': m = runRebar({ stageMult: sm, level: lv, onFinish: fin('rebar', (r) => { if (r.ok) st.stats.rebarOk++; }) }); break;
    case 'cpm': m = runCpm({ stageMult: sm, level: lv, onFinish: fin('cpm', (r) => { if (r.cpOk) st.stats.cpmOk++; }) }); break;
    case 'patrol': runPatrol({ stageMult: sm, onFinish: (r) => { fin('risk', () => { st.stats.patrolFound += r.found; })(r); talkLater(); } }); break;
    case 'quiz': m = runQuiz({ level: quizLevelFor(st.track, st.bIdx), stageMult: sm, onAnswer: (ok) => { if (ok) st.stats.quizCorrect++; }, onFinish: fin('terms') }); break;
    case 'window': m = runWindow({ stageMult: sm, lang, onFinish: fin('window', (r) => { if (r.ok) st.stats.windowOk++; }) }); break;
    case 'glass': runGlass({ stageMult: sm, lang, onFinish: (r) => { fin('carry', () => { if (r.ok) st.stats.glassOk++; })(r); talkLater(); } }); break;
    case 'hide': m = runHide({ stageMult: sm, lang, onFinish: fin('rest', (r) => { if (r.ok) st.stats.hideOk++; }) }); break;
    case 'lunch': { const w = todayWx(), mo = Number(dateOf(st.day).slice(5, 7)); m = runLunch({ stageMult: sm, lang, hot: w.tmax >= 28 || (mo >= 6 && mo <= 8), onFinish: fin('heat', (r) => { if (r.ok) st.stats.lunchOk++; }) }); break; }
    case 'fquiz': m = runFieldQuiz({ stageMult: sm, lang, onAnswer: (ok) => { if (ok) st.stats.quizCorrect++; }, onFinish: fin('terms') }); break;
  }
  afterMinigame(m);
}
function tabSide(body) {
  const ef = todayEf(), sm = stageMult();
  const games = MG.field;
  if (ef.stop) body.append(h('div', { class: 'status late' }, $t('main.tabSide.27')));
  body.append(h('div', { class: 'tiny muted' }, $t('main.tabSide.26', { v1: st.track === 'field' ? $t('main.tabSide.25') : $t('main.tabSide.24'), v2: sm.toFixed(1) })));
  body.append(h('div', { class: 'sec' }, $t('main.tabSide.23')));
  games.forEach((g) => {
    const left = st.mg[g.id] ?? 0;
    let sub = $t('main.tabSide.22', { desc: g.desc, left, per: g.per });
    if (g.id === 'quiz') sub = $t('main.tabSide.21', { v1: QUIZ_LEVELS[quizLevelFor(st.track, st.bIdx)], left, per: g.per });
    if (g.id === 'fquiz' && MULTI_LANG) sub = $t('main.tabSide.20', { desc: g.desc, v2: LANGS.find((l) => l.id === st.lang)?.name || $t('main.tabSide.19'), left, per: g.per });
    body.append(itemRow(g.icon, g.move ? [g.name, ' 🕹️'] : g.name, sub, st.todo.done?.[g.id] && left <= 0 ? $t('main.tabSide.18') : $t('main.tabSide.17'), () => startGame(g), { disabled: left <= 0 }));
  });
  body.append(h('div', { class: 'sec' }, $t('main.tabSide.16')));
  if (st.conflict != null) {
    const c = CONFLICTS[st.conflict];
    body.append(itemRow('⚠️', $t('main.tabSide.15', { title: c.title }), $t('main.tabSide.14'), $t('main.tabSide.13'), () => {
      closeSheet();
      const m = runConflict(c, (s) => {
        st.conflict = null; st.todo.conflictDone = true; st.stats.conflicts++;
        st.morale = Math.max(0, Math.min(100, st.morale + (s === 2 ? 8 : s === 1 ? 2 : -8)));
        note('conflict');
        if (s === 2) earn(Math.round(4 * sm), $t('main.tabSide.12')); else { save(); refreshAll(); }
      });
      m.onClose = () => refreshAll();
    }));
  } else body.append(h('div', { class: 'tiny muted' }, $t('main.tabSide.11')));
  if (st.events.length) st.events.forEach((e) => body.append(itemRow('🚨', `${floorLabel(curDef().id, e.floor)} ${SHORT[e.id]}`, $t('main.tabSide.10', { left: e.left }), $t('main.tabSide.9'), () => { closeSheet(); goToFloor(ctx, e.floor); })));
  body.append(itemRow('🎁', $t('main.tabSide.8'), $t('main.tabSide.7', { gifts: st.gifts }), null));
  if (st.track === 'field') {
    body.append(h('div', { class: 'sec' }, $t('main.tabSide.6')));
    body.append(itemRow('🦺', $t('main.tabSide.5'), $t(MULTI_LANG ? 'main.tabSide.4' : 'main.tabSide.4ko', { v1: LANGS.find((l) => l.id === st.lang)?.name || $t('main.tabSide.2'), v2: st.safety.record ? $t('main.tabSide.3', { score: st.safety.record.score }) : '' }), $t('main.tabSide.1'), () => { closeSheet(); openSafety(); }));
  }
}

function questDef(q) { return QUESTS.find((x) => x.id === q.id); }
function questProgress(q) {
  const d = questDef(q);
  if (d.state === 'workers') return st.workers;
  if (d.state === 'crane') return has('equip', 'crane') ? 1 : 0;
  return (st.stats[d.stat] || 0) - q.base;
}
function fillQuests() {
  while (st.quests.length < 3) {
    const active = new Set(st.quests.map((q) => q.id));
    const done = new Set(st.doneQuests || []);
    const fits = (q) => (!q.tr || q.tr === st.track) && (!q.needHoist || needsHoist(curDef().id) || st.bIdx < 2);
    let pool = QUESTS.filter((q) => fits(q) && !active.has(q.id) && !done.has(q.id));
    if (!pool.length) { st.doneQuests = []; pool = QUESTS.filter((q) => fits(q) && !active.has(q.id)); }
    const d = pick(pool);
    st.quests.push({ id: d.id, base: d.stat ? (st.stats[d.stat] || 0) : 0 });
  }
}
function tabQuest(body) {
  fillQuests();
  body.append(h('div', { class: 'sec' }, $t('main.tabQuest.27')));
  st.quests.forEach((q, i) => {
    const d = questDef(q), p = Math.min(d.n, questProgress(q)), ok = p >= d.n;
    body.append(itemRow(ok ? '✅' : '📌', d.t, $t('main.tabQuest.26', { p, n: d.n, v3: won(Math.round(d.reward * stageMult())) }), ok ? $t('main.tabQuest.25') : $t('main.tabQuest.24'), () => {
      const amt = Math.round(d.reward * stageMult());
      st.quests.splice(i, 1); st.doneQuests = [...(st.doneQuests || []), d.id];
      fillQuests(); earn(amt, $t('main.tabQuest.23', { t: d.t }));
    }, { disabled: !ok, extra: h('div', { class: 'pbar' }, h('i', { style: { width: (p / d.n * 100) + '%' } })) }));
  });
  // 이해도 테스트
  body.append(h('div', { class: 'sec' }, $t('main.tabQuest.22')));
  const pre = st.test.pre, post = st.test.post;
  body.append(itemRow('📝', $t('main.tabQuest.21'), pre ? $t('main.tabQuest.20', { score: pre.score, day: pre.day }) : $t('main.tabQuest.19'), pre ? $t('main.tabQuest.18') : $t('main.tabQuest.17'), () => runTest('pre'), { disabled: !!pre }));
  const canPost = pre && st.completed.length >= 1;
  body.append(itemRow('🎯', $t('main.tabQuest.16'), post ? $t('main.tabQuest.15', { score: post.score, day: post.day }) : canPost ? $t('main.tabQuest.14') : (pre ? $t('main.tabQuest.13') : $t('main.tabQuest.12')), post ? $t('main.tabQuest.11') : $t('main.tabQuest.10'), () => runTest('post'), { disabled: !canPost }));
  if (pre) {
    const box = h('div', { class: 'fb' });
    box.append(h('div', { class: 'cmp' }, h('span', {}, $t('main.tabQuest.9')), h('div', { class: 'bar' }, h('i', { style: { width: pre.score / 6 * 100 + '%' } })), h('b', {}, `${pre.score}/6`)));
    if (post) {
      box.append(h('div', { class: 'cmp' }, h('span', {}, $t('main.tabQuest.8')), h('div', { class: 'bar post' }, h('i', { style: { width: post.score / 6 * 100 + '%' } })), h('b', {}, `${post.score}/6`)));
      const d = post.score - pre.score;
      box.append(h('div', { class: 'tiny' }, d > 0 ? $t('main.tabQuest.7', { d }) : d === 0 ? $t('main.tabQuest.6') : $t('main.tabQuest.5')));
    }
    body.append(box);
  }
  // 배움 노트
  const myNotes = notesFor(st.track);
  const n = myNotes.filter((x) => st.notes[x.id]).length;
  body.append(h('div', { class: 'sec' }, $t('main.tabQuest.4', { n, length: myNotes.length })));
  if (st.nearMiss.length) body.append(h('div', { class: 'tiny minus' }, $t('main.tabQuest.3', { length: st.nearMiss.length, v2: st.bNearMiss || 0 })));
  myNotes.forEach((x) => body.append(h('div', { class: 'note' + (st.notes[x.id] ? ' on' : '') },
    h('b', {}, (st.notes[x.id] ? '✅ ' : '⬜ ') + x.t), st.notes[x.id] ? h('span', { class: 'tiny muted' }, $t('main.tabQuest.2', { v1: st.notes[x.id] })) : null,
    h('div', { class: 'tiny' }, st.notes[x.id] ? x.d : $t('main.tabQuest.1')))));
}
function runTest(kind) {
  const answers = [];
  let i = 0;
  const m = openModal({ title: kind === 'pre' ? $t('main.runTest.2') : $t('main.runTest.1'), body: '' });
  const show = () => {
    if (i >= TEST.length) return end();
    const q = TEST[i];
    const fb = h('div');
    const btns = q.o.map((o, k) => h('button', { class: 'btn opt', onclick: (e) => {
      answers.push(k);
      if (kind === 'pre') { A.sfx('tap'); i++; show(); return; }
      btns.forEach((b) => (b.disabled = true));
      if (k === q.a) { A.sfx('good'); e.currentTarget.classList.add('right'); } else { A.sfx('bad'); e.currentTarget.classList.add('wrong'); btns[q.a].classList.add('right'); }
      fb.append(h('button', { class: 'btn primary', onclick: () => { i++; show(); } }, $t('main.show.3')));
    } }, o));
    m.setBody(h('div', { class: 'col' }, h('div', { class: 'qhead' }, h('span', {}, kind === 'pre' ? $t('main.show.2') : $t('main.show.1')), h('span', {}, `${i + 1} / 6`)), h('div', { class: 'qtext' }, q.q), h('div', { class: 'col gap6' }, btns), fb));
  };
  const end = () => {
    const score = answers.filter((a, k) => a === TEST[k].a).length;
    st.test[kind] = { score, day: st.day, answers };
    save(); refreshAll();
    A.sfx('fanfare');
    const pre = st.test.pre;
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'big-score' }, `${score} / 6`),
      kind === 'pre' ? h('div', { class: 'fb' }, $t('main.end.3'))
        : h('div', { class: 'fb good' }, $t('main.end.2', { score: pre.score, score_: score, v3: score - pre.score >= 0 ? '+' : '', v4: score - pre.score })),
      h('button', { class: 'btn primary big', onclick: () => m.close() }, $t('main.end.1'))));
  };
  show();
}

function tabTogether(body) {
  const mode = netMode();
  body.append(h('div', { class: 'fb ' + (mode === 'firebase' ? 'good' : '') },
    mode === 'firebase' ? $t('main.tabTogether.13')
      : mode === 'local' ? $t('main.tabTogether.12')
        : $t('main.tabTogether.11')));
  body.append(h('div', { class: 'tiny muted' }, $t('main.tabTogether.10', { nick: st.nick, helpsLeft: st.helpsLeft })));
  const list = onlineFriends();
  body.append(h('div', { class: 'sec' }, $t('main.tabTogether.9', { length: list.length })));
  if (!list.length) body.append(h('div', { class: 'tiny muted' }, $t('main.tabTogether.8')));
  list.forEach((f) => {
    body.append(h('div', { class: 'item' },
      h('div', { class: 'ic' }, f.flag || '👷'),
      h('div', { class: 'tx' }, h('b', {}, f.nick), h('small', {}, $t('main.tabTogether.7', { v1: f.country || '', v2: f.building || '', v3: f.progress ?? 0, v4: f.completes || 0 }))),
      h('div', { class: 'col gap6' },
        h('button', { class: 'btn primary', disabled: st.helpsLeft <= 0, onclick: async () => {
          const ok = await sendTo(f.id, { type: 'help', nick: st.nick });
          if (!ok) return toast($t('main.tabTogether.6'), 'bad');
          st.helpsLeft--; st.stats.helps++;
          earn(Math.round(1 + stageMult()), $t('main.tabTogether.5', { nick: f.nick }));
        } }, $t('main.tabTogether.4')),
        h('button', { class: 'btn', onclick: () => chatPicker(f) }, $t('main.tabTogether.3')))));
  });
  if (list.length) {
    body.append(h('div', { class: 'sec' }, $t('main.tabTogether.2')));
    body.append(h('div', { class: 'seg' }, QUICK_CHAT.map((t) => h('button', { onclick: () => { list.forEach((f) => sendTo(f.id, { type: 'chat', nick: st.nick, text: t })); S.say(t, 'me'); toast($t('main.tabTogether.1')); } }, t))));
  }
}
function chatPicker(f) {
  const m = openModal({ title: $t('main.chatPicker.2', { nick: f.nick }), body: h('div', { class: 'grid2' }, QUICK_CHAT.map((t) => h('button', { class: 'btn', onclick: () => { sendTo(f.id, { type: 'chat', nick: st.nick, text: t }); S.say(t, 'me'); m.close(); toast($t('main.chatPicker.1')); } }, t))) });
}

/* ---------------- 세계지도 ---------------- */
const LAND = {
  na: [[-168, 66], [-140, 70], [-95, 72], [-80, 63], [-60, 55], [-53, 47], [-66, 44], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-97, 18], [-88, 15], [-83, 9], [-78, 8], [-90, 14], [-105, 20], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
  gl: [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-70, 76]],
  sa: [[-78, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-58, -38], [-66, -55], [-74, -50], [-71, -18], [-81, -5]],
  eu: [[-10, 36], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [45, 45], [30, 41], [26, 38], [22, 37], [19, 42], [12, 44], [16, 38], [12, 38], [8, 44], [3, 43], [-1, 37]],
  uk: [[-5, 50], [2, 51], [-1, 56], [-3, 59], [-6, 57], [-5, 54], [-3, 53]],
  af: [[-17, 15], [-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [34, 28], [43, 12], [51, 12], [40, -15], [35, -25], [20, -35], [17, -29], [12, -17], [13, -5], [9, 4], [-8, 4], [-15, 10]],
  as: [[26, 40], [36, 36], [34, 31], [35, 28], [44, 12], [52, 16], [57, 24], [56, 26], [50, 30], [48, 30], [56, 27], [62, 25], [67, 24], [73, 20], [77, 8], [80, 15], [88, 22], [94, 16], [98, 8], [104, 1], [104, 10], [109, 12], [108, 21], [117, 24], [122, 30], [121, 37], [126, 40], [129, 35], [130, 43], [141, 52], [135, 55], [160, 60], [180, 66], [180, 72], [140, 73], [100, 78], [70, 73], [60, 68], [40, 67], [45, 45]],
  jp: [[130, 31], [136, 34], [141, 37], [141, 45], [143, 44], [140, 40], [135, 35], [130, 33]],
  au: [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -28], [150, -37], [140, -38], [132, -32], [115, -34]],
};
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function drawWorldMap() {
  const COLS = 120, ROWS = 52, CELL = 3;
  const c = document.createElement('canvas'); c.width = COLS * CELL; c.height = ROWS * CELL; c.className = 'worldmap';
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4f8fd6'; ctx.fillRect(0, 0, c.width, c.height);
  const curCi = countryIdxOf(curDef());
  const doneCi = (ci) => st.finished || ci < curCi;
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
    const lon = -180 + (k + 0.5) * 3, lat = 82 - (r + 0.5) * 3;
    let col = null;
    for (const p of Object.values(LAND)) if (inPoly(lon, lat, p)) { col = '#e9dfc0'; break; }
    COUNTRIES.forEach((cc, ci) => { if (inPoly(lon, lat, cc.poly)) col = doneCi(ci) ? '#3fb34f' : ci === curCi ? '#ffd21a' : '#cfc5a6'; });
    if (col) { ctx.fillStyle = col; ctx.fillRect(k * CELL, r * CELL, CELL, CELL); }
  }
  // 나라 핀 (작은 나라도 보이게)
  COUNTRIES.forEach((cc, ci) => {
    const x = Math.floor((cc.lon + 180) / 3) * CELL, y = Math.floor((82 - cc.lat) / 3) * CELL;
    ctx.fillStyle = doneCi(ci) ? '#1f8a30' : ci === curCi ? '#e0a800' : '#8a8a8a';
    ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 3, 3);
  });
  return c;
}
function tabMap(body) {
  body.append(drawWorldMap());
  body.append(h('div', { class: 'tiny muted' }, $t('main.tabMap.27')));
  const curCi = countryIdxOf(curDef());
  body.append(h('div', { class: 'sec' }, $t('main.tabMap.26')));
  COUNTRIES.forEach((c, ci) => {
    const done = st.finished || ci < curCi, prog = !st.finished && ci === curCi;
    const bl = BUILDINGS.filter((b) => b.c === c.id);
    const doneN = bl.filter((b) => BUILDINGS.indexOf(b) < st.bIdx || st.finished).length;
    body.append(itemRow(c.flag, c.name, bl.map((b) => b.name).join(' · '), done ? $t('main.tabMap.25') : null, () => viewCountry(ci),
      { extra: h('span', { class: 'badge ' + (done ? 'done' : prog ? 'prog' : 'lock') }, done ? $t('main.tabMap.24') : prog ? $t('main.tabMap.23', { doneN, length: bl.length }) : $t('main.tabMap.22')), primary: false }));
  });
  // 설정
  body.append(h('div', { class: 'sec' }, $t('main.tabMap.21')));
  if (MULTI_LANG) {
  body.append(h('div', { class: 'set-row' }, h('span', {}, $t('main.tabMap.15')), h('div', { class: 'seg' }, LANG_IDS.map((l) => h('button', { class: st.lang === l ? 'on' : '', 'data-no-ko': '', 'data-ko-ok': '', onclick: () => chooseLang(l) }, LANG_NAMES[l])))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, $t('set.showKo')), h('div', { class: 'seg' },
    h('button', { class: st.showKo ? 'on' : '', onclick: () => { st.showKo = !st.showKo; setShowKo(st.showKo); save(); refreshAll(); renderTab('map'); } }, st.showKo ? $t('set.on') : $t('set.off')))));
  }
  body.append(h('div', { class: 'set-row' }, h('span', {}, $t('main.tabMap.14')), h('div', { class: 'seg' }, CITIES.map((c) => h('button', { class: st.city === c.id ? 'on' : '', onclick: async () => { st.city = c.id; save(); await fetchForecast(st.city); S.setWeather(describe(todayWx()).kind); refreshAll(); } }, c.name)))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, $t('main.tabMap.13')), h('div', { class: 'seg' },
    h('button', { class: st.music ? 'on' : '', onclick: () => { toggleMusic(); renderTab('map'); } }, $t('main.tabMap.12', { v1: st.music ? $t('main.tabMap.11') : $t('main.tabMap.10') })),
    h('button', { class: st.sfx ? 'on' : '', onclick: () => { st.sfx = !st.sfx; A.setPrefs(st.music, st.sfx); save(); renderTab('map'); } }, $t('main.tabMap.9', { v1: st.sfx ? $t('main.tabMap.8') : $t('main.tabMap.7') })))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, $t('main.tabMap.6')), h('div', { class: 'seg' }, h('button', { onclick: () => {
    const v = prompt($t('main.tabMap.5'), st.nick); if (v && v.trim()) { st.nick = v.trim().slice(0, 10); save(); publishNow(); renderTab('map'); }
  } }, `${st.nick} ✏️`))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, $t('main.tabMap.4')), h('div', { class: 'seg' }, h('button', { onclick: () => {
    if (confirm($t('main.tabMap.3'))) { wipe(); location.reload(); }
  } }, $t('main.tabMap.2')))));
  body.append(h('div', { class: 'tiny muted', style: { marginTop: '8px' } }, $t('main.tabMap.1', { COMPANY })));
  if (MULTI_LANG) body.append(h('div', { class: 'tiny muted i18n-note' }, '🌐 ', $t('set.reviewNote')));
  body.append(h('div', { class: 'tiny muted basis-note' }, '📚 근거 표시 — 법정: 산업안전보건법·안전보건규칙 / 표준: KS·KCS 표준시방서 / 게임: 이해를 돕기 위해 단순화한 부분. v10 · 한국어 버전 (다국어는 다음 단계)'));
}
// 게임 언어 바꾸기: 새로고침 없이 지금 화면을 다시 그린다
async function chooseLang(code) {
  if (st.lang !== code) { st.lang = code; save(); }
  await setLang(code);
}
onLangChange(() => {
  renderIntroLang();
  S.relabel($t('scene.ensureMe.1'));
  if ($('#introCont') && st.track) $('#introCont').textContent = $t('main.boot.2', { day: st.day, v2: st.finished ? $t('main.boot.1') : curDef().name });
  refreshAll();
  if (!$('#intro') && viewing == null && !walkActive()) syncScene();
  if (curTab) renderTab(curTab);
  publishNow?.();
});
function renderIntroLang() {
  const box = $('#introLang'); if (!box) return;
  box.innerHTML = '';
  if (!MULTI_LANG) { box.classList.add('hidden'); return; }
  LANG_IDS.forEach((l) => box.append(h('button', { class: 'chip' + (st.lang === l ? ' on' : ''), 'data-no-ko': '', 'data-ko-ok': '', onclick: () => chooseLang(l) }, LANG_NAMES[l])));
}
function viewCountry(ci) {
  closeSheet();
  const c = COUNTRIES[ci];
  const list = BUILDINGS.filter((b) => b.c === c.id);
  S.setCountry(ci, list.map((b) => ({ shown: buildModel(b.id).blocks.length })), 0, { viewOnly: true });
  S.setWorkers(0); S.setCrane(false);
  viewing = ci;
  $('#viewBar')?.remove();
  let fi = 0;
  const bar = h('div', { id: 'viewBar', class: 'viewbar' },
    h('button', { class: 'btn', onclick: () => { fi = (fi + list.length - 1) % list.length; S.focusOn(fi); } }, '◀'),
    h('b', {}, $t('main.viewCountry.2', { flag: c.flag, name: c.name })),
    h('button', { class: 'btn', onclick: () => { fi = (fi + 1) % list.length; S.focusOn(fi); } }, '▶'),
    h('button', { class: 'btn primary', onclick: () => { syncScene(); } }, $t('main.viewCountry.1')));
  $('#app').append(bar);
}

/* ---------------- 안전 코스 ---------------- */
function openSafety(then) {
  const m = runSafetyCourse({ nick: st.nick, lang: st.lang, onNote: note, onDone: (rec, lang) => {
    st.safety = { done: true, record: rec }; save(); if (st.lang !== lang) chooseLang(lang);
    toast($t('main.openSafety.1', { score: rec.score }));
  } });
  m.onClose = () => { then?.(); refreshAll(); };
}

/* ---------------- 살아 있는 현장 ---------------- */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let chatterT = 3, giftT = 18;
function ambient() {
  if (viewing != null || demo) return;
  chatterT -= 1; giftT -= 1;
  if (chatterT <= 0) {
    chatterT = 4 + Math.random() * 3;
    const w = todayWx(), ef = effect(w), d = describe(w);
    let pool = LINES.work, who = 'random';
    if (!st.started && !st.finished) pool = LINES.idle;
    if (ef.stop) pool = d.kind === 'rain' || w.rain >= 5 ? LINES.rain.concat(LINES.stop) : LINES.stop;
    else if (st.conflict != null && Math.random() < 0.5) pool = LINES.conflict;
    else if (st.actionsLeft <= 0) pool = LINES.done;
    else if (st.started && statusText().c === 'late' && Math.random() < 0.5) pool = LINES.delay;
    else if (d.kind === 'rain' && Math.random() < 0.6) pool = LINES.rain;
    else if (w.tmax >= 33 && Math.random() < 0.5) pool = LINES.hot;
    else if (w.tmin <= 0 && Math.random() < 0.5) pool = LINES.cold;
    else if (ef.craneStop && Math.random() < 0.5) pool = LINES.wind;
    else if (d.kind === 'fog' && Math.random() < 0.4) pool = LINES.fog;
    else if (Math.random() < 0.3) { pool = LINES.mixer; who = 'mixer'; }
    S.say(pick(pool), who);
  }
  if (giftT <= 0) {
    giftT = 22 + Math.random() * 20;
    if (st.gifts > 0 && st.workers > 0 && !anyModal()) {
      const n = Math.max(1, Math.round((1 + Math.random() * 2) * stageMult()));
      S.giftBubble($t('main.ambient.2', { n: won(n) }), () => {
        if (st.gifts <= 0) return;
        st.gifts--; earn(n, $t('main.ambient.1'));
      });
    }
  }
  if (talkQueued && !anyModal()) { const t = talkQueued; talkQueued = null; openTalk(t); }
}

/* ---------------- 함께 짓기 ---------------- */
function presenceInfo() {
  const def = curDef(), c = COUNTRIES[countryIdxOf(def)];
  return { nick: st.nick, flag: c.flag, country: c.name, building: st.finished ? $t('main.presenceInfo.1') : def.name, progress: Math.round(actual() * 100), completes: st.completed.length, day: st.day, building_on: st.started };
}
function onNetMessage(msg) {
  if (msg.type === 'help') {
    if (st.started && !st.finished && !todayEf().stop) {
      const amt = Math.round(20 * stageMult());
      st.progress = Math.min(curDef().work - 1, st.progress + amt);
      updateCurrentBlocks(true);
      toast($t('main.onNetMessage.3', { nick: msg.nick, amt }));
    } else {
      st.money += 5; toast($t('main.onNetMessage.2', { nick: msg.nick, amt: won(5) }));
    }
    S.friendSay(msg.from, $t('main.onNetMessage.1'));
    A.sfx('coin'); save(); refreshAll();
  } else if (msg.type === 'chat') {
    toast(`💬 ${msg.nick}: ${msg.text}`);
    S.friendSay(msg.from, msg.text); A.sfx('pop');
  }
}
let lastFriendCount = -1;
function onNetChange() {
  const list = onlineFriends();
  if (viewing == null) S.setFriends(list.slice(0, 6).map((f) => ({ id: f.id, nick: f.nick })));
  const el = $('#cntFriends'); el.textContent = list.length; el.classList.toggle('hidden', !list.length);
  if (lastFriendCount >= 0 && list.length > lastFriendCount) toast($t('main.onNetChange.1'));
  lastFriendCount = list.length;
  if (curTab === 'together') renderTab('together');
}

/* ---------------- 시연 모드 ---------------- */
async function toggleDemo() {
  if (!demo) {
    demoSnap = JSON.stringify(st);
    demo = true; walkActive()?.end(true); closeAllModals(); closeSheet(); $('#radio')?.remove();
    $('#demoBtn').classList.add('on'); $('#demoBtn').textContent = $t('main.toggleDemo.6');
    toast($t('main.toggleDemo.5'));
    if (st.workers < 6) { st.workers = 6; S.setWorkers(6); }
    syncScene();
    while (demo && !st.finished) {
      const def = curDef();
      if (!st.started) { st.started = true; st.startDay = st.day; st.ext = 0; }
      const start = st.progress, steps = 40;
      for (let k = 1; k <= steps && demo; k++) {
        st.progress = start + (def.work - start) * (k / steps);
        updateCurrentBlocks(true); refreshSite();
        if (k % 8 === 0) { A.sfx('build'); S.workPulse(); S.say(pick(LINES.work)); }
        await sleep(125);
      }
      if (!demo) break;
      A.sfx('fanfare');
      toast($t('main.toggleDemo.4', { name: def.name }));
      st.completed.push({ id: def.id, day: st.day, late: 0, ext: 0, total: def.reward });
      st.day += def.days;
      const prevC = def.c;
      st.bIdx++; st.progress = 0; st.started = false;
      if (st.bIdx >= BUILDINGS.length) { st.finished = true; st.bIdx = BUILDINGS.length - 1; st.progress = def.work; refreshAll(); break; }
      if (curDef().c !== prevC) {
        const c = COUNTRIES.find((x) => x.id === prevC);
        toast($t('main.toggleDemo.3', { flag: c.flag, name: c.name }));
        await sleep(900);
        if (!demo) break;
        syncScene();
      } else syncScene();
      refreshAll();
      await sleep(500);
    }
    if (demo && st.finished) showEnding(true);
  } else {
    demo = false;
    st = JSON.parse(demoSnap);
    $('#demoBtn').classList.remove('on'); $('#demoBtn').textContent = $t('main.toggleDemo.2');
    closeAllModals(); syncScene(); refreshAll();
    toast($t('main.toggleDemo.1'));
  }
}
function showEnding(isDemo) {
  A.sfx('fanfare');
  const myNotes = notesFor(st.track);
  const n = myNotes.filter((x) => st.notes[x.id]).length;
  const m = openModal({ title: $t('main.showEnding.17'), body: h('div', { class: 'col ending' },
    h('div', { class: 'logo' }, $t('main.showEnding.16')),
    h('div', { class: 'conf-title' }, $t('main.showEnding.15', { COMPANY })),
    h('div', {}, $t('main.showEnding.14')),
    h('div', { class: 'settle' },
      h('div', { class: 'r' }, h('span', {}, $t('main.showEnding.13')), h('b', {}, $t('main.showEnding.12', { length: st.completed.length }))),
      h('div', { class: 'r' }, h('span', {}, $t('main.showEnding.11')), h('b', {}, $t('main.showEnding.10', { day: st.day }))),
      h('div', { class: 'r' }, h('span', {}, $t('main.showEnding.9')), h('b', {}, `${n}/${myNotes.length}`)),
      h('div', { class: 'r' }, h('span', {}, $t('main.showEnding.8')), h('b', {}, $t('main.showEnding.7', { length: st.nearMiss.length }))),
      st.test.pre ? h('div', { class: 'r' }, h('span', {}, $t('main.showEnding.6')), h('b', {}, $t('main.showEnding.5', { score: st.test.pre.score, v2: st.test.post ? $t('main.showEnding.4', { score: st.test.post.score }) : '' }))) : null),
    h('div', { class: 'tiny muted' }, $t('main.showEnding.3')),
    h('button', { class: 'btn primary big', onclick: () => { m.close(); if (isDemo) toggleDemo(); } }, isDemo ? $t('main.showEnding.2') : $t('main.showEnding.1'))) });
}

/* ---------------- 음악 ---------------- */
function toggleMusic() {
  st.music = !st.music; A.unlock(); A.setPrefs(st.music, st.sfx);
  if (st.music) A.startMusic();
  save(); refreshTop();
}

/* ---------------- 인트로 · 시작 ---------------- */
async function boot() {
  const saved = await loadSave();
  booted = true;
  if (saved && (saved.v === 1 || saved.v === 2)) { try { st = migrate(saved); } catch (e) { console.warn('save migrate failed', e); } }
  // 게임 언어: 저장 기록 → 기기에 저장된 선택 → 한국어
  if (!saved) st.lang = savedLang() || 'ko';
  if (!MULTI_LANG) st.lang = 'ko';
  await setLang(st.lang || 'ko', { silent: true });
  setShowKo(st.showKo ?? (st.track === 'field'));
  renderIntroLang();
  if (DEV) {
    const b = h('button', { class: 'chip i18n-check', onclick: () => { const n = checkHangul([st.nick]); toast($t('dev.checkResult', { n })); if (missingKeys().length) console.warn('[i18n] 빠진 키', missingKeys()); } }, $t('dev.check'));
    $('#app').append(b);
  }
  A.setPrefs(st.music, st.sfx);
  document.body.classList.add('intro-on');
  S.initScene($('#gl'), $('#labels'));
  S.playIntro();
  setTimeout(() => $('.logo')?.classList.add('show'), 2600);
  refreshTop();
  fetchForecast(st.city).then(() => { refreshAll(); if (!$('#intro')) S.setWeather(describe(todayWx()).kind); });
  if (saved && saved.track) {
    const ci = $('#introCont');
    ci.textContent = $t('main.boot.2', { day: st.day, v2: st.finished ? $t('main.boot.1') : curDef().name });
    ci.classList.remove('hidden');
  }
  $('#nickInput').value = st.nick || '';
  $('#introMusic').onclick = () => toggleMusic();
  $('#trackField').onclick = () => enter('field');
  // 메인 UI 이벤트
  $('#workBtn').onclick = doWork;
  $('#nextBtn').onclick = nextDay;
  $('#musicBtn').onclick = toggleMusic;
  $('#demoBtn').onclick = toggleDemo;
  $('#dateChip').onclick = showForecast;
  $('#liftBtn').onclick = () => goToFloor(ctx);
  S.hooks.onHoistTap = () => { if (!anyModal() && viewing == null && !demo) goToFloor(ctx); };
  $('#moneyChip').onclick = () => openTab('shop');
  $('#sheetClose').onclick = closeSheet;
  document.querySelectorAll('#nav button').forEach((b) => (b.onclick = () => openTab(b.dataset.tab)));
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });
  setInterval(ambient, 1000);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor?.isNativePlatform?.()) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  else if ('serviceWorker' in navigator && location.hostname === 'localhost' && !window.Capacitor) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

function enter(track) {
  const nick = $('#nickInput').value.trim().slice(0, 10) || st.nick || $t('main.enter.1', { v1: Math.floor(100 + Math.random() * 900) });
  st.nick = nick;
  if (st.track !== track || !Object.keys(mgDefaults(track)).every((k) => k in st.mg)) st.mg = mgDefaults(track);
  st.track = track;
  if (st.showKo == null) { st.showKo = track === 'field'; setShowKo(st.showKo); }
  st.quests = st.quests.filter((q) => { const d = QUESTS.find((x) => x.id === q.id); return d && (!d.tr || d.tr === track); });
  A.unlock(); A.setPrefs(st.music, st.sfx);
  if (st.music) A.startMusic();
  A.sfx('fanfare');
  fillQuests();
  save();
  document.body.classList.remove('intro-on');
  const intro = $('#intro'); intro.classList.add('out'); setTimeout(() => intro.remove(), 450);
  S.endIntro();
  syncScene(); refreshAll();
  // 탭마다 접속 ID를 따로 둔다 (같은 기기 테스트 모드에서 탭끼리 구분)
  let tab = sessionStorage.getItem('cheotsap.tab');
  if (!tab) { tab = rid().slice(0, 4); sessionStorage.setItem('cheotsap.tab', tab); }
  startNet(`${st.id}-${tab}`, presenceInfo, { onMessage: onNetMessage, onChange: onNetChange });
  if (!st.safety.done) openSafety(() => showBriefing()); // 안전 코스를 마치지 않았으면 트랙과 상관없이 안전 코스부터
  else showBriefing();
}

// 자동 점검용 훅 (tools/smoke2.mjs)
window.__cheotsap = { get st() { return st; }, ctx, walk: walkActive, addEvent: (id, f) => addEvent(ctx, id, f), goToFloor: (f) => goToFloor(ctx, f), night: () => nightCard(ctx, advanceDay), endOfDay: () => endOfDay(), refresh: () => refreshAll(), sync: () => syncScene() };
// 불러오기가 끝나기 전에는 저장하지 않음 (빈 상태로 덮어쓰기 방지)
let booted = false;
window.addEventListener('visibilitychange', () => { if (document.hidden && booted && !demo) saveNow(st); });
boot();
