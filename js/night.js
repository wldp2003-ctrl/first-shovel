// 야간 당직 순찰 — 손전등, 당직 동료, 체크리스트, 최상층 확인, 새벽 연출, 당직 일지
import * as THREE from 'three';
import { NIGHT_ITEMS, NIGHT_TALK } from './data2.js';
import { openWalk, props } from './walk.js';
import { h, openModal, shuffle, sleep, $, toast, won } from './ui.js';
import { sfx } from './audio.js';

const FIX = {
  gate: ['출입문이 열려 있었어요 → 잠갔어요', '잠겨 있어요 ✔'],
  panel: ['분전반이 켜져 있었어요 → 작업 회로 차단 (조명·양수기 회로는 유지)', '차단되어 있어요 ✔'],
  fire: ['용접 자리에 불씨가 남아 있었어요 → 끄고 소화기 위치 확인', '불씨 없음 · 소화기 제자리 ✔'],
  bind: ['자재가 풀려 있었어요 → 끈으로 결속', '결속 상태 좋음 ✔'],
  cover: ['개구부 덮개가 밀려 있었어요 → 고정', '덮개 고정 ✔'],
  pump: ['배수로에 흙이 막혀 있었어요 → 정리, 양수기 작동 확인', '배수로 깨끗 ✔'],
  crane: ['선회 브레이크가 걸려 있었어요 → 해제(프리 슬루) 요청·확인', '훅 올림 · 프리 슬루 ✔'],
  roof: ['최상층 난간 한 칸이 풀려 있었어요 → 고정, 개구부 덮개 확인', '난간·덮개 이상 없음 ✔'],
};

export function shouldNight(ctx) {
  const { st } = ctx;
  if (ctx.demo() || !st.started || st.finished || st.nightDay === st.day) return false;
  const tw = ctx.tomorrowWx();
  return st.day % 3 === 0 || tw.rain >= 1 || tw.wind >= 8;
}

export function nightCard(ctx, then) {
  const { st } = ctx; const tw = ctx.tomorrowWx();
  st.nightDay = st.day; ctx.save();
  const why = tw.rain >= 1 || tw.wind >= 8 ? `내일 ${tw.rain >= 1 ? `비 ${tw.rain}mm` : ''}${tw.rain >= 1 && tw.wind >= 8 ? ' · ' : ''}${tw.wind >= 8 ? `강풍 ${tw.wind}m/s` : ''} 예보가 있어요.` : '3일에 한 번 돌아오는 당직 순번이에요.';
  const m = openModal({ title: '🌙 오늘 밤 당직이에요', body: h('div', { class: 'col' },
    h('div', { class: 'night-art' }, '🌙 ✨ 🏗️ 🔦'),
    h('div', {}, `퇴근 뒤 박기사와 현장을 한 바퀴 돌며 이상이 없는지 확인해요. ${why}`),
    h('div', { class: 'tiny muted' }, '잘 하면 수고비 + 사기 상승 + 내일 문제 하나 예방. 건너뛰면 내일 그와 연결된 문제가 생길 수 있어요.'),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onclick: () => { m.close(); skip(); } }, '건너뛰기'),
      h('button', { class: 'btn primary', onclick: () => { m.close(); runNight(ctx, then); } }, '🔦 당직 서기'))) });
  const skip = () => {
    const items = itemsFor(ctx);
    st.night = { day: st.day, skipped: true, checked: [], fixed: [], missed: items };
    ctx.save(); then();
  };
}

function itemsFor(ctx) {
  const { st } = ctx; const tw = ctx.tomorrowWx();
  if (st.track === 'field') return ['gate', 'fire', 'cover'];
  const list = ['gate', 'panel', 'fire', 'bind', 'cover'];
  if (tw.rain >= 1) list.push('pump');
  if (ctx.hasCrane()) list.push('crane');
  return list;
}

export function runNight(ctx, then) {
  const { st } = ctx; const lang = st.lang || 'ko';
  const items = itemsFor(ctx);
  const field = st.track === 'field';
  const bad = new Set(shuffle(items).slice(0, Math.max(1, Math.round(items.length * 0.4))));
  const checked = [], fixed = [];
  const B = { x0: -16, x1: 16, z0: -13, z1: 13 };
  const pos = { gate: [0, 12], panel: [-13, 8], fire: [-8, -8], bind: [10, -9], cover: [5, 6], pump: [-13, -10], crane: [12, 2] };
  const stair = [3, -1];
  let mate, cat = null, talkT = 3;
  const tLabel = (id) => NIGHT_ITEMS[id].t[lang] + (lang !== 'ko' ? ` · ${NIGHT_ITEMS[id].t.ko}` : '');
  const w = openWalk({
    title: '🌙 야간 당직 순찰', night: true, timeLimit: field ? 75 : 95,
    info: field ? '🔦 아이콘이 있는 곳에 가서 "확인" — 다 보면 🧗 계단으로 옥상!' : `체크리스트 ${items.length}개 확인 → 🧗 계단으로 최상층 확인`,
    bounds: B, start: { x: 0, z: 9 }, ground: 0x4a4740, actionLabel: '확인',
    build(api) {
      props.fence(api, B);
      api.box(6, 0.12, 2, 0x5a5a5a, 0, 0, 12.2); api.box(6, 0.14, 0.3, 0xffd400, 0, 0, 11.2); // 출입구
      // 건물 실루엣
      for (const x of [-4, 0, 4]) for (const z of [-3, 1]) api.box(0.7, 9, 0.7, 0x77736b, x, 0, z, true);
      for (let y = 3; y <= 9; y += 3) api.box(9.6, 0.35, 5, 0x8a867e, 0, y, -1);
      api.lamp(-14, 11); api.lamp(14, 11); api.lamp(-14, -11); api.lamp(14, -11);
      // 작업등
      const wl = new THREE.PointLight(0xaaccff, 18, 12, 1); wl.position.set(0, 3, -1); api.scene.add(wl);
      // 소품
      api.box(1, 1.6, 0.5, 0x888888, ...[pos.panel[0], 0, pos.panel[1]], true);
      props.pile(api, pos.bind[0], pos.bind[1]);
      props.hole(api, pos.cover[0], pos.cover[1], 2, 2, true);
      api.box(1.4, 0.8, 1, 0x3366aa, pos.pump[0], 0, pos.pump[1], true);
      api.box(1, 0.6, 1, 0x555555, pos.fire[0], 0, pos.fire[1]); api.box(0.4, 0.8, 0.4, 0xd83a2a, pos.fire[0] + 1.3, 0, pos.fire[1]);
      if (ctx.hasCrane()) props.crane(api, pos.crane[0], pos.crane[1] - 1, pos.crane[0] - 6, pos.crane[1] - 1);
      items.forEach((id) => api.addSpot({ x: pos[id][0], z: pos[id][1] - (id === 'gate' ? 1.5 : 0), r: 2.6, icon: NIGHT_ITEMS[id].ic, id, act: '확인' }));
      api.addSpot({ x: stair[0], z: stair[1] + 3, r: 2.4, icon: '🧗', id: 'stairs', act: '옥상으로' });
      mate = api.person(1.5, 10.5, { vest: 0x3a7bd5 });
      if (Math.random() < 0.6) { cat = api.group(-12, 4); api.addBox(cat, 0.6, 0.35, 0.3, 0xe08a3a, 0, 0, 0); api.addBox(cat, 0.3, 0.3, 0.3, 0xe08a3a, 0.4, 0.3, 0); }
    },
    onTick(dt, api) {
      const p = api.player.pos, mp = mate.g.position;
      const d = Math.hypot(p.x - mp.x, p.z - mp.z);
      if (d > 2.2) { mp.x += (p.x - mp.x) / d * Math.min(d - 2.2, 4.5 * dt); mp.z += (p.z - mp.z) / d * Math.min(d - 2.2, 4.5 * dt); }
      mate.g.lookAt(p.x, 0, p.z);
      talkT -= dt;
      if (talkT <= 0) { talkT = 7 + Math.random() * 5; api.say(mate, NIGHT_TALK[Math.floor(Math.random() * NIGHT_TALK.length)], 3); }
      if (cat) { cat.position.x += Math.sin(api.elapsed * 0.7) * dt * 1.5; if (!api.data.meow && api.dist(cat.position.x, cat.position.z) < 4) { api.data.meow = true; const c = { g: cat }; api.say(mate, '어? 현장 고양이다! 🐈', 3); sfx('pop'); } }
    },
    onAction(spot, api) {
      if (!spot) return;
      if (spot.id === 'stairs') return goRoof(api);
      const id = spot.id, isBad = bad.has(id);
      checked.push(id); if (isBad) fixed.push(id);
      api.doneSpot(spot, isBad ? '🔧' : '✅');
      sfx(isBad ? 'tamp' : 'good');
      api.setInfo(`${NIGHT_ITEMS[id].ic} ${tLabel(id)} — ${FIX[id][isBad ? 0 : 1]}`);
      if (!field) setTimeout(() => !api.ended && api.setInfo(`💡 ${NIGHT_ITEMS[id].why}`), 2600);
      if (checked.length === items.length) api.say(mate, '다 봤네요! 이제 계단으로 꼭대기 가 봐요', 3.5);
    },
    onTimeUp: (api) => { api.setInfo('⏱ 순찰 시간이 지났어요. 계단으로 옥상만 확인하고 마칠게요'); setTimeout(() => goRoof(api), 1200); },
    onQuit: (api) => goRoof(api, true),
  });
  let roofDone = false, roofChecked = false, went = false;
  async function goRoof(api, quit = false) {
    if (went) return; went = true;
    api.end(true);
    if (quit) return finish();
    const el = h('div', { class: 'stairs night' }, h('div', { class: 'big-ic' }, '🔦🧗'), h('b', {}, '밤에는 호이스트 운행 끝 — 계단으로 최상층까지…'), h('div', { class: 'pbar' }, h('i')));
    $('#app').append(el);
    for (let k = 0; k <= 10; k++) { el.querySelector('.pbar i').style.width = k * 10 + '%'; await sleep(140); }
    el.remove();
    const RB = { x0: -8, x1: 8, z0: -6, z1: 6 };
    const roofBad = Math.random() < 0.5;
    openWalk({
      title: '🏢 최상층 확인', night: true, bounds: RB, start: { x: 6, z: 4 }, ground: 0x6a6760, actionLabel: '확인', timeLimit: 30,
      info: '최상층 개구부와 난간을 확인해요',
      build(api2) {
        props.rail(api2, RB.x0 + 0.3, RB.z0 + 0.3, RB.x1 - 0.3, RB.z0 + 0.3);
        props.rail(api2, RB.x0 + 0.3, RB.z0 + 0.3, RB.x0 + 0.3, RB.z1 - 0.3);
        if (!roofBad) props.rail(api2, RB.x0 + 0.3, RB.z1 - 0.3, RB.x1 - 0.3, RB.z1 - 0.3); else props.rail(api2, RB.x0 + 0.3, RB.z1 - 0.3, -2, RB.z1 - 0.3);
        props.hole(api2, -3, -2, 2, 2, true);
        api2.lamp(-7, -5);
        api2.addSpot({ x: -3, z: 2, r: 4, icon: NIGHT_ITEMS.roof.ic, id: 'roof', act: '확인' });
      },
      onAction(spot, api2) {
        if (!spot) return;
        roofChecked = true; if (roofBad) fixed.push('roof');
        api2.doneSpot(spot, roofBad ? '🔧' : '✅'); sfx('good');
        api2.setInfo(`${tLabel('roof')} — ${FIX.roof[roofBad ? 0 : 1]}`);
        dawn(api2);
      },
      onTimeUp: (api2) => dawn(api2),
      onQuit: (api2) => { api2.end(true); finish(); },
    });
  }
  async function dawn(api2) {
    if (roofDone) return; roofDone = true;
    api2.setTitle('🌅 새벽 — 순찰 끝!');
    const from = new THREE.Color(0x0b1430), to = new THREE.Color(0xffb27a);
    for (let k = 0; k <= 30; k++) {
      if (api2.ended) break;
      const c = from.clone().lerp(to, k / 30);
      api2.scene.background.copy(c); api2.scene.fog.color.copy(c); api2.hemi.intensity = 0.35 + k / 30 * 0.8;
      await sleep(60);
    }
    sfx('fanfare');
    await sleep(900);
    api2.end(true);
    finish();
  }
  function finish() {
    const all = [...items, 'roof'];
    const done = [...checked, ...(roofChecked ? ['roof'] : [])];
    const missed = all.filter((x) => !done.includes(x));
    const allOk = missed.length === 0;
    const reward = Math.round((3 + done.length * 1.5) * ctx.stageMult());
    st.night = { day: st.day, skipped: false, checked: done, fixed, missed };
    st.stats.nights = (st.stats.nights || 0) + 1;
    st.morale = Math.min(100, st.morale + (allOk ? 6 : 2));
    if (allOk) st.evShield = (st.evShield || 0) + 1;
    ctx.note('night');
    ctx.earn(reward, '야간 당직 수고비');
    const row = (id) => h('tr', {}, h('td', {}, `${NIGHT_ITEMS[id].ic} ${NIGHT_ITEMS[id].t.ko}`),
      h('td', { class: done.includes(id) ? 'ok' : 'ng' }, done.includes(id) ? (fixed.includes(id) ? '이상 → 조치' : '확인') : '미확인'));
    const m = openModal({ title: '📓 당직 일지', body: h('div', { class: 'col' },
      h('div', { class: 'tiny muted' }, `${st.day}일차 밤 · 당직: ${st.nick}, 박기사`),
      h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, '항목'), h('th', {}, '결과')), all.map(row)),
      h('div', { class: 'fb ' + (allOk ? 'good' : 'bad') }, allOk ? '모든 항목 확인! 내일 생길 문제 하나를 미리 막아요. 사기 +6' : `미확인 ${missed.length}건 — 내일 관련 문제가 생길 수 있어요.`),
      h('div', { class: 'reward' }, `수고비 +${reward}만원`),
      h('button', { class: 'btn primary big', onclick: () => m.close() }, '퇴근하고 아침 맞기 ☀️')) });
    m.onClose = then;
  }
  return w;
}

// 다음 날 아침: 건너뛰거나 놓친 항목 → 연결된 문제
export function applyNightConsequences(ctx) {
  const { st } = ctx; const n = st.night;
  if (!n || n.day !== st.day - 1 || n.applied) return [];
  n.applied = true;
  const out = [], w = ctx.todayWx();
  const p = n.skipped ? 0.5 : 0.8;
  if (n.missed.includes('bind') && (w.wind >= 7 || Math.random() < p * 0.5)) { st.actionsLeft = Math.max(0, st.actionsLeft - 1); out.push('결속 안 한 자재가 밤바람에 흩어져 정리하느라 작업 1회 감소'); }
  if (n.missed.includes('pump') && w.rain >= 1) { st.actionsLeft = Math.max(0, st.actionsLeft - 1); out.push('배수로가 막혀 고인 물을 퍼내느라 작업 1회 감소'); }
  if (n.missed.includes('fire') && Math.random() < p * 0.5) out.push('fireAlarm');
  if (n.missed.includes('gate') && Math.random() < p * 0.3) { st.money = Math.max(0, st.money - 5); out.push('출입문이 열려 있어 공구 몇 개가 사라졌어요 (-5만원)'); }
  return out;
}

export function nightReportLine(st) {
  const n = st.night;
  if (!n || n.day !== st.day - 1) return null;
  if (n.skipped) return '🌙 어젯밤 당직: 건너뜀 — 점검하지 못한 항목이 있어요';
  const fx = n.fixed.length;
  return `🌙 어젯밤 당직 보고: ${n.checked.length}/${n.checked.length + n.missed.length}개 확인 · 이상 ${fx}건 조치${n.missed.length ? ` · 미확인: ${n.missed.map((id) => NIGHT_ITEMS[id].t.ko).join(', ')}` : ' · 미확인 없음 ✔'}`;
}
