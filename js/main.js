// 첫 삽 — 메인 게임 로직
import * as S from './scene.js';
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
import { LANGS } from './i18n.js';
import { startNet, onlineFriends, sendTo, netMode, publishNow } from './net.js';

/* ---------------- 상태 ---------------- */
const rid = () => Math.random().toString(36).slice(2, 10);
const freshStats = () => ({ actions: 0, quizCorrect: 0, hires: 0, remiconCorrect: 0, remiconReject: 0, stopDayEarn: 0, conflicts: 0, onTime: 0, talks: 0, helps: 0, levelGood: 0, craneGood: 0,
  hoists: 0, eventsSolved: 0, nights: 0, cleanBuilds: 0, cylOk: 0, rebarOk: 0, cpmOk: 0, patrolFound: 0, windowOk: 0, glassOk: 0, hideOk: 0, lunchOk: 0, hoistWarn: 0 });
const defaultState = () => ({
  v: 2, id: rid(), nick: '', track: null, lang: 'ko', music: true, sfx: true, city: 'gwangju',
  startDate: ymd(new Date()), day: 1, money: 30, actionsLeft: ACTIONS_PER_DAY, gifts: 3,
  mg: mgDefaults('student'), helpsLeft: 10,
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
  const def = mgDefaults(out.track || 'student'), mg = {};
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
  if (st.finished) return { t: '모든 현장 준공! 세계 일주 완료 🎉', c: 'ok' };
  if (!st.started) return { t: '착공 전 · 착공하면 마감일이 정해져요', c: 'info' };
  const dl = deadlineDay();
  if (st.day > dl) return { t: `마감일이 ${st.day - dl}일 지났어요`, c: 'late' };
  const gap = planned(startOfDay) - actual();
  if (gap >= 0.08) return { t: `공정이 ${Math.round(gap * 100)}% 미뤄지고 있어요!`, c: 'late' };
  return { t: '계획대로 순항 중', c: 'ok' };
}
function ddayText() {
  const def = curDef();
  if (st.finished) return '준공 완료';
  if (!st.started) return `공기 ${def.days}일`;
  const dl = deadlineDay(), d = dl - st.day;
  return `마감 ${fmtDate(dateOf(dl), false)} · ${d > 0 ? 'D-' + d : d === 0 ? 'D-day' : `${-d}일 지남`}`;
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
  toast(`📒 배움 노트에 추가: ${n.t}`, 'note');
  save();
}

/* ---------------- UI 갱신 ---------------- */
function refreshTop() {
  $('#money').textContent = won(st.money);
  const w = todayWx(), d = describe(w), ef = effect(w);
  $('#dateTxt').textContent = `${st.day}일차 ${fmtDate(dateOf(st.day))}`;
  $('#wxIcon').textContent = d.icon;
  $('#wxTemp').textContent = `${Math.round(w.tmax)}°`;
  $('#moraleTxt').textContent = `${st.morale >= 70 ? '😄' : st.morale >= 40 ? '🙂' : '😣'} 사기 ${Math.round(st.morale)}`;
  $('#crewTxt').textContent = `👷 인부 ${st.workers}명`;
  $('#wxNote').textContent = ef.stop ? '⛔ 공사 중지' : ef.mult < 1 ? `${d.name} · 작업량 ${Math.round(ef.mult * 100)}%` + (ef.craneStop ? ' · 크레인 중지' : '') : `${d.name}${isLive() ? '' : ' (가상 예보)'}`;
  $('#conflictTag').classList.toggle('hidden', st.conflict == null);
  $('#musicBtn').classList.toggle('off', !st.music);
  $('#introMusic')?.classList.toggle('off', !st.music);
}
function refreshSite() {
  const def = curDef(), c = COUNTRIES[countryIdxOf(def)];
  $('#scFlag').textContent = c.flag;
  $('#scName').textContent = st.finished ? '세계 일주 완료' : def.name;
  const ph = curPhase();
  const fl = st.started && !st.finished ? currentFloor(def, actual()) : 0;
  $('#scPhase').textContent = st.finished ? '준공' : st.started ? (floorText(def, fl, PHASES[ph]) || PHASES[ph]) : '착공 전';
  // 층별 이벤트 · 층 이동 버튼
  const evBox = $('#scEvent'); evBox.innerHTML = '';
  st.events.forEach((e) => evBox.append(h('button', { class: 'evtag', onclick: () => goToFloor(ctx, e.floor) }, `🚨 ${floorLabel(def.id, e.floor)} ${SHORT[e.id]} · 남은 작업 ${e.left}회`, h('b', {}, '가기 ▶'))));
  if (st.slowActs > 0) evBox.append(h('div', { class: 'evslow' }, `⏸ 공정 멈춤 여파: 작업 ${st.slowActs}회 동안 작업량 -50%`));
  evBox.classList.toggle('hidden', !evBox.childNodes.length);
  const lb = $('#liftBtn');
  lb.classList.toggle('hidden', !st.started || st.finished);
  lb.textContent = FLOORS[def.id]?.walk ? '🚶 현장 걷기' : hasHoist() ? '🔼 호이스트' : '🧗 층 이동';
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
  warn.textContent = '⚠️ ' + (s.c === 'late' ? (st.day > deadlineDay() ? s.t : `공정 지연 — ${s.t}`) : '');
  // 버튼
  const wb = $('#workBtn'), ef = todayEf(), r = rates();
  wb.classList.toggle('start', !st.started && !st.finished);
  if (st.finished) { wb.disabled = true; wb.querySelector('.lbl').textContent = '🎉 완공'; $('#workSub').textContent = '모든 건물 준공'; }
  else if (!st.started) { wb.disabled = false; wb.querySelector('.lbl').textContent = '🚧 착공하기'; $('#workSub').textContent = `공기 ${def.days}일 · 마감일 확정`; }
  else if (ef.stop) { wb.disabled = true; wb.querySelector('.lbl').textContent = '⛔ 공사 중지'; $('#workSub').textContent = '부업·퀘스트로 돈 벌기'; }
  else if (st.actionsLeft <= 0) { wb.disabled = true; wb.querySelector('.lbl').textContent = '✅ 오늘 작업 끝'; $('#workSub').textContent = '하루 마감을 눌러요'; }
  else { wb.disabled = false; wb.querySelector('.lbl').textContent = '🔨 작업'; $('#workSub').textContent = `${st.actionsLeft} / ${ACTIONS_PER_DAY} · +${r.total}블록`; }
  const cost = nextCost(), nb = $('#nextBtn');
  nb.classList.toggle('pay', cost > 0);
  nb.querySelector('.lbl').textContent = cost > 0 ? (st.started ? '⏸ 공사 미루기' : '⏸ 착공 미루기') : '🌙 하루 마감';
  $('#nextSub').textContent = cost > 0 ? won(cost) : '다음 날 (무료)';
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
  toast(`🚧 ${def.name} 착공! 마감 ${fmtDate(dateOf(deadlineDay()))} · 공기 ${def.days}일`);
  S.say('착공이다! 안전하게 갑시다!', 0) || S.say('착공이다! 안전하게 갑시다!', 'me');
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
  if (ef.stop) return toast('오늘은 날씨 때문에 공사 중지예요. 부업과 퀘스트로 돈을 벌어 보세요', 'bad');
  if (st.actionsLeft <= 0) return toast('오늘 작업 12회를 모두 썼어요. 하루 마감을 눌러요');
  st.actionsLeft--; st.stats.actions++;
  const r = rates();
  st.progress += r.total;
  if (st.slowActs > 0) st.slowActs--;
  A.sfx('build'); S.workPulse();
  floatNum(`+${r.total} 블록`);
  updateCurrentBlocks(true);
  const ph = curPhase();
  if (ph > st.lastPhase) {
    st.lastPhase = ph;
    toast(`🏗️ 공정 단계: ${PHASES[ph]} 시작!`);
    note('sequence');
    S.say(`${PHASES[ph]} 들어갑니다!`);
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
    if (st.money < cost) return toast(`돈이 부족해요 (${won(cost)} 필요). 남은 작업을 하거나 부업으로 벌어 오세요`, 'bad');
    const m = openModal({ title: st.started ? '⏸ 공사 미루기' : '⏸ 착공 미루기', body: h('div', { class: 'col' },
      h('div', { class: 'fb' }, st.started
        ? `오늘 작업이 ${st.actionsLeft}회 남았어요. 넘기면 인부 ${st.workers}명의 대기 일당 ${won(cost)}을 내야 하고 현장 사기가 크게 떨어져요.`
        : `착공 전에 날을 넘기면 현장 유지비 ${won(cost)}이 들어요.`),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onclick: () => m.close() }, '취소'),
        h('button', { class: 'btn primary', onclick: () => { m.close(); st.money -= cost; if (st.started) st.morale = Math.max(0, st.morale - 12); endOfDay(); } }, `${won(cost)} 내고 넘기기`))) });
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
  st.mg = mgDefaults(st.track || 'student');
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
  S.say('준공이다~! 수고하셨습니다!');
  const m = openModal({ title: '📄 준공 정산서', body: h('div', { class: 'col' },
    h('div', { class: 'conf-title' }, `🎉 ${def.name} 준공!`),
    h('div', { class: 'tiny muted' }, def.fact),
    h('div', { class: 'settle' },
      h('div', { class: 'r' }, h('span', {}, '착공 → 준공'), h('b', {}, `${fmtDate(dateOf(st.day - usedDays + 1), false)} → ${fmtDate(dateOf(st.day), false)} (${usedDays}일)`)),
      h('div', { class: 'r' }, h('span', {}, '계약 공기'), h('b', {}, `${def.days}일`)),
      h('div', { class: 'r' }, h('span', {}, '날씨 연장 인정'), h('b', {}, `${ext}일`)),
      h('div', { class: 'r' }, h('span', {}, '계약금'), h('b', {}, won(def.reward))),
      late === 0 ? h('div', { class: 'r' }, h('span', {}, '공기 내 준공 보너스 (+10%)'), h('b', { class: 'plus' }, '+' + won(bonus)))
        : h('div', { class: 'r' }, h('span', {}, `지체상금 (${late}일 × 10%, 최대 50%)`), h('b', { class: 'minus' }, '-' + won(penalty))),
      h('div', { class: 'r total' }, h('span', {}, '최종 수령액'), h('b', {}, won(total))),
      h('div', { class: 'r' }, h('span', {}, '아차사고'), h('b', { class: nm ? 'minus' : 'plus' }, nm ? `${nm}건` : '0건 👍'))),
    h('div', { class: 'tiny muted' }, '※ 실제 공사계약의 지체상금률은 보통 하루 계약금액의 0.05%(1000분의 0.5)예요. 게임에선 공기의 중요성을 느끼도록 크게 잡았어요.'),
    h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')) });
  m.onClose = () => {
    if (st.completed.length === 1 && st.test.pre && !st.test.post) toast('📋 퀘스트 탭에서 사후 테스트를 풀 수 있어요!');
    if (st.finished) return showEnding(false);
    if (curDef().c !== prevC) countryComplete(prevC, () => { syncScene(); refreshAll(); queueTalk('complete'); });
    else { syncScene(); refreshAll(); queueTalk('complete'); }
  };
  refreshAll();
}
function countryComplete(cid, then) {
  const c = COUNTRIES.find((x) => x.id === cid), next = COUNTRIES[countryIdxOf(curDef())];
  A.sfx('fanfare');
  const m = openModal({ title: '🗺️ 지도 완성!', body: h('div', { class: 'col', style: { textAlign: 'center' } },
    h('div', { style: { fontSize: '60px' } }, c.flag),
    h('div', { class: 'conf-title' }, `${c.name} 지도 완성!`),
    h('div', {}, `${COMPANY}의 이름이 ${c.name}에 새겨졌어요.`),
    h('div', { class: 'fb' }, `다음 나라: ${next.flag} ${next.name} — ${BUILDINGS.filter((b) => b.c === next.id).map((b) => b.name).join(', ')}`),
    st.track === 'student' && curDef().id === 'pyramid' ? h('div', { class: 'fb good' }, '🎓 퀴즈 난이도가 "건축기사 입문"으로 올라가요!') : null,
    st.track === 'student' && curDef().id === 'arc' ? h('div', { class: 'fb good' }, '🎓 퀴즈 난이도가 "건축기사 실전"으로 올라가요!') : null,
    h('button', { class: 'btn primary big', onclick: () => m.close() }, `${next.name}(으)로 출발! ✈️`)) });
  m.onClose = then;
}

/* ---------------- 브리핑 ---------------- */
function showBriefing(then) {
  const w = todayWx(), d = describe(w), ef = effect(w), def = curDef();
  const s = statusText(true);
  const talk = shuffle(BRIEF_TALK).slice(0, 2);
  const sched = h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, '건물'), h('th', {}, '공기'), h('th', {}, '마감 / 상태')));
  BUILDINGS.forEach((b, i) => {
    const c = COUNTRIES.find((x) => x.id === b.c);
    let stTxt;
    if (i < st.bIdx || st.finished) stTxt = '준공 ✅';
    else if (i === st.bIdx) stTxt = st.started ? ddayText().replace('마감 ', '') : '착공 전';
    else stTxt = '-';
    sched.append(h('tr', { class: i === st.bIdx && !st.finished ? 'cur' : '' }, h('td', {}, `${c.flag} ${b.name}`), h('td', {}, `${b.days}일`), h('td', {}, stTxt)));
  });
  const todo = [[`직접 작업 ${ACTIONS_PER_DAY - st.actionsLeft}/${ACTIONS_PER_DAY}`, st.actionsLeft === 0]];
  (MG[st.track] || MG.student).forEach((g) => todo.push([`${g.icon} ${g.name}`, !!st.todo.done?.[g.id]]));
  // 오늘 예상 이벤트 층
  let expect = null;
  if (st.started && !st.finished && !ef.stop && !FLOORS[def.id]?.walk) {
    const f1 = Math.max(1, currentFloor(def, actual()));
    const f2 = Math.max(f1, currentFloor(def, Math.min(1, (st.progress + rates().total * st.actionsLeft) / def.work)));
    const ph = curPhase();
    const lab = f1 === f2 ? floorLabel(def.id, f1) : FLOORS[def.id]?.zones ? `${floorLabel(def.id, f1)}~${floorLabel(def.id, f2)}` : `${f1}~${f2}층`;
    expect = `📍 오늘 ${PHASES[ph]} ${lab} ${ph === 1 ? '타설 예정' : '작업 예정'} — 이 층들에서 무전이 올 수 있어요${effect(w).craneStop || w.wind >= 8 ? ' (강풍: 외부 비계·자재 결속 이벤트 주의)' : ''}`;
  }
  const nightLine = nightReportLine(st);
  if (st.todo.hadConflict || st.conflict != null) todo.push(['현장 갈등 해결', st.conflict == null]);
  const pl = planned(true), a = actual();
  const m = openModal({ title: `☀️ 오늘의 현장 브리핑`, body: h('div', { class: 'col' },
    h('div', { class: 'brief-date' }, `${st.day}일차 · ${fmtDate(dateOf(st.day))}`),
    h('div', { class: 'brief-wx' }, h('div', { class: 'big' }, d.icon), h('div', {},
      h('b', {}, `${CITIES.find((c) => c.id === st.city).name} ${d.name} · ${Math.round(w.tmin)}° / ${Math.round(w.tmax)}° · 💧${w.rain}mm · 🌬${w.wind}m/s`),
      h('div', { class: 'tiny muted' }, isLive() && w.live ? 'Open-Meteo 실시간 예보' : '⚠️ 예보 연결 실패/범위 밖 → 계절 기반 가상 예보'),
      h('ul', {}, ef.notes.map((n) => h('li', {}, n))))),
    ef.stop ? h('div', { class: 'status late' }, '⛔ 오늘은 공사 중지! 부업과 퀘스트로 돈을 벌어 보세요') : null,
    h('div', { class: 'fb' },
      h('div', {}, h('b', {}, `${COUNTRIES[countryIdxOf(def)].flag} ${st.finished ? '세계 일주 완료' : def.name}`), ' · ', ddayText()),
      h('div', { class: 'barrow' }, h('span', {}, '계획'), h('div', { class: 'bar plan' }, h('i', { style: { width: pl * 100 + '%' } })), h('em', {}, Math.round(pl * 100) + '%')),
      h('div', { class: 'barrow' }, h('span', {}, '실적'), h('div', { class: 'bar act' }, h('i', { style: { width: a * 100 + '%' } })), h('em', {}, Math.round(a * 100) + '%'))),
    h('div', { class: 'status ' + s.c }, s.t),
    expect ? h('div', { class: 'fb' }, expect) : null,
    nightLine ? h('div', { class: 'fb night' }, nightLine, ...(st.morning || []).map((t) => h('div', { class: 'tiny minus' }, '→ ' + t))) : null,
    st.events.length ? h('div', { class: 'fb bad' }, '🚨 아직 해결 못 한 층별 문제: ' + st.events.map((e) => `${floorLabel(def.id, e.floor)} ${SHORT[e.id]}(남은 작업 ${e.left}회)`).join(', ')) : null,
    h('div', { class: 'chat' }, talk.map(([who, t]) => h('div', { class: 'msg' }, h('b', {}, who), h('div', { class: 'say' }, t)))),
    h('div', { class: 'sec' }, '공사 일정표'),
    h('div', { class: 'schedule' }, sched),
    h('div', { class: 'sec' }, '오늘의 할 일'),
    h('ul', { class: 'todo' }, todo.map(([t, done]) => h('li', { class: done ? 'done' : '' }, h('span', {}, t), h('span', {}, done ? '✔' : '○')))),
    h('button', { class: 'btn primary big', onclick: () => m.close() }, '출근하기! 🦺')) });
  m.onClose = () => {
    then?.();
    if (!st.test.pre && !st.preAsked) {
      st.preAsked = true; save();
      const q = openModal({ title: '📋 이해도 사전 테스트', body: h('div', { class: 'col' },
        h('div', {}, '게임을 하기 전에 6문제로 지금 알고 있는 것을 확인해요. 건물을 1개 이상 지은 뒤 같은 문제로 사후 테스트를 하고 점수를 비교해요.'),
        h('div', { class: 'tiny muted' }, '사전 테스트는 정답을 공개하지 않아요.'),
        h('div', { class: 'grid2' }, h('button', { class: 'btn', onclick: () => q.close() }, '나중에 (퀘스트 탭)'), h('button', { class: 'btn primary', onclick: () => { q.close(); runTest('pre'); } }, '지금 풀기'))) });
    }
  };
}

function showForecast() {
  const body = h('div', { class: 'col' });
  const render = () => {
    body.innerHTML = '';
    body.append(h('div', { class: 'set-row' }, h('span', {}, '도시'), h('div', { class: 'seg' }, CITIES.map((c) => h('button', { class: c.id === st.city ? 'on' : '', onclick: async () => {
      st.city = c.id; save(); body.querySelector('.seg').style.opacity = .5;
      await fetchForecast(st.city); render(); refreshAll(); S.setWeather(describe(todayWx()).kind);
    } }, c.name)))));
    body.append(h('div', { class: 'tiny ' + (isLive() ? '' : 'muted') }, isLive() ? '🛰️ Open-Meteo 실시간 일별 예보와 연결됨 (게임 1일차 = 시작한 실제 날짜)' : '⚠️ 예보 연결 실패 → 계절 기반 가상 예보로 대체 중'));
    for (let k = 0; k < 5; k++) {
      const day = st.day + k, w = getWeather(dateOf(day)), d = describe(w), ef = effect(w);
      body.append(h('div', { class: 'wxday' + (ef.stop ? ' stop' : '') },
        h('div', {}, h('b', {}, k === 0 ? '오늘' : `${day}일차`), h('div', { class: 'tiny' }, fmtDate(dateOf(day)))),
        h('div', { class: 'ic' }, d.icon),
        h('div', {}, h('div', {}, `${d.name} ${Math.round(w.tmin)}°/${Math.round(w.tmax)}° · 💧${w.rain}mm · 🌬${w.wind}m/s${w.live ? '' : ' (가상)'}`),
          h('div', { class: 'tiny ' + (ef.stop ? 'minus' : 'muted') }, ef.notes.join(' / ')))));
    }
  };
  render();
  openModal({ title: '🌤️ 5일 예보', body });
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
  const titles = { shop: '🛒 상점', side: '💼 부업', quest: '📋 퀘스트', together: '🤝 함께 짓기', map: '🗺️ 세계지도' };
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
  body.append(h('div', { class: 'tiny muted' }, `작업 1회 = 내 몫 ${Math.round(r.my)} + 인부 ${st.workers}명 × 3 × 장비 ${r.eq.toFixed(1)} × 사기 ${r.moraleMult.toFixed(2)}${st.conflict != null ? ' × 갈등 0.7' : ''}${r.robot ? ' + 로봇 40' : ''} × 날씨 ${r.ef.mult.toFixed(2)} = ${r.total}블록`));
  body.append(h('div', { class: 'sec' }, '인부 고용'));
  const hc = hireCost(st.workers);
  body.append(itemRow('👷', `인부 고용 (${st.workers}/${MAX_WORKERS}명)`, '작업 1회마다 인부 1명당 3블록 × 장비 배율', st.workers >= MAX_WORKERS ? '만원' : won(hc), () => {
    if (st.money < hc) return toast('돈이 부족해요', 'bad');
    st.money -= hc; st.workers++; st.stats.hires++;
    S.setWorkers(st.workers); A.sfx('coin');
    setTimeout(() => S.say(LINES.hired[0], st.workers - 1), 300);
    toast(`👷 ${WORKER_NAMES[(st.workers - 1) % WORKER_NAMES.length]} 합류!`);
    save(); refreshAll();
  }, { disabled: st.workers >= MAX_WORKERS }));
  body.append(h('div', { class: 'sec' }, '공구 (내 몫)'));
  TOOLS.forEach((t, i) => {
    const owned = has('tools', t.id), prevOk = i === 0 || has('tools', TOOLS[i - 1].id);
    body.append(itemRow(t.icon, t.name, t.desc, owned ? '보유' : won(t.price), () => buy('tools', t), { owned, disabled: owned || !prevOk, locked: !prevOk }));
  });
  body.append(h('div', { class: 'sec' }, '장비 (인부 몫 배율)'));
  EQUIP.forEach((e) => {
    const owned = has('equip', e.id);
    body.append(itemRow(e.icon, e.name, e.desc, owned ? '보유' : won(e.price), () => buy('equip', e), { owned, disabled: owned }));
  });
  const def = curDef();
  if (needsHoist(def.id) && !st.finished) {
    body.append(h('div', { class: 'sec' }, '현장 설비'));
    const hp = hoistPrice(st.bIdx), own = hasHoist();
    body.append(itemRow('🔼', `건설용 리프트(호이스트) · ${def.name}`, st.started ? '건물 옆 마스트+운반구. 층별 문제를 빠르게 해결 (없으면 계단: 작업 횟수·사기 소모)' : '🔒 착공하면 설치할 수 있어요', own ? '설치됨' : won(hp), () => {
      if (st.money < hp) return toast('돈이 부족해요', 'bad');
      st.money -= hp; st.hoist = st.bIdx; st.stats.hoists++; A.sfx('build'); S.setHoist(true);
      toast('🔼 호이스트 설치! 건물 옆 리프트를 누르면 탑승해요'); S.say('호이스트 마스트 세웠습니다!');
      save(); refreshAll();
    }, { owned: own, disabled: own || !st.started, locked: !st.started }));
  }
  body.append(h('div', { class: 'sec' }, '후반부 장비'));
  LATE_ITEMS.forEach((e) => {
    const owned = has('late', e.id), locked = st.bIdx < e.minStage;
    body.append(itemRow(e.icon, e.name, locked ? `🔒 ${BUILDINGS[e.minStage].name}부터 판매` : e.desc, owned ? '보유' : won(e.price), () => buy('late', e), { owned, locked, disabled: owned || locked }));
  });
}
function buy(list, item) {
  if (st.money < item.price) return toast('돈이 부족해요', 'bad');
  st.money -= item.price; st[list].push(item.id); A.sfx('coin');
  toast(`${item.icon} ${item.name} 구입!`);
  if (item.id === 'crane') { S.setCrane(true, todayEf().craneStop); S.say('크레인 섰다! 양중 시작합니다', 0); note('lifting'); }
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
  const games = MG[st.track] || MG.student;
  if (ef.stop) body.append(h('div', { class: 'status late' }, '⛔ 오늘은 공사 중지! 부업으로 돈을 벌어 보세요'));
  body.append(h('div', { class: 'tiny muted' }, `${st.track === 'field' ? '🦺 현장 첫 출근' : '🎓 학생'} 트랙 미니게임 · 보상은 현장 단계가 오를수록 커져요 (현재 ×${sm.toFixed(1)})`));
  body.append(h('div', { class: 'sec' }, '오늘의 부업'));
  games.forEach((g) => {
    const left = st.mg[g.id] ?? 0;
    let sub = `${g.desc} · 남은 ${left}/${g.per}회`;
    if (g.id === 'quiz') sub = `5문제 · 난이도: ${QUIZ_LEVELS[quizLevelFor(st.track, st.bIdx)]} · 남은 ${left}/${g.per}회`;
    if (g.id === 'fquiz') sub = `${g.desc} · ${LANGS.find((l) => l.id === st.lang)?.name || '한국어'} · 남은 ${left}/${g.per}회`;
    body.append(itemRow(g.icon, g.name + (g.move ? ' 🕹️' : ''), sub, st.todo.done?.[g.id] && left <= 0 ? '완료' : '시작', () => startGame(g), { disabled: left <= 0 }));
  });
  body.append(h('div', { class: 'sec' }, '현장 일'));
  if (st.conflict != null) {
    const c = CONFLICTS[st.conflict];
    body.append(itemRow('⚠️', `갈등: ${c.title}`, '해결 전엔 인부 작업량 -30%', '해결하기', () => {
      closeSheet();
      const m = runConflict(c, (s) => {
        st.conflict = null; st.todo.conflictDone = true; st.stats.conflicts++;
        st.morale = Math.max(0, Math.min(100, st.morale + (s === 2 ? 8 : s === 1 ? 2 : -8)));
        note('conflict');
        if (s === 2) earn(Math.round(4 * sm), '갈등 해결 보너스'); else { save(); refreshAll(); }
      });
      m.onClose = () => refreshAll();
    }));
  } else body.append(h('div', { class: 'tiny muted' }, '지금은 현장 갈등이 없어요. 날이 바뀔 때 생길 수 있어요.'));
  if (st.events.length) st.events.forEach((e) => body.append(itemRow('🚨', `${floorLabel(curDef().id, e.floor)} ${SHORT[e.id]}`, `남은 작업 ${e.left}회 안에 가서 해결`, '가기', () => { closeSheet(); goToFloor(ctx, e.floor); })));
  body.append(itemRow('🎁', '선물 말풍선 줍기', `인부 머리 위 노란 말풍선을 눌러요 · 오늘 남은 ${st.gifts}/3회`, null));
  if (st.track === 'field') {
    body.append(h('div', { class: 'sec' }, '현장 첫 출근 트랙'));
    body.append(itemRow('🦺', '첫 출근 안전 코스 다시 하기', `언어: ${LANGS.find((l) => l.id === st.lang)?.name || '한국어'}${st.safety.record ? ` · 지난 기록 ${st.safety.record.score}/6` : ''}`, '시작', () => { closeSheet(); openSafety(); }));
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
  body.append(h('div', { class: 'sec' }, '소장님 지시'));
  st.quests.forEach((q, i) => {
    const d = questDef(q), p = Math.min(d.n, questProgress(q)), ok = p >= d.n;
    body.append(itemRow(ok ? '✅' : '📌', d.t, `${p}/${d.n} · 보상 ${won(Math.round(d.reward * stageMult()))}`, ok ? '받기' : '진행 중', () => {
      const amt = Math.round(d.reward * stageMult());
      st.quests.splice(i, 1); st.doneQuests = [...(st.doneQuests || []), d.id];
      fillQuests(); earn(amt, `지시 완료: ${d.t}`);
    }, { disabled: !ok, extra: h('div', { class: 'pbar' }, h('i', { style: { width: (p / d.n * 100) + '%' } })) }));
  });
  // 이해도 테스트
  body.append(h('div', { class: 'sec' }, '이해도 테스트 (사전 · 사후)'));
  const pre = st.test.pre, post = st.test.post;
  body.append(itemRow('📝', '사전 테스트', pre ? `완료 · ${pre.score}/6 (${pre.day}일차)` : '게임 전 내 지식 확인 · 6문제 · 정답 비공개', pre ? '완료' : '풀기', () => runTest('pre'), { disabled: !!pre }));
  const canPost = pre && st.completed.length >= 1;
  body.append(itemRow('🎯', '사후 테스트', post ? `완료 · ${post.score}/6 (${post.day}일차)` : canPost ? '같은 6문제로 다시 확인' : (pre ? '건물을 1개 이상 준공하면 열려요' : '사전 테스트 먼저'), post ? '다시 풀기' : '풀기', () => runTest('post'), { disabled: !canPost }));
  if (pre) {
    const box = h('div', { class: 'fb' });
    box.append(h('div', { class: 'cmp' }, h('span', {}, '사전'), h('div', { class: 'bar' }, h('i', { style: { width: pre.score / 6 * 100 + '%' } })), h('b', {}, `${pre.score}/6`)));
    if (post) {
      box.append(h('div', { class: 'cmp' }, h('span', {}, '사후'), h('div', { class: 'bar post' }, h('i', { style: { width: post.score / 6 * 100 + '%' } })), h('b', {}, `${post.score}/6`)));
      const d = post.score - pre.score;
      box.append(h('div', { class: 'tiny' }, d > 0 ? `📈 ${d}문제 더 맞혔어요! 게임으로 배운 효과예요.` : d === 0 ? '점수가 같아요. 배움 노트를 다시 읽어 봐요.' : '점수가 내려갔어요. 배움 노트를 복습해 봐요.'));
    }
    body.append(box);
  }
  // 배움 노트
  const myNotes = notesFor(st.track);
  const n = myNotes.filter((x) => st.notes[x.id]).length;
  body.append(h('div', { class: 'sec' }, `배움 노트 ${n}/${myNotes.length}`));
  if (st.nearMiss.length) body.append(h('div', { class: 'tiny minus' }, `아차사고 기록 ${st.nearMiss.length}건 (이번 건물 ${st.bNearMiss || 0}건) — 층별 위험 이벤트를 제때 해결하면 줄어요`));
  myNotes.forEach((x) => body.append(h('div', { class: 'note' + (st.notes[x.id] ? ' on' : '') },
    h('b', {}, (st.notes[x.id] ? '✅ ' : '⬜ ') + x.t), st.notes[x.id] ? h('span', { class: 'tiny muted' }, ` · ${st.notes[x.id]}일차`) : null,
    h('div', { class: 'tiny' }, st.notes[x.id] ? x.d : '아직 경험하지 않았어요'))));
}
function runTest(kind) {
  const answers = [];
  let i = 0;
  const m = openModal({ title: kind === 'pre' ? '📝 사전 테스트' : '🎯 사후 테스트', body: '' });
  const show = () => {
    if (i >= TEST.length) return end();
    const q = TEST[i];
    const fb = h('div');
    const btns = q.o.map((o, k) => h('button', { class: 'btn opt', onclick: (e) => {
      answers.push(k);
      if (kind === 'pre') { A.sfx('tap'); i++; show(); return; }
      btns.forEach((b) => (b.disabled = true));
      if (k === q.a) { A.sfx('good'); e.currentTarget.classList.add('right'); } else { A.sfx('bad'); e.currentTarget.classList.add('wrong'); btns[q.a].classList.add('right'); }
      fb.append(h('button', { class: 'btn primary', onclick: () => { i++; show(); } }, '다음'));
    } }, o));
    m.setBody(h('div', { class: 'col' }, h('div', { class: 'qhead' }, h('span', {}, kind === 'pre' ? '정답은 사후 테스트 때 공개돼요' : '사후 테스트'), h('span', {}, `${i + 1} / 6`)), h('div', { class: 'qtext' }, q.q), h('div', { class: 'col gap6' }, btns), fb));
  };
  const end = () => {
    const score = answers.filter((a, k) => a === TEST[k].a).length;
    st.test[kind] = { score, day: st.day, answers };
    save(); refreshAll();
    A.sfx('fanfare');
    const pre = st.test.pre;
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'big-score' }, `${score} / 6`),
      kind === 'pre' ? h('div', { class: 'fb' }, '사전 테스트 완료! 건물을 1개 이상 지은 뒤 퀘스트 탭에서 사후 테스트를 풀어 비교해 보세요.')
        : h('div', { class: 'fb good' }, `사전 ${pre.score}/6 → 사후 ${score}/6 (${score - pre.score >= 0 ? '+' : ''}${score - pre.score})`),
      h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')));
  };
  show();
}

function tabTogether(body) {
  const mode = netMode();
  body.append(h('div', { class: 'fb ' + (mode === 'firebase' ? 'good' : '') },
    mode === 'firebase' ? '🟢 Firebase에 연결됨 — 같은 앱을 켠 친구들이 실시간으로 보여요'
      : mode === 'local' ? '🟡 같은 기기 테스트 모드 — 이 기기의 다른 탭과 연결돼요 (firebase-config.js에 DB 주소를 넣으면 온라인 연결)'
        : '⚪ 오프라인 — 혼자 하기만 할 수 있어요'));
  body.append(h('div', { class: 'tiny muted' }, `내 닉네임: ${st.nick} · 오늘 도와주기 ${st.helpsLeft}/10회`));
  const list = onlineFriends();
  body.append(h('div', { class: 'sec' }, `지금 접속한 친구 ${list.length}명`));
  if (!list.length) body.append(h('div', { class: 'tiny muted' }, '아직 접속한 친구가 없어요. 친구에게 앱을 공유해 보세요!'));
  list.forEach((f) => {
    body.append(h('div', { class: 'item' },
      h('div', { class: 'ic' }, f.flag || '👷'),
      h('div', { class: 'tx' }, h('b', {}, f.nick), h('small', {}, `${f.country || ''} · ${f.building || ''} ${f.progress ?? 0}% · 준공 ${f.completes || 0}개`)),
      h('div', { class: 'col gap6' },
        h('button', { class: 'btn primary', disabled: st.helpsLeft <= 0, onclick: async () => {
          const ok = await sendTo(f.id, { type: 'help', nick: st.nick });
          if (!ok) return toast('보내지 못했어요. 인터넷을 확인해 주세요', 'bad');
          st.helpsLeft--; st.stats.helps++;
          earn(Math.round(1 + stageMult()), `${f.nick}님 현장 도와주기 수고비`);
        } }, '도와주기'),
        h('button', { class: 'btn', onclick: () => chatPicker(f) }, '한마디'))));
  });
  if (list.length) {
    body.append(h('div', { class: 'sec' }, '모두에게 한마디'));
    body.append(h('div', { class: 'seg' }, QUICK_CHAT.map((t) => h('button', { onclick: () => { list.forEach((f) => sendTo(f.id, { type: 'chat', nick: st.nick, text: t })); S.say(t, 'me'); toast('💬 보냈어요'); } }, t))));
  }
}
function chatPicker(f) {
  const m = openModal({ title: `💬 ${f.nick}에게`, body: h('div', { class: 'grid2' }, QUICK_CHAT.map((t) => h('button', { class: 'btn', onclick: () => { sendTo(f.id, { type: 'chat', nick: st.nick, text: t }); S.say(t, 'me'); m.close(); toast('💬 보냈어요'); } }, t))) });
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
  body.append(h('div', { class: 'tiny muted' }, '🟩 완성한 나라 · 🟨 진행 중인 나라'));
  const curCi = countryIdxOf(curDef());
  body.append(h('div', { class: 'sec' }, '9개국 22개 건축물'));
  COUNTRIES.forEach((c, ci) => {
    const done = st.finished || ci < curCi, prog = !st.finished && ci === curCi;
    const bl = BUILDINGS.filter((b) => b.c === c.id);
    const doneN = bl.filter((b) => BUILDINGS.indexOf(b) < st.bIdx || st.finished).length;
    body.append(itemRow(c.flag, c.name, bl.map((b) => b.name).join(' · '), done ? '보기' : null, () => viewCountry(ci),
      { extra: h('span', { class: 'badge ' + (done ? 'done' : prog ? 'prog' : 'lock') }, done ? '지도 완성' : prog ? `진행 중 ${doneN}/${bl.length}` : '잠김'), primary: false }));
  });
  // 설정
  body.append(h('div', { class: 'sec' }, '설정'));
  body.append(h('div', { class: 'set-row' }, h('span', {}, '트랙'), h('div', { class: 'seg' },
    h('button', { class: st.track === 'student' ? 'on' : '', onclick: () => { if (st.track !== 'student') { st.track = 'student'; st.mg = mgDefaults('student'); st.quests = st.quests.filter((q) => !QUESTS.find((x) => x.id === q.id)?.tr); } save(); toast('🎓 학생 트랙 — 퀴즈가 진행에 따라 깊어져요'); renderTab('map'); } }, '🎓 학생'),
    h('button', { class: st.track === 'field' ? 'on' : '', onclick: () => { if (st.track !== 'field') { st.track = 'field'; st.mg = mgDefaults('field'); st.quests = st.quests.filter((q) => !QUESTS.find((x) => x.id === q.id)?.tr); } save(); toast('🦺 현장 첫 출근 트랙'); renderTab('map'); if (!st.safety.done) { closeSheet(); openSafety(); } } }, '🦺 현장 첫 출근'))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, '안전 코스 언어'), h('div', { class: 'seg' }, LANGS.map((l) => h('button', { class: st.lang === l.id ? 'on' : '', onclick: () => { st.lang = l.id; save(); renderTab('map'); } }, l.name)))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, '날씨 도시'), h('div', { class: 'seg' }, CITIES.map((c) => h('button', { class: st.city === c.id ? 'on' : '', onclick: async () => { st.city = c.id; save(); await fetchForecast(st.city); S.setWeather(describe(todayWx()).kind); refreshAll(); } }, c.name)))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, '소리'), h('div', { class: 'seg' },
    h('button', { class: st.music ? 'on' : '', onclick: () => { toggleMusic(); renderTab('map'); } }, `🎵 음악 ${st.music ? '켜짐' : '꺼짐'}`),
    h('button', { class: st.sfx ? 'on' : '', onclick: () => { st.sfx = !st.sfx; A.setPrefs(st.music, st.sfx); save(); renderTab('map'); } }, `🔊 효과음 ${st.sfx ? '켜짐' : '꺼짐'}`))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, '닉네임'), h('div', { class: 'seg' }, h('button', { onclick: () => {
    const v = prompt('새 닉네임 (10자 이내)', st.nick); if (v && v.trim()) { st.nick = v.trim().slice(0, 10); save(); publishNow(); renderTab('map'); }
  } }, `${st.nick} ✏️`))));
  body.append(h('div', { class: 'set-row' }, h('span', {}, '처음부터 다시'), h('div', { class: 'seg' }, h('button', { onclick: () => {
    if (confirm('모든 진행 기록을 지우고 처음부터 시작할까요?')) { wipe(); location.reload(); }
  } }, '🗑️ 초기화'))));
  body.append(h('div', { class: 'tiny muted', style: { marginTop: '8px' } }, `첫 삽 · ${COMPANY} · 건설업 사고 사망자의 82.3%가 근속 6개월 미만(2025, 안전보건공단). 이 게임은 입문 교육을 돕는 연습 도구이며 법정 안전교육을 대신하지 않아요.`));
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
    h('b', {}, `${c.flag} ${c.name} 지도`),
    h('button', { class: 'btn', onclick: () => { fi = (fi + 1) % list.length; S.focusOn(fi); } }, '▶'),
    h('button', { class: 'btn primary', onclick: () => { syncScene(); } }, '내 현장으로'));
  $('#app').append(bar);
}

/* ---------------- 안전 코스 ---------------- */
function openSafety(then) {
  const m = runSafetyCourse({ nick: st.nick, lang: st.lang, onNote: note, onDone: (rec, lang) => {
    st.safety = { done: true, record: rec }; st.lang = lang; save();
    toast(`🦺 연습 기록 저장: ${rec.score}/6`);
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
      S.giftBubble(`고철 주웠어요! 팔까요? +${n}만원`, () => {
        if (st.gifts <= 0) return;
        st.gifts--; earn(n, '고철 판매');
      });
    }
  }
  if (talkQueued && !anyModal()) { const t = talkQueued; talkQueued = null; openTalk(t); }
}

/* ---------------- 함께 짓기 ---------------- */
function presenceInfo() {
  const def = curDef(), c = COUNTRIES[countryIdxOf(def)];
  return { nick: st.nick, flag: c.flag, country: c.name, building: st.finished ? '세계 일주 완료' : def.name, progress: Math.round(actual() * 100), completes: st.completed.length, day: st.day, building_on: st.started };
}
function onNetMessage(msg) {
  if (msg.type === 'help') {
    if (st.started && !st.finished && !todayEf().stop) {
      const amt = Math.round(20 * stageMult());
      st.progress = Math.min(curDef().work - 1, st.progress + amt);
      updateCurrentBlocks(true);
      toast(`🤝 ${msg.nick}님이 도와줬어요! +${amt}블록`);
    } else {
      st.money += 5; toast(`🤝 ${msg.nick}님의 응원금 +5만원`);
    }
    S.friendSay(msg.from, '도와줄게요!');
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
  if (lastFriendCount >= 0 && list.length > lastFriendCount) toast('👋 친구가 접속했어요!');
  lastFriendCount = list.length;
  if (curTab === 'together') renderTab('together');
}

/* ---------------- 시연 모드 ---------------- */
async function toggleDemo() {
  if (!demo) {
    demoSnap = JSON.stringify(st);
    demo = true; walkActive()?.end(true); closeAllModals(); closeSheet(); $('#radio')?.remove();
    $('#demoBtn').classList.add('on'); $('#demoBtn').textContent = '■ 시연 종료';
    toast('▶ 시연 모드: 남은 건물을 차례로 자동 시공해요');
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
      toast(`🎉 ${def.name} 준공!`);
      st.completed.push({ id: def.id, day: st.day, late: 0, ext: 0, total: def.reward });
      st.day += def.days;
      const prevC = def.c;
      st.bIdx++; st.progress = 0; st.started = false;
      if (st.bIdx >= BUILDINGS.length) { st.finished = true; st.bIdx = BUILDINGS.length - 1; st.progress = def.work; refreshAll(); break; }
      if (curDef().c !== prevC) {
        const c = COUNTRIES.find((x) => x.id === prevC);
        toast(`${c.flag} ${c.name} 지도 완성!`);
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
    $('#demoBtn').classList.remove('on'); $('#demoBtn').textContent = '▶ 시연 모드';
    closeAllModals(); syncScene(); refreshAll();
    toast('🔨 직접 짓기로 돌아왔어요');
  }
}
function showEnding(isDemo) {
  A.sfx('fanfare');
  const myNotes = notesFor(st.track);
  const n = myNotes.filter((x) => st.notes[x.id]).length;
  const m = openModal({ title: '🏆 세계 일주 완공!', body: h('div', { class: 'col ending' },
    h('div', { class: 'logo' }, '첫 삽'),
    h('div', { class: 'conf-title' }, `${COMPANY}, 9개국 22개 건축물 완공!`),
    h('div', {}, '강아지집에서 시작해 사그라다 파밀리아까지. 모든 건물은 기초 → 골조 → 외장 → 마감, 그리고 안전에서 시작했어요.'),
    h('div', { class: 'settle' },
      h('div', { class: 'r' }, h('span', {}, '준공한 건물'), h('b', {}, `${st.completed.length}개`)),
      h('div', { class: 'r' }, h('span', {}, '걸린 날'), h('b', {}, `${st.day}일`)),
      h('div', { class: 'r' }, h('span', {}, '배움 노트'), h('b', {}, `${n}/${myNotes.length}`)),
      h('div', { class: 'r' }, h('span', {}, '아차사고'), h('b', {}, `${st.nearMiss.length}건`)),
      st.test.pre ? h('div', { class: 'r' }, h('span', {}, '이해도 테스트'), h('b', {}, `사전 ${st.test.pre.score}/6${st.test.post ? ` → 사후 ${st.test.post.score}/6` : ''}`)) : null),
    h('div', { class: 'tiny muted' }, '첫 삽 — 게임으로 시작하는 건설 입문 교육'),
    h('button', { class: 'btn primary big', onclick: () => { m.close(); if (isDemo) toggleDemo(); } }, isDemo ? '직접 짓기로 돌아가기' : '현장 둘러보기')) });
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
  A.setPrefs(st.music, st.sfx);
  document.body.classList.add('intro-on');
  S.initScene($('#gl'), $('#labels'));
  S.playIntro();
  setTimeout(() => $('.logo').classList.add('show'), 2600);
  refreshTop();
  fetchForecast(st.city).then(() => { refreshAll(); if (!$('#intro')) S.setWeather(describe(todayWx()).kind); });
  if (saved && saved.track) {
    const ci = $('#introCont');
    ci.textContent = `📅 ${st.day}일차 · ${st.finished ? '세계 일주 완료' : curDef().name} 이어하기`;
    ci.classList.remove('hidden');
  }
  $('#nickInput').value = st.nick || '';
  $('#introMusic').onclick = () => toggleMusic();
  $('#trackStudent').onclick = () => enter('student');
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
  const nick = $('#nickInput').value.trim().slice(0, 10) || st.nick || `소장${Math.floor(100 + Math.random() * 900)}`;
  st.nick = nick;
  if (st.track !== track || !Object.keys(mgDefaults(track)).every((k) => k in st.mg)) st.mg = mgDefaults(track);
  st.track = track;
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
  if (track === 'field' && !st.safety.done) openSafety(() => showBriefing());
  else showBriefing();
}

// 자동 점검용 훅 (tools/smoke2.mjs)
window.__cheotsap = { get st() { return st; }, ctx, walk: walkActive, addEvent: (id, f) => addEvent(ctx, id, f), goToFloor: (f) => goToFloor(ctx, f), night: () => nightCard(ctx, advanceDay), endOfDay: () => endOfDay(), refresh: () => refreshAll(), sync: () => syncScene() };
// 불러오기가 끝나기 전에는 저장하지 않음 (빈 상태로 덮어쓰기 방지)
let booted = false;
window.addEventListener('visibilitychange', () => { if (document.hidden && booted && !demo) saveNow(st); });
boot();
