// 첫 삽 v19.1 — 랙앤피니언식 건설용 리프트(호이스트). 코드 모델, 1단위 = 1m. 모양 근거·치수: docs/모델_치수.md
// 좌표: 건물 외벽(슬래브 끝)이 z=0, 리프트는 +z 쪽. 리프트 가운데(마스트)가 x=0. y=0 은 지면.
//   z: 0 ── 연결 발판 ── gateZ(층 출입문) ── 틈 ── 운반구(깊이 1.4) ── 마스트
// makeConstructionHoist(THREE, M, opts, RB) → THREE.Group (부품은 이름 붙인 노드)
//   opts = { floors:[슬래브 윗면 y...], top: 마스트 높이, twin:true, cages:[운반구 바닥 y | null, ...](마스트 오른쪽 +x, 왼쪽 -x),
//            gates:{ '<층번호>': true(열림) }, skipGates:[[운반구, 층]], lod:'near'|'far', bridge:1.2 }
//   운반구·층 출입문은 따로도 만들 수 있게 makeCage / makeLandingGate 를 내보낸다 (위험/안전 버전에서 하나만 바꿀 때)
// 근거(원문확인): 「위험기계·기구 안전인증 고시」(고용노동부고시 제2023-46호) [별표 3] 건설용 리프트
//   제9호 나목 벽 연결재(수평 지지대) 최하부 6m 이내·매 18m 이내·최상부 / 제14호 라목 바닥 방호울 1.8m 이상 + 연동 안전문
//   제14호 마목 화물반입구 안전문(운반구가 정지해 있지 않은 층에서는 외부에서 못 엶), 틈 150mm 초과 시 1.1m 이상 안전난간
//   제14호 아목 케이블 가이드 간격 6m 이하 / 제15호 나목 운반구 출입문 연동, 라목 운반구 바닥 끝 ↔ 건물 바닥 60mm 이하
//   제16호 적재하중 표시는 운반구 전면, 운반구 상부 110cm 이상 상부난간대 + 중간난간대
// 형태·비율 참고(모양만, 원문 미확인): 제조사 공개 자료(운반구 폭 1.4 × 길이 2.4~3.2 × 높이 약 2.0, 마스트 섹션 1.508m) — 사용자 제공 값

export const HOIST = { cageW: 3.0, cageD: 1.4, cageH: 2.2, mast: 0.65, section: 1.508, gap: 0.05, gateH: 2.1, enclosureH: 1.8, tieFirst: 6, tieEvery: 18 };

const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';
let meshTex = null;
// 철망: 가는 격자 알파 텍스처 (속이 비쳐 보이게)
function meshMat(THREE, M, key = 'steel', cell = 0.06) {
  if (!meshTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 5;
    for (const p of [2, 34]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 64); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(64, p); g.stroke(); }
    meshTex = new THREE.CanvasTexture(c); meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  }
  const base = M(key); const m = new THREE.MeshStandardMaterial({ color: base.color.clone(), roughness: 0.5, metalness: 0.55, alphaMap: meshTex, alphaTest: 0.45, side: THREE.DoubleSide });
  m.userData = { kind: base.userData?.kind || 'steel', meshCell: cell }; return m;
}
// 철망 판 하나 (w × h, 수직, z 쪽을 향함) — 셀 크기를 판 크기에 맞춤
function meshPanel(THREE, M, w, h, key) {
  const m = meshMat(THREE, M, key); const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.12, uv.getY(i) * h / 0.12);
  const p = new THREE.Mesh(geo, m); p.castShadow = true; return p;
}

function kit(THREE, M, RB, far = false) {
  const box = (w, h, d, mat, x, y, z, parent) => { const geo = RB && Math.min(w, h, d) >= 0.03 && Math.max(w, h, d) <= 4 ? new RB(w, h, d, 2, Math.min(0.012, Math.min(w, h, d) * 0.3)) : new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const rod = (a, b, r, mat, parent, seg = far ? 4 : 8) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), far ? Math.min(seg, 4) : seg), typeof mat === 'string' ? M(mat) : mat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = true; parent.add(m); return m; };
  const node = (name, parent) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };
  return { box, rod, node };
}

// 운반구(케이지): 바닥 y=0 기준, 앞문(-z, 건물 쪽) · 뒷문(+z). 길이 x 3.0 · 깊이 z 1.4 · 높이 2.2
export function makeCage(THREE, M, o = {}, RB = null) {
  const { box, rod, node } = kit(THREE, M, RB, o.lod === 'far');
  const { lod = 'near', frontOpen = false, backOpen = false, color = 'paint:yellow', side = 1 } = o;
  const W = HOIST.cageW, D = HOIST.cageD, Hh = HOIST.cageH;
  const cage = new THREE.Group(); cage.name = 'cage';
  const FR = color, ST = 'steel';
  box(W, 0.12, D, 'steel:--art-concrete-dark', 0, -0.12, 0, cage); // 바닥판 (체커 철판)
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) box(0.07, Hh, 0.07, FR, x, 0, z, cage); // 모서리 기둥
  for (const y of [0, 1.05, Hh - 0.06]) { box(W, 0.06, 0.06, FR, 0, y, -D / 2, cage); box(W, 0.06, 0.06, FR, 0, y, D / 2, cage); box(0.06, 0.06, D, FR, -W / 2, y, 0, cage); box(0.06, 0.06, D, FR, W / 2, y, 0, cage); }
  box(W, 0.32, 0.03, FR, 0, 0, D / 2 - 0.02, cage).visible = true; // 아래 걸레받이 (뒤)
  box(0.03, 0.32, D, FR, -side * W / 2, 0, 0, cage); // 바깥쪽 옆 걸레받이
  if (lod === 'near') {
    // 철망 벽: 바깥쪽 옆면·뒤 위쪽
    const sideMesh = meshPanel(THREE, M, D - 0.08, Hh - 0.38, ST); sideMesh.rotation.y = Math.PI / 2; sideMesh.position.set(-side * W / 2, 0.32 + (Hh - 0.38) / 2, 0); cage.add(sideMesh);
    const innerMesh = meshPanel(THREE, M, D - 0.08, Hh - 0.1, ST); innerMesh.rotation.y = Math.PI / 2; innerMesh.position.set(side * W / 2, (Hh - 0.1) / 2 + 0.02, 0); cage.add(innerMesh); // 마스트 쪽
  } else { box(0.02, Hh - 0.4, D, M(ST, { transparent: true, opacity: 0.45 }), -side * W / 2, 0.32, 0, cage); }
  // 지붕판 + 지붕 위 난간(110cm 상부난간대 + 중간난간대, 별표 3 제16호)
  box(W + 0.06, 0.06, D + 0.06, 'steel', 0, Hh, 0, cage);
  const roof = node('cage_roof_rail', cage);
  for (const [x, z] of [[-W / 2, -D / 2], [-W / 2, D / 2], [W / 2 - 0.9, -D / 2], [W / 2 - 0.9, D / 2], [0, D / 2], [0, -D / 2]]) box(0.04, 1.1, 0.04, FR, x, Hh + 0.06, z, roof);
  for (const y of [0.55, 1.1]) { rod([-W / 2, Hh + 0.06 + y, -D / 2], [W / 2 - 0.9, Hh + 0.06 + y, -D / 2], 0.02, FR, roof); rod([-W / 2, Hh + 0.06 + y, D / 2], [W / 2 - 0.9, Hh + 0.06 + y, D / 2], 0.02, FR, roof); rod([-W / 2, Hh + 0.06 + y, -D / 2], [-W / 2, Hh + 0.06 + y, D / 2], 0.02, FR, roof); }
  // 문: 위로 올라가는 철망 문 (열림 = 위로 1.9m)
  const door = (name, z, open) => {
    const d = node(name, cage); d.position.set(0, open ? 1.9 : 0, z);
    const fw = W - 0.2, fh = 1.95;
    for (const x of [-fw / 2, fw / 2]) box(0.05, fh, 0.05, FR, x, 0.02, 0, d);
    for (const y of [0.02, fh - 0.03, 1.0]) box(fw, 0.05, 0.05, FR, 0, y, 0, d);
    if (lod === 'near') { const p = meshPanel(THREE, M, fw - 0.06, fh - 0.08, ST); p.position.set(0, fh / 2 + 0.02, 0); d.add(p); }
    else box(fw, fh, 0.02, M(ST, { transparent: true, opacity: 0.45 }), 0, 0.02, 0, d);
    return d;
  };
  // 앞문(층 쪽): 경사로식 — 아래 경첩, 열리면 바깥으로 눕혀져 층 발판 위에 걸치는 발판이 됨 (제조사 "gate and ramp" 방식, 모양 참고)
  const ramp = node('cage_door_front', cage); ramp.position.set(0, 0, -D / 2 - 0.03); ramp.rotation.x = frontOpen ? -Math.PI / 2 + 0.06 : 0;
  { const fw = W - 0.2, fh = 1.95; box(fw, fh, 0.04, 'steel:--art-concrete-dark', 0, 0, 0, ramp); for (const x of [-fw / 2, fw / 2]) box(0.06, fh, 0.07, FR, x, 0, -0.01, ramp); for (const y of [0, fh - 0.06, 0.95]) box(fw, 0.06, 0.07, FR, 0, y, -0.01, ramp);
    if (lod === 'near') for (let k = 0; k < 6; k++) box(fw - 0.2, 0.025, 0.02, 'steel', 0, 0.2 + k * 0.28, -0.035, ramp); } // 미끄럼 방지 줄
  door('cage_door_back', D / 2 + 0.04, backOpen);
  if (lod === 'far') { box(W - 0.2, 0.4, D - 0.3, 'plastic:orange', 0, Hh + 0.06, 0, cage); return cage; } // 지도용: 구동부를 한 덩어리로
  // 조작반: 안쪽 벽(마스트 쪽), 노랑 판 + 빨간 비상정지
  const cp = node('control_panel', cage);
  box(0.12, 0.45, 0.36, 'paint:gray', side * (W / 2 - 0.12), 1.0, 0.2, cp); box(0.02, 0.3, 0.24, 'paint:yellow', side * (W / 2 - 0.19), 1.08, 0.2, cp);
  const es = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16), M('paint:red', { glow: 0.2 })); es.rotation.z = Math.PI / 2; es.position.set(side * (W / 2 - 0.21), 1.3, 0.2); cp.add(es);
  // 적재하중 표시판 (뒷면 = 바깥 전면 위쪽, 글자 없이 무게 추 + 사람 그림)
  const ls = node('load_sign', cage);
  box(0.7, 0.36, 0.02, 'paint:white', -0.6, Hh - 0.5, D / 2 + 0.09, ls);
  box(0.16, 0.14, 0.02, 'paint:navy', -0.78, Hh - 0.42, D / 2 + 0.105, ls); box(0.08, 0.04, 0.02, 'paint:navy', -0.78, Hh - 0.28, D / 2 + 0.105, ls); // 무게 추
  for (let k = 0; k < 3; k++) { const hx = -0.55 + k * 0.1; box(0.05, 0.12, 0.02, 'paint:navy', hx, Hh - 0.44, D / 2 + 0.105, ls); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), M('paint:navy')); hd.position.set(hx, Hh - 0.29, D / 2 + 0.11); ls.add(hd); } // 사람 3
  // 구동부: 지붕 위 마스트 쪽 모터 2 (주황 커버) + 감속기 + 피니언
  const dr = node('drive_unit', cage);
  for (const z of [-0.35, 0.25]) { box(0.45, 0.42, 0.42, 'plastic:orange', side * (W / 2 - 0.45), Hh + 0.06, z, dr); box(0.22, 0.3, 0.3, 'paint:dark', side * (W / 2 - 0.12), Hh + 0.1, z, dr);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 14), M('paint:dark')); pin.rotation.z = Math.PI / 2; pin.position.set(side * (W / 2 + 0.02), Hh + 0.25, z); dr.add(pin); }
  // 운반구 아래 케이블 연결부
  box(0.18, 0.12, 0.18, 'rubber', -side * 0.6, -0.24, D / 2 - 0.2, cage);
  return cage;
}

// 층 출입문(화물반입구 안전문): 노랑 프레임 + 옆으로 미는 철망 문 2짝 + 위 경광등. 폭 w(문틀 안쪽), 열림 = 양옆으로 밀림
export function makeLandingGate(THREE, M, o = {}, RB = null) {
  const { box, node } = kit(THREE, M, RB, o.lod === 'far');
  const { open = false, w = 2.0, lod = 'near', name = 'landing_gate' } = o;
  const g = new THREE.Group(); g.name = name; const H = HOIST.gateH, FR = 'paint:yellow';
  for (const x of [-w / 2 - 0.06, w / 2 + 0.06]) box(0.08, H + 0.15, 0.08, FR, x, 0, 0, g);
  box(w + 0.2, 0.1, 0.1, FR, 0, H + 0.05, 0, g); box(w + 0.2, 0.06, 0.12, FR, 0, 0, 0, g); // 위 보 + 문턱
  const leaf = (dir) => {
    const l = node('gate_leaf', g); const lw = w / 2; l.position.set(dir * (open ? w * 0.75 : lw / 2), 0, dir > 0 ? 0.06 : -0.06);
    for (const x of [-lw / 2, lw / 2]) box(0.045, H - 0.05, 0.045, FR, x, 0.04, 0, l);
    for (const y of [0.04, H - 0.06, 1.0]) box(lw, 0.045, 0.045, FR, 0, y, 0, l);
    if (lod === 'near') { const p = meshPanel(THREE, M, lw - 0.05, H - 0.12, 'steel'); p.position.set(0, H / 2, 0); l.add(p); }
    else box(lw, H - 0.1, 0.02, M('steel', { transparent: true, opacity: 0.45 }), 0, 0.05, 0, l);
  };
  leaf(-1); leaf(1);
  // 열린 문짝이 밀려 들어갈 옆 고정 철망 (문틀 밖)
  for (const dir of [-1, 1]) { box(0.06, H, 0.06, FR, dir * (w + 0.12), 0, 0, g); if (lod === 'near') { const p = meshPanel(THREE, M, w / 2 - 0.1, H - 0.1, 'steel'); p.position.set(dir * (w * 0.78 + 0.08), H / 2, dir > 0 ? 0.12 : -0.12); g.add(p); } }
  if (lod === 'far') return g;
  // 경광등 (문 위)
  const lamp = node('gate_lamp', g); box(0.16, 0.06, 0.12, 'paint:dark', 0, H + 0.15, 0, lamp);
  const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 14), M('plastic:orange', { glow: 0.6 })); bulb.position.set(0, H + 0.27, 0); lamp.add(bulb);
  return g;
}

// 리프트 전체
export function makeConstructionHoist(THREE, M, opts = {}, RB = null) {
  const { box, rod, node } = kit(THREE, M, RB, opts.lod === 'far');
  const { floors = [3, 6, 9, 12], top = 16.5, twin = true, cages = [0, null], gates = {}, skipGates = [], lod = 'near', bridge = 1.2 } = opts;
  const root = new THREE.Group(); root.name = 'constructionHoist';
  const m = HOIST.mast, W = HOIST.cageW, D = HOIST.cageD;
  const gateZ = bridge, cageZ = gateZ + HOIST.gap + 0.06 + D / 2, mastZ = cageZ; // 운반구와 마스트가 같은 z 줄(트윈: 마스트 양옆)
  const cx = (s) => s * (m / 2 + 0.12 + W / 2); // 운반구 가운데 x
  const sides = twin ? [1, -1] : [1];
  const GALV = 'steel', RACK = 'steel:--art-dark';
  // 기초
  const base = node('base_frame', root); box(5 + (twin ? W * 2 : W), 0.25, D + 2.6, 'concrete', 0, -0.2, mastZ, base); if (lod === 'near') box(1.2, 0.12, 1.2, GALV, 0, 0.05, mastZ, base);
  // 마스트: 네 모서리 강관 + 섹션마다 수평재·대각 가새 + 이음 플랜지
  const mast = node('mast', root);
  const cs = [[-m / 2, -m / 2], [m / 2, -m / 2], [m / 2, m / 2], [-m / 2, m / 2]];
  for (const [x, z] of cs) rod([x, 0.15, mastZ + z], [x, top, mastZ + z], 0.038, GALV, mast, lod === 'near' ? 10 : 6);
  const nSec = Math.ceil((top - 0.15) / HOIST.section);
  for (let s = 0; s < nSec; s++) {
    const y0 = 0.15 + s * HOIST.section, y1 = Math.min(top, y0 + HOIST.section);
    if (lod === 'far' && s % 2) continue;
    for (let f = 0; f < 4; f++) { const [ax, az] = cs[f], [bx, bz] = cs[(f + 1) % 4];
      rod([ax, y0 + 0.05, mastZ + az], [bx, y0 + 0.05, mastZ + bz], 0.016, GALV, mast, 6);
      if (lod === 'near') rod([ax, y0 + 0.08, mastZ + az], [bx, y1 - 0.08, mastZ + bz], 0.014, GALV, mast, 6); }
    if (lod === 'near') for (const [x, z] of cs) box(0.13, 0.025, 0.13, GALV, x, y0 - 0.012, mastZ + z, mast); // 섹션 이음판(플랜지)
  }
  box(m + 0.1, 0.05, m + 0.1, GALV, 0, top, mastZ, mast); // 최상단 덮개
  // 랙: 운반구 쪽 면(±x)에 세로 톱니 막대
  const rack = node('rack', root);
  for (const s of sides) {
    box(0.04, top - 0.3, 0.06, RACK, s * (m / 2 + 0.03), 0.3, mastZ, rack);
    if (lod === 'near') { const pitch = 0.08, n = Math.floor((top - 0.4) / pitch); const tooth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.035, 0.07), M(RACK), n); const mm = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { mm.makeTranslation(s * (m / 2 + 0.065), 0.4 + i * pitch, mastZ); tooth.setMatrixAt(i, mm); } tooth.castShadow = true; rack.add(tooth); }
  }
  // 벽 연결재(타이): 6m 이내 첫 지지 + 18m 이내 간격 + 최상부 (별표 3 제9호 나목)
  const ties = node('ties', root); const tieYs = [];
  for (let y = Math.min(HOIST.tieFirst - 1.5, top - 1); y < top - 2; y += HOIST.tieEvery - 3) tieYs.push(y); tieYs.push(top - 1.2);
  for (const y of tieYs) { const a = [-m / 2, y, mastZ - m / 2], b = [m / 2, y, mastZ - m / 2];
    rod(a, [-0.9, y, 0.05], 0.035, GALV, ties); rod(b, [0.9, y, 0.05], 0.035, GALV, ties); rod([-0.9, y, 0.05], [0.9, y, 0.05], 0.03, GALV, ties); rod([0, y, mastZ - m / 2], [0, y, 0.05], 0.03, GALV, ties);
    for (const x of [-0.9, 0.9]) box(0.25, 0.25, 0.03, GALV, x, y - 0.125, 0.015, ties); } // 슬래브 고정판
  // 하부 방호울 (높이 1.8m, 출입문 1개) + 완충기
  const enc = node('base_enclosure', root); let encDoor = null; const ex = twin ? W * 2 + m + 1.0 : W + m + 1.2, ez0 = gateZ + 0.15, ez1 = mastZ + D / 2 + 0.6, eH = HOIST.enclosureH;
  const fence = (a, b, skipMid) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 2)); for (let i = 0; i <= n; i++) box(0.06, eH, 0.06, 'paint:yellow', a[0] + (b[0] - a[0]) * i / n, 0, a[1] + (b[1] - a[1]) * i / n, enc);
    for (let i = 0; i < n; i++) { if (skipMid && i === Math.floor(n / 2)) { const xa = a[0] + (b[0] - a[0]) * i / n, xb = a[0] + (b[0] - a[0]) * (i + 1) / n; encDoor = { x0: xa, x1: xb, z: a[1] }; continue; } const x0 = a[0] + (b[0] - a[0]) * i / n, z0 = a[1] + (b[1] - a[1]) * i / n, x1 = a[0] + (b[0] - a[0]) * (i + 1) / n, z1 = a[1] + (b[1] - a[1]) * (i + 1) / n, sl = Math.hypot(x1 - x0, z1 - z0);
      if (lod === 'near') { const p = meshPanel(THREE, M, sl - 0.06, eH - 0.12, 'steel'); p.position.set((x0 + x1) / 2, eH / 2 + 0.04, (z0 + z1) / 2); p.rotation.y = -Math.atan2(z1 - z0, x1 - x0); enc.add(p); }
      else { const p = box(sl - 0.06, eH - 0.1, 0.02, M('steel', { transparent: true, opacity: 0.4 }), (x0 + x1) / 2, 0.05, (z0 + z1) / 2, enc); p.rotation.y = -Math.atan2(z1 - z0, x1 - x0); }
      if (lod === 'near') rod([x0, eH, z0], [x1, eH, z1], 0.025, 'paint:yellow', enc); } };
  fence([-ex / 2, ez1], [ex / 2, ez1], true); fence([-ex / 2, ez0], [-ex / 2, ez1]); fence([ex / 2, ez0], [ex / 2, ez1]);
  // 방호울 출입문 (철망 + 노랑 테, 닫힘). 장면에서 열고 닫을 때는 이 노드를 숨기고 makeEnclosureDoor 로 따로 그림
  const ed = makeEnclosureDoor(THREE, M, { w: encDoor.x1 - encDoor.x0 - 0.08, h: eH - 0.1, lod }, RB); ed.position.set(encDoor.x0 + 0.04, 0.05, encDoor.z + 0.05); enc.add(ed);
  const shelf = node('protection_canopy', root), sy = 2.6, sw = 2.0; shelf.visible = lod === 'near'; // 지도에서는 방호울을 가려서 생략
  const plate = (w, d, x, z, rx, rz) => { const m = box(w, 0.05, d, 'plywood', x, sy, z, shelf); m.rotation.set(rx, 0, rz); return m; };
  plate(ex + sw * 2, sw, 0, ez1 + sw / 2, 0.12, 0); plate(sw, ez1 - ez0, -ex / 2 - sw / 2, (ez0 + ez1) / 2, 0, -0.12); plate(sw, ez1 - ez0, ex / 2 + sw / 2, (ez0 + ez1) / 2, 0, 0.12);
  for (const [x, z] of [[-ex / 2, ez1], [ex / 2, ez1], [-ex / 2, ez0], [ex / 2, ez0]]) { box(0.08, sy, 0.08, 'paint:yellow', x, 0, z, shelf); if (lod === 'near') rod([x, sy - 0.6, z], [x + Math.sign(x) * (z === ez1 ? 0 : sw * 0.9), sy, z + (z === ez1 ? sw * 0.9 : 0)], 0.03, 'steel', shelf); }
  const buf = node('buffer', root);
  if (lod === 'near') for (const s of sides) for (const dz of [-0.35, 0.35]) { box(0.3, 0.05, 0.3, GALV, cx(s), 0, cageZ + dz, buf);
    for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 6, 14), M('rubber')); t.rotation.x = Math.PI / 2; t.position.set(cx(s), 0.1 + k * 0.07, cageZ + dz); buf.add(t); } }
  // 연결 발판 + 층 출입문 (층마다, 운반구마다). 발판 양옆 안전난간 1.1m (별표 3 제14호 마목)
  floors.forEach((fy, fi) => {
    for (const s of sides) {
      if (skipGates.some(([a, b]) => a === s && b === fi)) continue;
      const br = node(`landing_bridge_${fi}`, root); const bx = cx(s), bw = 2.2;
      box(bw, 0.06, gateZ, 'steel:--art-concrete-dark', bx, fy - 0.06, gateZ / 2, br);
      for (const dx of [-bw / 2, bw / 2]) { for (const z of [0.05, gateZ - 0.05]) box(0.05, 1.1, 0.05, 'paint:yellow', bx + dx, fy, z, br);
        rod([bx + dx, fy + 1.1, 0.05], [bx + dx, fy + 1.1, gateZ - 0.05], 0.022, 'paint:yellow', br); rod([bx + dx, fy + 0.55, 0.05], [bx + dx, fy + 0.55, gateZ - 0.05], 0.02, 'paint:yellow', br);
        box(0.025, 0.15, gateZ, 'paint:yellow', bx + dx, fy, gateZ / 2, br); }
      const gt = makeLandingGate(THREE, M, { open: !!gates[`${s}:${fi}`], w: 1.9, lod, name: `landing_gate_${fi}` }, RB); gt.position.set(bx, fy, gateZ); root.add(gt);
    }
  });
  // 운반구
  sides.forEach((s, i) => { const y = cages[i]; if (y == null) return; const c = makeCage(THREE, M, { lod, side: -s }, RB); c.position.set(cx(s), y, cageZ); c.name = i ? 'cage_2' : 'cage'; root.add(c); });
  // 전원 케이블(U자) + 마스트 케이블 가이드(6m 이하 간격, 별표 3 제14호 아목)
  const cab = node('cable', root);
  if (lod === 'near') sides.forEach((s, i) => { const y = cages[i]; if (y == null || y < 1) return;
    const x = cx(s) + s * 0.6 * -1, z = cageZ + D / 2 - 0.2, mid = Math.max(0.6, y / 2 - 0.3);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y - 0.3, z), new THREE.Vector3(x, mid, z + 0.05), new THREE.Vector3(x + s * 0.25, 0.45, z + 0.1), new THREE.Vector3(x + s * 0.5, mid * 0.5 + 0.3, z + 0.12)]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.025, 6), M('rubber')); t.castShadow = true; cab.add(t); });
  if (lod === 'near') box(0.7, 0.6, 0.7, 'paint:dark', cx(1) + 0.2, 0, cageZ + 0.6, cab); // 케이블 바스켓
  if (lod === 'near') for (let y = 3; y < top - 1; y += 6) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 14), M(GALV)); ring.position.set(m / 2 + 0.15, y, mastZ + m / 2 + 0.1); ring.rotation.y = Math.PI / 2; cab.add(ring); }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData = { gateZ, cageZ, mastZ, cx, encDoor: { ...encDoor, z: encDoor.z + 0.05, w: encDoor.x1 - encDoor.x0 - 0.08, h: eH - 0.1 } };
  return root;
}

// 하부 방호울 출입문: 왼쪽 경첩(x=0)에서 +x 로 w, 높이 h. open = 바깥(+z)으로 90° 열림
export function makeEnclosureDoor(THREE, M, o = {}, RB = null) {
  const { box } = kit(THREE, M, RB, o.lod === 'far');
  const { w = 1.8, h = 1.7, open = false, lod = 'near' } = o;
  const g = new THREE.Group(); g.name = 'base_enclosure_door'; g.rotation.y = open ? -Math.PI / 2 + 0.15 : 0;
  for (const x of [0.03, w - 0.03]) box(0.06, h, 0.06, 'paint:yellow', x, 0, 0, g);
  for (const y of [0, h - 0.06, h / 2]) box(w, 0.06, 0.06, 'paint:yellow', w / 2, y, 0, g);
  if (lod === 'near') { const p = meshPanel(THREE, M, w - 0.1, h - 0.1, 'steel'); p.position.set(w / 2, h / 2, 0); g.add(p); }
  return g;
}
