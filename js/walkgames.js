// 직접 움직이는 미니게임 — 학생: 현장 안전 순찰 / 현장 첫 출근: 유리창 안전하게 옮기기
import * as THREE from 'three';
import { openWalk, props, mat } from './walk.js';
import { h, openModal, shuffle } from './ui.js';
import { sfx } from './audio.js';
import { resultCard } from './games2.js';

/* ================= 학생 5. 현장 안전 순찰 ================= */
const HAZ = {
  hole: { name: '덮개 없는 개구부', fix: '덮개 고정 + "개구부 주의" 표지', stepR: 1.4 },
  helmet: { name: '안전모 안 쓴 인부', fix: '작업 중지 → 안전모·턱끈 착용' },
  rail: { name: '난간 없는 비계', fix: '안전난간 설치 후 작업' },
  load: { name: '크레인 짐 아래 통행', fix: '짐 아래 출입 금지 구역 설정 · 신호수 배치', stepR: 1.6 },
  messy: { name: '정리 안 된 자재', fix: '통로 확보 · 정리정돈(걸려 넘어짐 방지)' },
  wire: { name: '바닥에 늘어진 피복 벗겨진 전선', fix: '전원 차단 · 전선 교체 · 걸이로 띄우기', stepR: 1.0 },
};
export function runPatrol({ stageMult = 1, onFinish }) {
  const B = { x0: -16, x1: 16, z0: -13, z1: 13 };
  const slots = shuffle([[-11, -7], [-4, -8], [5, -8], [11, -6], [-12, 3], [-5, 6], [6, 5], [12, 4], [0, 9], [-9, 10], [10, 10]]);
  const kinds = shuffle(Object.keys(HAZ)).slice(0, 5);
  const decoys = shuffle(['hole', 'helmet', 'rail', 'messy']).slice(0, 3);
  let found = 0, wrong = 0, steps = 0, lastStep = 0;
  const foundList = [];
  const w = openWalk({
    title: '🔦 현장 안전 순찰', info: '위험요소에 다가가 "지적!" — 60초, 너무 가까이 밟으면 감점', actionLabel: '지적!', timeLimit: 60,
    bounds: B, start: { x: 0, z: 9 }, ground: 0xa49a84,
    build(api) {
      props.fence(api, B);
      // 가운데 골조
      for (const x of [-3, 3]) for (const z of [-2, 2]) api.box(0.6, 6, 0.6, 0xb0aca2, x, 0, z, true);
      api.box(7, 0.4, 5, 0xb0aca2, 0, 6, 0);
      props.container(api, -13, -10.5, 0, 0x2f6fbf);
      const make = (kind, [x, z], hazard) => {
        if (kind === 'hole') props.hole(api, x, z, 2.2, 2.2, !hazard);
        if (kind === 'helmet') { const a = api.person(x, z, { noHelmet: hazard, rot: Math.random() * 6 }); a.g.rotation.y = Math.random() * 6; }
        if (kind === 'rail') props.scaffold(api, x, z, 5, 4, !hazard);
        if (kind === 'messy') props.pile(api, x, z, hazard);
        if (kind === 'load') { props.crane(api, x + 6 > B.x1 ? x - 6 : x + 6, z - 2, x, z); api.person(x + 0.6, z + 0.3, { rot: 2 }); }
        if (kind === 'wire') { api.box(4, 0.08, 0.1, 0x222222, x, 0, z); api.box(0.5, 0.1, 0.12, 0xd08a3a, x + 0.6, 0, z); api.box(1, 1, 0.6, 0x666666, x - 2.4, 0, z); }
        api.addSpot({ x, z, r: 2.8, icon: null, kind, hazard, act: '지적!' });
      };
      kinds.forEach((k, i) => make(k, slots[i], true));
      decoys.forEach((k, i) => make(k, slots[5 + i], false));
      api.lamp(-15, 12); api.lamp(15, -12);
    },
    onAction(spot, api) {
      if (!spot) return;
      if (spot.hazard) {
        found++; foundList.push(spot.kind); sfx('good');
        api.doneSpot(spot); spot.mark = api.label(`✅ ${HAZ[spot.kind].name}`, spot.x, 2.8, spot.z, 'mark done');
        api.setInfo(`지적! ${HAZ[spot.kind].name} → ${HAZ[spot.kind].fix}  (${found}/5)`);
        if (found >= 5) setTimeout(() => finish(api), 500);
      } else {
        wrong++; sfx('bad'); spot.done = true;
        api.label('🙆 이상 없음', spot.x, 2.8, spot.z, 'mark ok');
        api.setInfo('여긴 안전하게 잘 되어 있어요. 진짜 위험요소를 찾아요! (감점)');
      }
    },
    onTick(dt, api) {
      for (const s of api.spots) {
        if (!s.hazard || s.done || !HAZ[s.kind].stepR) continue;
        if (api.dist(s.x, s.z) < HAZ[s.kind].stepR && api.elapsed - lastStep > 1.5) {
          lastStep = api.elapsed; steps++; sfx('bad');
          api.setInfo(`⚠️ 위험해요! ${HAZ[s.kind].name}에 너무 가까이 갔어요 (감점)`);
          const dx = api.player.pos.x - s.x, dz = api.player.pos.z - s.z, d = Math.hypot(dx, dz) || 1;
          api.player.pos.x += dx / d * 1.2; api.player.pos.z += dz / d * 1.2;
        }
      }
    },
    onTimeUp: (api) => finish(api),
    onQuit: (api) => finish(api),
  });
  let fin = false;
  function finish(api) {
    if (fin) return; fin = true;
    const timeLeft = Math.ceil(api.timeLeft || 0);
    api.end(true);
    const pts = Math.max(0, found * 10 + Math.floor(timeLeft / 3) - steps * 5 - wrong * 3);
    const reward = Math.round((1 + found * 1.6 + timeLeft / 30) * stageMult);
    const m = openModal({ title: '🔦 안전 순찰 결과', body: '', cls: 'mg' });
    const missed = kinds.filter((k) => !foundList.includes(k));
    resultCard(m, { big: `위험요소 ${found} / 5 · ${pts}점`, reward, good: found >= 4,
      extra: h('div', { class: 'col gap6' },
        h('div', { class: 'tiny' }, `남은 시간 ${timeLeft}초 · 위험 구역 밟음 ${steps}회 · 잘못 지적 ${wrong}회`),
        missed.length ? h('div', { class: 'fb bad' }, '놓친 위험요소: ' + missed.map((k) => `${HAZ[k].name}(${HAZ[k].fix})`).join(', ')) : h('div', { class: 'fb good' }, '모든 위험요소를 찾았어요!')),
      lesson: '위험성평가의 첫걸음은 "찾기"예요. 유해·위험요인 파악 → 위험성 결정 → 감소대책 → 기록·공유 순서로 해요. 순찰은 매일, 찾은 건 바로 조치!' });
    onFinish?.({ reward, found });
    return m;
  }
  return w;
}

/* ================= 현장 3. 유리창 안전하게 옮기기 ================= */
export function runGlass({ stageMult = 1, lang = 'ko', onFinish }) {
  const B = { x0: -6, x1: 6, z0: -27, z1: 6 };
  let hits = 0, breaks = 0, solo = 0, wobble = 0, fast = 0, soloT = 0, reached = false, fin = false, lastHit = 0;
  const holes = [{ x: -2.5, z: -5 }, { x: 2.8, z: -17 }];
  const hist = [];
  let mate, glass, fork, forkC;
  const w = openWalk({
    title: '🔷 유리창 안전하게 옮기기', info: '동료와 2인 1조! 천천히 초록 칸까지 옮겨요', actionLabel: '도착!', timeLimit: 90,
    bounds: B, start: { x: 0, z: 3 }, ground: 0xb7b2a6, speed: 4.2, camOffset: [0, 12, 9], autoAction: false,
    build(api) {
      api.carrying = true;
      api.box(12, 0.05, 3, 0x7ad36b, 0, 0, -25);
      api.label('🏁 설치 장소', 0, 1.5, -25, 'mark');
      holes.forEach((p) => { props.hole(api, p.x, p.z, 2.4, 2.4, false); api.label('🕳️', p.x, 1.2, p.z, 'mark'); });
      props.pile(api, 3.5, -9); props.pile(api, -3.5, -13); props.pile(api, 1, -21, true);
      api.box(0.3, 3, 33, 0xd8d4c8, -6.1, 0, -10.5); api.box(0.3, 3, 33, 0xd8d4c8, 6.1, 0, -10.5);
      mate = api.person(0, 5.2, { vest: 0x3a7bd5 });
      glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.55 }));
      api.scene.add(glass);
      fork = api.group(0, -11);
      api.addBox(fork, 1.6, 1.2, 2.6, 0xffb020, 0, 0.3, 0); api.addBox(fork, 1.4, 1.4, 1, 0x333333, 0, 1.5, -0.4);
      api.addBox(fork, 0.1, 2.6, 0.1, 0x555555, -0.5, 0.2, 1.4); api.addBox(fork, 0.1, 2.6, 0.1, 0x555555, 0.5, 0.2, 1.4);
      forkC = api.collider(-0.9, -12.4, 0.9, -9.6);
      api.button('💪 혼자 들기', () => {
        solo++; soloT = 3; sfx('bad');
        api.setInfo('⚠️ 허리 다쳐요! 크고 무거운 유리는 꼭 2인 1조로 들어요');
      }, 'bad');
    },
    onTick(dt, api) {
      const p = api.player.pos;
      hist.push(p.clone()); if (hist.length > 40) hist.shift();
      // 동료는 뒤에서 따라온다 (약 2.2m 간격)
      let tgt = hist[0];
      for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].distanceTo(p) >= 2.2) { tgt = hist[i]; break; } }
      if (tgt.distanceTo(p) >= 1.8) mate.g.position.lerp(tgt, Math.min(1, dt * 8));
      mate.g.lookAt(p.x, 0, p.z);
      mate.g.userData.armL.rotation.x = mate.g.userData.armR.rotation.x = -1.3;
      const mid = new THREE.Vector3().addVectors(p, mate.g.position).multiplyScalar(0.5);
      glass.position.set(mid.x, 1.6 + Math.sin(api.elapsed * 30) * wobble * 0.08, mid.z);
      glass.rotation.y = Math.atan2(p.x - mate.g.position.x, p.z - mate.g.position.z) + Math.PI / 2;
      glass.rotation.z = Math.sin(api.elapsed * 25) * wobble * 0.15;
      // 지게차 왕복
      const fx = Math.sin(api.elapsed * 0.9) * 3.5;
      fork.position.x = fx; fork.rotation.y = Math.cos(api.elapsed * 0.9) > 0 ? Math.PI / 2 : -Math.PI / 2;
      forkC.x0 = fx - 1.4; forkC.x1 = fx + 1.4; forkC.z0 = -12; forkC.z1 = -10;
      const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
      if (api.elapsed - lastHit > 1.5) {
        if (Math.abs(p.x - fx) < 2.2 && Math.abs(p.z + 11) < 1.9) { hit(api, '🚜 지게차! 멈춰서 지나가길 기다려요'); p.z = p.z > -11 ? -8.2 : -13.8; }
        for (const ho of holes) if (near(ho.x, ho.z, 1.5)) { hit(api, '🕳️ 개구부! 옮기기 전에 통로를 확인해요'); p.z += 1.6; }
      }
      soloT = Math.max(0, soloT - dt);
      api.speedMul = soloT > 0 ? 0.4 : 1;
      if (api.player.moving > 0.85) fast += dt; else fast = Math.max(0, fast - dt * 1.5);
      wobble = Math.max(0, Math.min(1.2, wobble + (fast > 0.8 ? dt * 0.9 : -dt * 0.6)));
      if (wobble >= 1.2) {
        breaks++; wobble = 0; fast = 0; sfx('bad');
        api.setInfo('💥 너무 빨라서 유리가 흔들리다 깨졌어요! 처음부터 천천히');
        p.set(0, 0, 3); mate.g.position.set(0, 0, 5.2); hist.length = 0;
      }
      if (api.elapsed % 1 < dt) api.setInfo(`흔들림 ${'■'.repeat(Math.round(wobble * 5))}${'□'.repeat(Math.max(0, 6 - Math.round(wobble * 5)))} · 부딪힘 ${hits} · 깨짐 ${breaks}`);
      if (p.z < -23.5) { reached = true; finish(api); }
    },
    onTimeUp: (api) => finish(api),
    onQuit: (api) => finish(api),
  });
  function hit(api, msg) { hits++; lastHit = api.elapsed; wobble = Math.min(1.1, wobble + 0.35); sfx('thud'); api.setInfo(msg); }
  function finish(api) {
    if (fin) return; fin = true;
    const timeLeft = Math.ceil(api.timeLeft || 0);
    api.end(true);
    const ok = reached && breaks === 0;
    const reward = Math.round((2 + (reached ? 5 : 0) + Math.max(0, 3 - hits) - Math.min(2, solo)) * stageMult);
    const m = openModal({ title: '🔷 유리 옮기기 결과', body: '', cls: 'mg' });
    resultCard(m, { big: reached ? (breaks ? `도착! (깨짐 ${breaks}번)` : '🎉 안전하게 도착!') : '시간 초과', reward: Math.max(1, reward), lessonId: 'glass', lang, good: ok,
      extra: h('div', { class: 'tiny' }, `남은 시간 ${timeLeft}초 · 부딪힘 ${hits} · 깨짐 ${breaks} · 혼자 들기 ${solo}번`) });
    onFinish?.({ reward: Math.max(1, reward), ok });
  }
  return w;
}
