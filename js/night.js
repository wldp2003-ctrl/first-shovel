// 야간 당직 순찰 — 손전등, 당직 동료, 체크리스트, 최상층 확인, 새벽 연출, 당직 일지
import * as THREE from 'three';
import { localize, koOn , lang as curLang } from './lang.js';
import { t as $t } from './lang.js';
import { NIGHT_ITEMS, NIGHT_TALK } from './data2.js';
import { openWalk, props } from './walk.js';
import { h, openModal, shuffle, sleep, $, toast, won } from './ui.js';
import { sfx } from './audio.js';

const FIX = {
  gate: ['출입문이 열려 있었어요 → 잠갔어요', '잠겨 있어요 ⟦check⟧'],
  panel: ['분전반이 켜져 있었어요 → 작업 회로 차단 (조명·양수기 회로는 유지)', '차단되어 있어요 ⟦check⟧'],
  fire: ['용접 자리에 불씨가 남아 있었어요 → 끄고 소화기 위치 확인', '불씨 없음 · 소화기 제자리 ⟦check⟧'],
  bind: ['자재가 풀려 있었어요 → 끈으로 결속', '결속 상태 좋음 ⟦check⟧'],
  cover: ['개구부 덮개가 밀려 있었어요 → 고정', '덮개 고정 ⟦check⟧'],
  pump: ['배수로에 흙이 막혀 있었어요 → 정리, 양수기 작동 확인', '배수로 깨끗 ⟦check⟧'],
  crane: ['선회 브레이크가 걸려 있었어요 → 해제(프리 슬루) 요청·확인', '훅 올림 · 프리 슬루 ⟦check⟧'],
  roof: ['최상층 난간 한 칸이 풀려 있었어요 → 고정, 개구부 덮개 확인', '난간·덮개 이상 없음 ⟦check⟧'],
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
  const why = tw.rain >= 1 || tw.wind >= 8 ? $t('night.nightCard.9', { v1: tw.rain >= 1 ? $t('night.nightCard.7', { rain: tw.rain }) : '', v2: tw.rain >= 1 && tw.wind >= 8 ? ' · ' : '', v3: tw.wind >= 8 ? $t('night.nightCard.8', { wind: tw.wind }) : '' }) : $t('night.nightCard.6');
  const m = openModal({ title: $t('night.nightCard.5'), body: h('div', { class: 'col' },
    h('div', { class: 'night-art' }, '⟦moon⟧ ⟦star⟧ ⟦site⟧ ⟦light⟧'),
    h('div', {}, $t('night.nightCard.4', { why })),
    h('div', { class: 'tiny muted' }, $t('night.nightCard.3')),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onclick: () => { m.close(); skip(); } }, $t('night.nightCard.2')),
      h('button', { class: 'btn primary', onclick: () => { m.close(); runNight(ctx, then); } }, $t('night.nightCard.1')))) });
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
  const tLabel = (id) => NIGHT_ITEMS[id].t[lang] + (koOn() ? ` · ${NIGHT_ITEMS[id].t.ko}` : '');
  const w = openWalk({
    title: $t('night.tLabel.9'), night: true, timeLimit: field ? 75 : 95,
    info: field ? $t('night.tLabel.8') : $t('night.tLabel.7', { length: items.length }),
    bounds: B, start: { x: 0, z: 9 }, ground: 0x4a4740, actionLabel: $t('night.tLabel.6'),
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
      items.forEach((id) => api.addSpot({ x: pos[id][0], z: pos[id][1] - (id === 'gate' ? 1.5 : 0), r: 2.6, icon: NIGHT_ITEMS[id].ic, id, act: $t('night.tLabel.5') }));
      api.addSpot({ x: stair[0], z: stair[1] + 3, r: 2.4, icon: '⟦stairs⟧', id: 'stairs', act: $t('night.tLabel.4') });
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
      if (cat) { cat.position.x += Math.sin(api.elapsed * 0.7) * dt * 1.5; if (!api.data.meow && api.dist(cat.position.x, cat.position.z) < 4) { api.data.meow = true; const c = { g: cat }; api.say(mate, $t('night.tLabel.3'), 3); sfx('pop'); } }
    },
    onAction(spot, api) {
      if (!spot) return;
      if (spot.id === 'stairs') return goRoof(api);
      const id = spot.id, isBad = bad.has(id);
      checked.push(id); if (isBad) fixed.push(id);
      api.doneSpot(spot, isBad ? '⟦tool⟧' : '⟦check⟧');
      sfx(isBad ? 'tamp' : 'good');
      api.setInfo(`${NIGHT_ITEMS[id].ic} ${tLabel(id)} — ${FIX[id][isBad ? 0 : 1]}`);
      if (!field) setTimeout(() => !api.ended && api.setInfo(`⟦idea⟧ ${NIGHT_ITEMS[id].why}`), 2600);
      if (checked.length === items.length) api.say(mate, $t('night.tLabel.2'), 3.5);
    },
    onTimeUp: (api) => { api.setInfo($t('night.tLabel.1')); setTimeout(() => goRoof(api), 1200); },
    onQuit: (api) => goRoof(api, true),
  });
  let roofDone = false, roofChecked = false, went = false;
  async function goRoof(api, quit = false) {
    if (went) return; went = true;
    api.end(true);
    if (quit) return finish();
    const el = h('div', { class: 'stairs night' }, h('div', { class: 'big-ic' }, '⟦light⟧⟦stairs⟧'), h('b', {}, $t('night.goRoof.5')), h('div', { class: 'pbar' }, h('i')));
    $('#app').append(el);
    for (let k = 0; k <= 10; k++) { el.querySelector('.pbar i').style.width = k * 10 + '%'; await sleep(140); }
    el.remove();
    const RB = { x0: -8, x1: 8, z0: -6, z1: 6 };
    const roofBad = Math.random() < 0.5;
    openWalk({
      title: $t('night.goRoof.4'), night: true, bounds: RB, start: { x: 6, z: 4 }, ground: 0x6a6760, actionLabel: $t('night.goRoof.3'), timeLimit: 30,
      info: $t('night.goRoof.2'),
      build(api2) {
        props.rail(api2, RB.x0 + 0.3, RB.z0 + 0.3, RB.x1 - 0.3, RB.z0 + 0.3);
        props.rail(api2, RB.x0 + 0.3, RB.z0 + 0.3, RB.x0 + 0.3, RB.z1 - 0.3);
        if (!roofBad) props.rail(api2, RB.x0 + 0.3, RB.z1 - 0.3, RB.x1 - 0.3, RB.z1 - 0.3); else props.rail(api2, RB.x0 + 0.3, RB.z1 - 0.3, -2, RB.z1 - 0.3);
        props.hole(api2, -3, -2, 2, 2, true);
        api2.lamp(-7, -5);
        api2.addSpot({ x: -3, z: 2, r: 4, icon: NIGHT_ITEMS.roof.ic, id: 'roof', act: $t('night.goRoof.1') });
      },
      onAction(spot, api2) {
        if (!spot) return;
        roofChecked = true; if (roofBad) fixed.push('roof');
        api2.doneSpot(spot, roofBad ? '⟦tool⟧' : '⟦check⟧'); sfx('good');
        api2.setInfo(`${tLabel('roof')} — ${FIX.roof[roofBad ? 0 : 1]}`);
        dawn(api2);
      },
      onTimeUp: (api2) => dawn(api2),
      onQuit: (api2) => { api2.end(true); finish(); },
    });
  }
  async function dawn(api2) {
    if (roofDone) return; roofDone = true;
    api2.setTitle($t('night.dawn.1'));
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
    ctx.earn(reward, $t('night.finish.1'));
    const row = (id) => h('tr', {}, h('td', {}, `${NIGHT_ITEMS[id].ic} ${NIGHT_ITEMS[id].t[curLang()]}`),
      h('td', { class: done.includes(id) ? 'ok' : 'ng' }, done.includes(id) ? (fixed.includes(id) ? $t('night.row.11') : $t('night.row.10')) : $t('night.row.9')));
    const m = openModal({ title: $t('night.row.8'), body: h('div', { class: 'col' },
      h('div', { class: 'tiny muted' }, $t('night.row.7', { day: st.day, nick: st.nick })),
      h('table', { class: 'tbl' }, h('tr', {}, h('th', {}, $t('night.row.6')), h('th', {}, $t('night.row.5'))), all.map(row)),
      h('div', { class: 'fb ' + (allOk ? 'good' : 'bad') }, allOk ? $t('night.row.4') : $t('night.row.3', { length: missed.length })),
      h('div', { class: 'reward' }, $t('night.row.2', { reward: won(reward) })),
      h('button', { class: 'btn primary big', onclick: () => m.close() }, $t('night.row.1'))) });
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
  if (n.missed.includes('bind') && (w.wind >= 7 || Math.random() < p * 0.5)) { st.actionsLeft = Math.max(0, st.actionsLeft - 1); out.push($t('night.applyNightConsequences.3')); }
  if (n.missed.includes('pump') && w.rain >= 1) { st.actionsLeft = Math.max(0, st.actionsLeft - 1); out.push($t('night.applyNightConsequences.2')); }
  if (n.missed.includes('fire') && Math.random() < p * 0.5) out.push('fireAlarm');
  if (n.missed.includes('gate') && Math.random() < p * 0.3) { st.money = Math.max(0, st.money - 5); out.push($t('night.applyNightConsequences.1', { amt: won(5) })); }
  return out;
}

export function nightReportLine(st) {
  const n = st.night;
  if (!n || n.day !== st.day - 1) return null;
  if (n.skipped) return $t('night.nightReportLine.4');
  const fx = n.fixed.length;
  return $t('night.nightReportLine.3', { length: n.checked.length, v2: n.checked.length + n.missed.length, fx, v4: n.missed.length ? $t('night.nightReportLine.2', { v1: n.missed.map((id) => NIGHT_ITEMS[id].t[curLang()]).join(', ') }) : $t('night.nightReportLine.1') });
}

// 언어에 따라 바뀌는 문장으로 감싸기 (lang.js)
localize(FIX, 'night.fix');
