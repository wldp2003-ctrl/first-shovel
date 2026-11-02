// 층 계산 · 호이스트(건설용 리프트) 탑승 · 계단 · 층별 현장 이벤트
import * as THREE from 'three';
import { buildModel } from './models.js';
import { EVENTS, FIELD_ACTS, FIELD_UI, floorCount, floorLabel, floorButtons, needsHoist, HOIST_PLATE, FLOORS } from './data2.js';
import { openWalk, props } from './walk.js';
import * as S from './scene.js';
import { h, $, openModal, toast, shuffle, sleep, won } from './ui.js';
import { sfx } from './audio.js';

export const SHORT = { shore: '동바리 처짐', spacer: '스페이서 누락', pump: '펌프카 배관 막힘', overload: '슬래브 자재 과적재', rail: '안전난간 해체', hole: '개구부 덮개 빠짐', windscaf: '강풍 중 비계 작업', fire: '용접 불티 옆 가연물', confined: '밀폐공간 어지럼', leak: '창호 주변 누수', helmet: '안전모 미착용', heavy: '혼자 중량물 들기', wire: '전선 피복 벗겨짐', bind: '강풍에 자재 흩어짐', fireAlarm: '작은 화재 경보' };
export const evDef = (id) => EVENTS.find((e) => e.id === id);

/* ---------- 층 계산 ---------- */
const prefix = new Map();
function maxYPrefix(id) {
  if (!prefix.has(id)) {
    const m = buildModel(id); const arr = new Float32Array(m.blocks.length + 1); let my = 0;
    m.blocks.forEach((b, k) => { if (b[1] > my) my = b[1]; arr[k + 1] = my; });
    prefix.set(id, { arr, h: m.size.h, n: m.blocks.length });
  }
  return prefix.get(id);
}
// 지금 시공 중인 층 (0 = 착공 전)
export function currentFloor(def, actualFrac) {
  const p = maxYPrefix(def.id);
  const k = Math.floor(Math.max(0, Math.min(1, actualFrac)) * p.n);
  if (k <= 0) return 0;
  const n = floorCount(def.id);
  return Math.max(1, Math.min(n, Math.ceil((p.arr[k] + 1) / p.h * n)));
}
export function floorText(def, f, phaseName) {
  if (!f) return null;
  if (FLOORS[def.id]?.walk) return `${phaseName} 시공 중`;
  return `${phaseName} ${floorLabel(def.id, f)} 시공 중`;
}

/* ---------- 무전기 알림 배너 ---------- */
export function radioBanner(text, onGo) {
  $('#radio')?.remove();
  sfx('radio');
  const el = h('div', { id: 'radio', class: 'radio' }, h('span', { class: 'ric' }, '📻'), h('div', { class: 'rtx' }, h('small', {}, '무전 · 김반장'), h('b', {}, text)),
    onGo ? h('button', { class: 'btn primary', onclick: () => { el.remove(); onGo(); } }, '가기') : null,
    h('button', { class: 'x', onclick: () => el.remove() }, '✕'));
  $('#app').append(el);
  setTimeout(() => el.classList.add('out'), 6500);
  setTimeout(() => el.remove(), 7000);
}

/* ---------- 이벤트 생성 · 진행 ---------- */
export function maybeEvent(ctx) {
  const { st } = ctx;
  if (!st.started || st.finished || ctx.demo() || st.bIdx === 0) return null; // 첫 건물(튜토리얼)은 이벤트 없음
  if (st.evToday >= st.evCap || st.events.length >= 2) return null;
  if (Math.random() > 0.2) return null;
  const def = ctx.curDef(), f = currentFloor(def, ctx.actual());
  if (f < 1) return null;
  if (st.evShield > 0) { st.evShield--; st.evToday++; toast('🌙 어젯밤 당직 점검 덕분에 오늘 생길 문제 하나를 미리 막았어요!', 'note'); return null; }
  const ph = ctx.curPhase(), wind = ctx.wind();
  const pool = [];
  EVENTS.forEach((e) => {
    if (e.ph === 'x') return;
    if (e.ph !== 'c' && e.ph !== ph) return;
    if (st.events.some((x) => x.id === e.id)) return;
    if (e.basement && (FLOORS[def.id]?.walk || floorCount(def.id) < 4)) return;
    let w = 1;
    if (e.wind) w = wind >= 8 ? 4 : wind >= 5 ? 1 : 0.25;
    pool.push([e, w]);
  });
  if (!pool.length) return null;
  let x = Math.random() * pool.reduce((a, b) => a + b[1], 0), e = pool[0][0];
  for (const [ev, w] of pool) { if ((x -= w) < 0) { e = ev; break; } }
  return addEvent(ctx, e.id, e.basement ? 0 : e.ph === 1 ? f : 1 + Math.floor(Math.random() * f));
}
export function addEvent(ctx, id, floor) {
  const { st } = ctx; const def = ctx.curDef();
  const e = { id, floor, left: 3, day: st.day };
  st.events.push(e); st.evToday++;
  const fl = floorLabel(def.id, floor);
  radioBanner(`소장님! ${evDef(id).radio.replace('{f}', fl)}`, () => goToFloor(ctx, floor));
  ctx.save(); ctx.refresh();
  return e;
}
// 작업 1회마다: 남은 횟수 줄이고 놓치면 공정 멈춤·사기 하락·아차사고
export function tickEvents(ctx) {
  const { st } = ctx; const def = ctx.curDef();
  for (const e of [...st.events]) {
    e.left--;
    if (e.left > 0) continue;
    st.events = st.events.filter((x) => x !== e);
    const d = evDef(e.id);
    st.slowActs = (st.slowActs || 0) + 3;
    st.morale = Math.max(0, st.morale - 6);
    if (d.danger) { st.nearMiss.push({ id: e.id, floor: e.floor, day: st.day, b: def.id }); st.bNearMiss = (st.bNearMiss || 0) + 1; }
    sfx('bad');
    toast(`⏱ ${floorLabel(def.id, e.floor)} "${SHORT[e.id]}"을(를) 제때 해결 못 했어요. 그 층 공정이 멈춰 작업 3회 동안 작업량 -50%, 사기 -6${d.danger ? ' · 아차사고 기록' : ''}`, 'bad');
  }
}

/* ---------- 층 이동: 호이스트 / 계단 / 걷기 ---------- */
export function goToFloor(ctx, target = null) {
  const { st } = ctx; const def = ctx.curDef();
  if (!st.started) return toast('착공 후에 현장 층으로 갈 수 있어요');
  const built = currentFloor(def, ctx.actual());
  if (FLOORS[def.id]?.walk || floorCount(def.id) < 2) return openFloor(ctx, target ?? 1);
  if (needsHoist(def.id) && ctx.hasHoist()) return hoistPanel(ctx, built, target);
  return stairsPanel(ctx, built, target);
}

function floorGrid(ctx, built, target, onPick, { basement = false } = {}) {
  const def = ctx.curDef(), evs = ctx.st.events;
  const btns = floorButtons(def.id).map((b) => {
    const evIn = evs.find((e) => e.floor >= b.from && e.floor <= b.to);
    const ok = b.from <= built;
    return h('button', { class: 'fbtn' + (evIn ? ' ev' : '') + (target != null && target >= b.from && target <= b.to ? ' tgt' : ''), disabled: !ok,
      onclick: () => onPick(evIn ? evIn.floor : Math.min(b.to, built)) }, b.label, evIn ? h('i', {}, '🚨') : null);
  });
  if (basement || evs.some((e) => e.floor === 0)) btns.unshift(h('button', { class: 'fbtn' + (evs.some((e) => e.floor === 0) ? ' ev' : ''), onclick: () => onPick(0) }, 'B1', evs.some((e) => e.floor === 0) ? h('i', {}, '🚨') : null));
  return h('div', { class: 'fgrid' }, btns);
}

function hoistPanel(ctx, built, target) {
  const { st } = ctx; const def = ctx.curDef();
  let crowd = 4 + Math.floor(Math.random() * 8), door = 'open', warned = false;
  const disp = h('div', { class: 'ldisp' }, h('span', {}, '1F'), h('small', {}, '🔓 문 열림'));
  const fb = h('div', { class: 'fb' }, '탑승 전 확인: 명판(정원·적재하중) 보고 → 문 닫고 → 층 버튼!');
  const crowdEl = h('div', { class: 'crowd' });
  const renderCrowd = () => {
    crowdEl.innerHTML = '';
    crowdEl.append(h('div', {}, '👷'.repeat(crowd), h('b', { class: crowd > HOIST_PLATE.people ? 'minus' : '' }, ` ${crowd}명 탑승`)));
    if (crowd > HOIST_PLATE.people) crowdEl.append(h('button', { class: 'btn bad', onclick: () => { crowd = HOIST_PLATE.people - Math.floor(Math.random() * 2); sfx('tap'); fb.className = 'fb good'; fb.textContent = '좋아요! 정원을 넘는 인원은 다음 운행을 기다려요.'; renderCrowd(); } }, `${crowd - HOIST_PLATE.people}명은 다음 차로`));
  };
  renderCrowd();
  const doorBtn = h('button', { class: 'btn big', onclick: () => { door = 'closed'; sfx('thud'); disp.lastChild.textContent = '🔒 문 닫힘'; doorBtn.disabled = true; doorBtn.textContent = '🔒 문 닫힘'; } }, '🚪 문 닫기');
  const m = openModal({ title: '🔼 호이스트 탑승', cls: 'hoist', body: h('div', { class: 'col' },
    h('div', { class: 'plate' }, h('b', {}, '⚠️ 명판'), ` 정원 ${HOIST_PLATE.people}명 · 적재하중 ${HOIST_PLATE.load.toLocaleString()}kg`),
    crowdEl, disp, doorBtn,
    h('div', { class: 'tiny muted' }, `층 버튼 (지어진 ${floorLabel(def.id, built)}까지)`),
    floorGrid(ctx, built, target, (f) => {
      if (crowd > HOIST_PLATE.people) { warned = true; ctx.st.stats.hoistWarn = (ctx.st.stats.hoistWarn || 0) + 1; sfx('bad'); fb.className = 'fb bad'; fb.textContent = '⛔ 정원 초과! 과부하방지장치가 작동해 출발하지 않아요. 인원을 줄여요.'; return; }
      if (door !== 'closed') { warned = true; ctx.st.stats.hoistWarn = (ctx.st.stats.hoistWarn || 0) + 1; sfx('bad'); fb.className = 'fb bad'; fb.textContent = '⛔ 문이 열려 있어요! 출입문 연동장치(방호장치) 때문에 문이 닫혀야만 움직여요.'; return; }
      m.close();
      if (!warned) ctx.note('hoist');
      ride(ctx, f);
    }), fb,
    h('div', { class: 'tiny muted' }, '※ 게임용 명판 값이에요. 실제 정원·적재하중은 각 호이스트 명판을 따라요.')) });
}

async function ride(ctx, f) {
  const def = ctx.curDef(), n = floorCount(def.id);
  const disp = h('div', { class: 'liftdisp' }, h('b', {}, '1F'), h('small', {}, '▲ 운행 중'));
  $('#app').append(disp); document.body.classList.add('riding');
  sfx('thud');
  const y = f === 0 ? 0 : S.floorY((f - 0.5) / n);
  await S.rideHoist(y, 1200 + Math.min(2200, f / n * 2600), (e) => {
    const cur = f === 0 ? 'B1' : Math.max(1, Math.round(e * f));
    disp.firstChild.textContent = FLOORS[def.id]?.zones ? floorLabel(def.id, Math.max(1, Math.round(e * f))) : `${cur}F`;
  });
  sfx('ding');
  disp.lastChild.textContent = '도착 · 문 열림';
  await sleep(500);
  disp.remove(); document.body.classList.remove('riding');
  openFloor(ctx, f, { byHoist: true });
}

function stairsPanel(ctx, built, target) {
  const def = ctx.curDef();
  const hoistTip = needsHoist(def.id) ? h('div', { class: 'tiny' }, '💡 상점에서 호이스트를 설치하면 빠르고 힘들지 않게 올라가요.') : null;
  const m = openModal({ title: '🧗 계단으로 이동', body: h('div', { class: 'col' },
    h('div', { class: 'fb' }, '호이스트가 없어서 걸어 올라가요. 높은 층일수록 작업 시간(작업 횟수)이 들고 사기가 조금 떨어져요.'),
    hoistTip,
    floorGrid(ctx, built, target, (f) => { m.close(); climb(ctx, f); })) });
}
async function climb(ctx, f) {
  const { st } = ctx; const def = ctx.curDef();
  const cost = Math.min(st.actionsLeft, 4, Math.ceil(f / 6)); // 높을수록 오래 걸림(최대 작업 4회)
  const mor = Math.min(6, Math.floor(f / 4));
  const el = h('div', { class: 'stairs' }, h('div', { class: 'big-ic' }, '🚶‍♂️🧗'), h('b', {}, '계단으로 올라가는 중…'), h('div', { class: 'pbar' }, h('i')));
  $('#app').append(el);
  const ms = Math.min(2600, 500 + f * 120);
  const t0 = performance.now();
  await new Promise((res) => { const it = setInterval(() => { const p = Math.min(1, (performance.now() - t0) / ms); el.querySelector('.pbar i').style.width = p * 100 + '%'; el.querySelector('b').textContent = `계단으로 올라가는 중… ${floorLabel(def.id, Math.max(1, Math.round(p * f)))}`; if (p >= 1) { clearInterval(it); res(); } }, 60); });
  el.remove();
  st.actionsLeft -= cost; st.morale = Math.max(0, st.morale - mor);
  if (cost || mor) toast(`🧗 계단 이동: 작업 ${cost}회 소모${mor ? ` · 사기 -${mor}` : ''}`);
  ctx.save(); ctx.refresh();
  openFloor(ctx, f);
}

/* ---------- 층 안 작은 3D 공간 ---------- */
function eventProp(api, kind, x, z) {
  switch (kind) {
    case 'shore':
      api.box(5, 0.3, 4, 0x9e8c6a, x, 2.6, z);
      [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5], [0, 0]].forEach(([dx, dz], i) => { const p = api.box(0.15, 2.6, 0.15, 0xc0c0c0, x + dx, 0, z + dz); if (i === 4) { p.rotation.z = 0.35; } });
      api.collider(x - 2.5, z - 2, x + 2.5, z + 2); break;
    case 'rebar':
      for (let i = -2; i <= 2; i++) { api.box(5, 0.08, 0.08, 0x8a5a3a, x, i === 0 ? 0.02 : 0.25, z + i * 0.8); api.box(0.08, 0.08, 4, 0x8a5a3a, x + i * 1, 0.25, z); }
      break;
    case 'pump':
      for (let i = 0; i < 6; i++) api.box(1.4, 0.35, 0.35, 0x444444, x - 4 + i * 1.4, 0.1, z);
      api.box(0.9, 0.6, 0.6, 0x666666, x + 1, 0.1, z); break;
    case 'overload':
      for (let i = 0; i < 6; i++) api.box(2.2, 0.45, 1.4, [0xb5523b, 0x9c6a3c, 0xc0c0b8][i % 3], x, i * 0.45, z);
      api.collider(x - 1.2, z - 0.8, x + 1.2, z + 0.8); break;
    case 'rail': api.person(x, z + 0.5, { rot: Math.PI }); break;
    case 'hole': props.hole(api, x, z, 2.2, 2.2, false); break;
    case 'scaffold': props.scaffold(api, x, z, 5, 4, true); api.person(x, z - 1.4, {}); break;
    case 'fire':
      api.person(x - 1, z, { vest: 0x555555, rot: 1.5 });
      for (let i = 0; i < 3; i++) api.box(1.2, 0.5, 0.8, 0xf2b8c6, x + 1.2, i * 0.5, z + 0.8);
      api.data.sparks = api.group(x - 0.2, z);
      for (let i = 0; i < 8; i++) api.addBox(api.data.sparks, 0.1, 0.1, 0.1, 0xffa000, 0, 0.8, 0);
      break;
    case 'confined': api.box(3.4, 2, 3.4, 0x55606a, x, 0, z, true); api.box(1, 0.1, 1, 0x222222, x, 2, z); api.person(x + 2.4, z, { rot: -1.5 }); break;
    case 'leak': api.box(3, 2.4, 0.2, 0x8fc8ee, x, 0.4, z - 0.6); api.box(3.2, 0.15, 0.25, 0x666666, x, 2.8, z - 0.6); for (let i = 0; i < 4; i++) api.box(0.1, 0.25, 0.1, 0x2f6fbf, x - 1 + i * 0.6, 0.1 + (i % 2) * 0.4, z - 0.4); break;
    case 'helmet': api.person(x, z, { noHelmet: true, rot: 0.5 }); break;
    case 'heavy': { const a = api.person(x, z, { rot: 0.3 }); a.g.userData.armL.rotation.x = a.g.userData.armR.rotation.x = -1.3; api.box(1.4, 0.6, 0.8, 0x9c6a3c, x, 1.0, z + 0.6); break; }
    case 'wire': api.box(5, 0.08, 0.1, 0x222222, x, 0, z); api.box(0.6, 0.1, 0.12, 0xd08a3a, x + 0.5, 0, z); break;
    case 'bind': for (let i = 0; i < 7; i++) { const b = api.box(1.8, 0.1, 0.25, 0x9c6a3c, x + (Math.random() - 0.5) * 5, 0, z + (Math.random() - 0.5) * 4); b.rotation.y = Math.random() * 3; } break;
  }
}

export function openFloor(ctx, f, opts = {}) {
  const { st } = ctx; const def = ctx.curDef();
  const ev = st.events.find((e) => e.floor === f);
  const d = ev && evDef(ev.id);
  const label = floorLabel(def.id, f);
  const B = { x0: -12, x1: 12, z0: -9, z1: 9 };
  const spotPos = shuffle([[-7, -5], [-7, 4], [0, -5], [1, 5]])[0];
  const basement = f === 0;
  const w = openWalk({
    title: `${opts.byHoist ? '🔼' : '🚶'} ${def.name} · ${label}`,
    info: d ? `🚨 ${SHORT[d.id]} — 빨간 표시까지 걸어가서 "확인"` : '이 층은 이상 없어요. 둘러본 뒤 ✕로 내려가요.',
    bounds: B, start: { x: 9.5, z: 0 }, ground: basement ? 0x6d6a64 : 0xb0aca2, sky: basement ? 0x2a2c30 : (FLOORS[def.id]?.walk ? 0x9fd8f5 : 0xbfe2f5),
    actionLabel: '확인',
    build(api) {
      // 기둥과 가장자리 난간
      for (const x of [-8, -2, 4]) for (const z of [-6, 6]) api.box(0.8, 3, 0.8, 0x9d9a92, x, 0, z, true);
      if (!basement && !FLOORS[def.id]?.walk) {
        const railGap = d?.prop === 'rail';
        props.rail(api, B.x0 + 0.3, B.z0 + 0.3, B.x1 - 0.3, B.z0 + 0.3);
        if (railGap) { props.rail(api, B.x0 + 0.3, B.z1 - 0.3, spotPos[0] - 2, B.z1 - 0.3); props.rail(api, spotPos[0] + 2, B.z1 - 0.3, B.x1 - 0.3, B.z1 - 0.3); }
        else props.rail(api, B.x0 + 0.3, B.z1 - 0.3, B.x1 - 0.3, B.z1 - 0.3);
        props.rail(api, B.x0 + 0.3, B.z0 + 0.3, B.x0 + 0.3, B.z1 - 0.3);
        api.box(0.1, 2.4, 1.6, 0xffd400, B.x1 - 0.05, 0, 0); // 호이스트 출입구
        api.label(opts.byHoist ? '🔼 호이스트' : '🧗 계단', B.x1 - 1, 2.6, 0, 'mark ok');
      }
      if (basement) { api.hemi.intensity = 0.6; api.lamp(-10, -7); api.lamp(10, 7); }
      props.pile(api, 6, -6); api.person(-4, 1, { rot: 1 });
      if (d) {
        const [x, z] = d.prop === 'rail' ? [spotPos[0], B.z1 - 1.5] : spotPos;
        eventProp(api, d.prop, x, z);
        api.addSpot({ x, z, r: 3, icon: '🚨', cls: 'alert', ev, act: '확인' });
      }
    },
    onTick(dt, api) {
      if (api.data.sparks) api.data.sparks.children.forEach((s, i) => { const t = (api.elapsed * 2 + i / 8) % 1; s.position.set(Math.cos(i) * t * 1.5, 0.9 + Math.sin(t * 3) * 0.4, Math.sin(i * 2) * t * 1.5); });
    },
    onAction(spot, api) { if (spot?.ev) situation(ctx, spot.ev, () => { api.doneSpot(spot); api.setInfo('해결! ✕를 눌러 내려가요.'); }); },
    onEnd() { S.endRide(); ctx.refresh(); },
  });
  return w;
}

/* ---------- 상황 카드 ---------- */
function situation(ctx, ev, onSolved) {
  const { st } = ctx; const def = ctx.curDef(), d = evDef(ev.id);
  const label = floorLabel(def.id, ev.floor);
  const field = st.track === 'field';
  let tries = 0;
  const m = openModal({ title: `🚨 ${label} · ${SHORT[d.id]}`, cls: 'mg situ', body: '' });
  const solved = () => {
    st.events = st.events.filter((x) => x !== ev);
    st.stats.eventsSolved = (st.stats.eventsSolved || 0) + 1;
    const reward = Math.max(2, Math.round((tries === 0 ? 7 : 4) * ctx.stageMult()));
    st.morale = Math.min(100, st.morale + (tries === 0 ? 4 : 2));
    if (d.note) ctx.note(d.note);
    ctx.earn(reward, `${SHORT[d.id]} 해결`);
    onSolved?.();
    return reward;
  };
  if (field) {
    const lang = st.lang || 'ko', U = FIELD_UI[lang];
    const fb = h('div', { class: 'fb' });
    const acts = shuffle(d.f.acts);
    const btns = acts.map((a) => h('button', { class: 'btn actcard', onclick: (e) => {
      const ok = a === d.f.acts[0];
      if (!ok) { tries++; sfx('bad'); e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true; fb.className = 'fb bad'; fb.innerHTML = ''; fb.append(h('div', {}, U.wrong), lang !== 'ko' ? h('div', { class: 'tl-ko' }, FIELD_UI.ko.wrong) : null); return; }
      btns.forEach((b) => (b.disabled = true)); sfx('good'); e.currentTarget.classList.add('right');
      const A = FIELD_ACTS[a];
      const reward = solved();
      fb.className = 'fb good'; fb.innerHTML = '';
      fb.append(h('div', {}, A.fb?.[lang] || ''), lang !== 'ko' ? h('div', { class: 'tl-ko' }, A.fb?.ko || '') : null,
        h('div', { class: 'tiny' }, `관리자 시점: ${d.s.o[0]}`), h('div', { class: 'reward' }, `+${reward}만원`),
        h('button', { class: 'btn primary', onclick: () => m.close() }, '확인'));
    } }, h('div', { class: 'big-ic' }, FIELD_ACTS[a].ic), h('div', {}, FIELD_ACTS[a].t[lang]), lang !== 'ko' ? h('div', { class: 'tl-ko' }, FIELD_ACTS[a].t.ko) : null));
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'situ-text' }, d.f.sit[lang], lang !== 'ko' ? h('div', { class: 'tl-ko' }, d.f.sit.ko) : null),
      h('div', { class: 'qhead' }, U.pick, lang !== 'ko' ? ` · ${FIELD_UI.ko.pick}` : ''),
      h('div', { class: 'grid3' }, btns), fb));
    return;
  }
  // 학생: 조치 → 원인·기준
  const ask = (q, o, ex, then, stepLabel) => {
    const fb = h('div', { class: 'fb' });
    const order = shuffle(o.map((_, k) => k));
    const btns = order.map((k) => h('button', { class: 'btn opt', onclick: (e) => {
      if (k !== 0) { tries++; sfx('bad'); e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true; fb.className = 'fb bad'; fb.textContent = '다시 생각해 봐요. ' + ex; return; }
      btns.forEach((b) => (b.disabled = true)); sfx('good'); e.currentTarget.classList.add('right');
      fb.className = 'fb good'; fb.textContent = '정답! ' + ex;
      fb.append(h('button', { class: 'btn primary', onclick: then }, '다음'));
    } }, o[k]));
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'situ-text' }, `📻 ${d.radio.replace('{f}', label)}`),
      h('div', { class: 'step' }, stepLabel), h('div', { class: 'qtext' }, q), h('div', { class: 'col gap6' }, btns), fb));
  };
  ask(d.s.q, d.s.o, d.s.ex, () => ask(d.s.q2, d.s.o2, d.s.ex2, () => {
    const reward = solved();
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'big-score' }, tries === 0 ? '👍 한 번에 해결!' : '해결!'),
      h('div', { class: 'lesson' }, h('b', {}, '🎓 건축기사 연결 개념'), h('div', {}, d.s.concept)),
      h('div', { class: 'tiny' }, d.s.ex2),
      h('div', { class: 'reward' }, `보상 +${reward}만원`),
      h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')));
  }, '2단계 · 원인과 기준'), '1단계 · 조치');
}
