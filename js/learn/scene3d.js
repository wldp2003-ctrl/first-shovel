// 첫 삽 v15 — 근로자 눈높이(1.6m) 3D 위험 장면 (three.js). 단면 그림 대신 "현장에 서서 본 모습"
// makeScene3D(id, { on }) → { canvas, areas(), setOn(ids), render(), pairs(), dispose() } | null (WebGL 없으면 null → 그림으로)
//  - 위험마다 위험한 모습(bad) / 안전한 모습(good) 두 벌을 만들어 켜고 끈다 (무작위 출제, 비교 그림)
//  - areas(): 위험·함정 위치를 화면(400×300 좌표)에 투영 → 누를 곳 (반지름 30 = 휴대전화에서 지름 약 54px)
//  - pairs(): 위험마다 같은 장면을 가까이 찍은 두 장(위험 켬/끔) → dataURL
// 색은 css/tokens.css 토큰(그림 팔레트 --art-* 포함)에서만. 글자·로고·실존 인물 없음.
import * as Pr from './props3d.js';
let THREE = null;
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';
export async function load3d() { if (!THREE) THREE = await import('../../vendor/three.module.js'); return THREE; }
export function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

/* ---------------- 재질 (캔버스 무늬) ---------------- */
const texCache = new Map();
function shade(hex, k) { const n = parseInt(hex.replace('#', ''), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function canvasTex(key, draw, rep = 1) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d'), 256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t); return t;
}
function texSpeckle(name, rep, amount, spread) { return canvasTex(name + rep, (g, s) => { const hex = tok('--' + name); g.fillStyle = hex; g.fillRect(0, 0, s, s); for (let i = 0; i < amount; i++) { g.fillStyle = shade(hex, 1 + (Math.random() - 0.5) * spread * 2); const r = Math.random() * 4 + 0.6; g.fillRect(Math.random() * s, Math.random() * s, r, r); } for (let i = 0; i < 6; i++) { g.fillStyle = shade(hex, 0.93); g.globalAlpha = 0.25; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 20 + Math.random() * 40, 0, 7); g.fill(); g.globalAlpha = 1; } }, rep); }
function texPlywood(rep = 1) { return canvasTex('ply' + rep, (g, s) => { const hex = tok('--art-wood'); g.fillStyle = hex; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 3) { g.strokeStyle = shade(hex, 0.86 + Math.random() * 0.2); g.lineWidth = 1 + Math.random(); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x / 30 + y) * 2); g.stroke(); } }, rep); }
function texStripes() { return canvasTex('stripes', (g, s) => { g.fillStyle = tok('--brand'); g.fillRect(0, 0, s, s); g.fillStyle = tok('--asphalt'); for (let k = -s; k < s * 2; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 32, 0); g.lineTo(k + 32 - s, s); g.lineTo(k - s, s); g.fill(); } }, 1); }
function texFacade(rep = 1) { return canvasTex('fac' + rep, (g, s) => { g.fillStyle = tok('--art-wall'); g.fillRect(0, 0, s, s); for (let y = 16; y < s; y += 64) for (let x = 12; x < s; x += 64) { g.fillStyle = tok('--art-concrete-dark'); g.fillRect(x - 3, y - 3, 46, 38); g.fillStyle = tok('--art-glass'); g.fillRect(x, y, 40, 32); g.fillStyle = shade(tok('--art-glass'), 1.12); g.fillRect(x + 2, y + 2, 14, 28); } }, rep); }
function texVest() { return canvasTex('vest', (g, s) => { g.fillStyle = tok('--vest'); g.fillRect(0, 0, s, s); g.fillStyle = tok('--art-wall'); g.fillRect(0, s * 0.42, s, s * 0.09); g.fillRect(0, s * 0.62, s, s * 0.09); }, 1); }
function texSky() { return canvasTex('sky', (g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, tok('--art-glass')); gr.addColorStop(0.75, tok('--art-sky')); gr.addColorStop(1, tok('--bg')); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, 1); }

/* ---------------- 조립 도구 ---------------- */
function kit(root) {
  const mats = new Map();
  const M = (c, opt = {}) => { const k = c + JSON.stringify(opt); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c.startsWith('--') ? new THREE.Color(tok(c)) : 0xffffff, ...opt })); return mats.get(k); };
  const T = (map) => { const k = 'tex' + map.uuid; if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ map })); return mats.get(k); };
  let cur = root;
  const put = (mesh, x, y, z, ry = 0) => { mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.castShadow = true; mesh.receiveShadow = true; cur.add(mesh); return mesh; };
  const K = {
    M, T, get cur() { return cur; },
    box: (w, h, d, m, x, y, z, ry) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? M(m) : m), x, y + h / 2, z, ry),
    cyl: (r, h, m, x, y, z, seg = 10) => put(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), typeof m === 'string' ? M(m) : m), x, y + h / 2, z),
    rod: (a, b, r, m) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), len = A.distanceTo(Bv); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), typeof m === 'string' ? M(m) : m); mesh.position.copy(A).add(Bv).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); mesh.castShadow = true; cur.add(mesh); return mesh; },
    cone: (r, h, m, x, y, z) => put(new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), typeof m === 'string' ? M(m) : m), x, y + h / 2, z),
    group: (fn, x = 0, y = 0, z = 0, ry = 0, rx = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0, 'YXZ'); const prev = cur; cur.add(g); cur = g; fn(); cur = prev; return g; },
  };
  return K;
}

/* ---------------- 사람 (키 1.7m) ---------------- */
// o: { helmet: true|false|'white', strap: true|false, vest: true, harness: false, shoes: 'boot'|'sneaker', pose: 'stand'|'walk'|'carry'|'crouch'|'lie'|'weld'|'flag'|'point'|'sit', ry, hair: false }
function person(K, x, z, o = {}, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry || 0; K.cur.add(g);
  const add = (geo, mat, px, py, pz, parent = g) => { const m = new THREE.Mesh(geo, typeof mat === 'string' ? K.M(mat) : mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); return m; };
  const limb = (px, py, pz, len, r, mat, rx = 0, rz = 0, parent = g) => { const p = new THREE.Group(); p.position.set(px, py, pz); p.rotation.set(rx, 0, rz); parent.add(p); add(new THREE.CapsuleGeometry(r, len - 2 * r, 4, 8), mat, 0, -len / 2, 0, p); return p; };
  const pose = o.pose || 'stand';
  const body = new THREE.Group(); g.add(body);
  let hip = 0.88;
  if (pose === 'crouch' || pose === 'weld') hip = 0.5;
  if (pose === 'sit' || pose === 'wipe') hip = 0.45;
  // 다리
  const legA = pose === 'walk' ? 0.35 : pose === 'crouch' || pose === 'weld' ? -1.2 : pose === 'sit' || pose === 'wipe' ? -1.45 : 0;
  const legL = limb(-0.1, hip, 0, pose === 'crouch' || pose === 'weld' ? 0.5 : 0.86, 0.075, '--art-dark', legA, 0, body);
  const legR = limb(0.1, hip, 0, pose === 'crouch' || pose === 'weld' ? 0.5 : 0.86, 0.075, '--art-dark', pose === 'walk' ? -0.35 : legA, 0, body);
  if (pose === 'crouch' || pose === 'weld') { limb(-0.1, hip - 0.0, 0.45, 0.45, 0.07, '--art-dark', 0, 0, body); limb(0.1, hip - 0.0, 0.45, 0.45, 0.07, '--art-dark', 0, 0, body); }
  // 신발
  const shoe = o.shoes === 'sneaker' ? '--bg' : '--art-dirt-dark';
  for (const [lg, sx] of [[legL, -0.1], [legR, 0.1]]) { const s = add(new THREE.BoxGeometry(0.13, 0.09, 0.27), shoe, 0, -(pose === 'crouch' || pose === 'weld' ? 0.5 : 0.86) - 0.0, 0.05, lg); if (o.shoes === 'sneaker') add(new THREE.BoxGeometry(0.135, 0.03, 0.275), '--art-shirt', 0, -0.035, 0, s); }
  // 몸통·조끼
  const torso = new THREE.Group(); torso.position.set(0, hip, 0); body.add(torso);
  if (pose === 'weld' || pose === 'crouch') torso.rotation.x = 0.35;
  add(new THREE.BoxGeometry(0.4, 0.56, 0.22), '--art-shirt', 0, 0.3, 0, torso);
  if (o.vest !== false) add(new THREE.BoxGeometry(0.42, 0.44, 0.24), K.T(texVest()), 0, 0.3, 0, torso);
  // 안전대(전신식): 어깨·가슴·허리 끈을 두껍고 밝게 + 등 고리 + 다리 끈 — 위험한 모습과 차이가 한눈에 (v16)
  if (o.harness) { for (const sx of [-0.11, 0.11]) add(new THREE.BoxGeometry(0.07, 0.62, 0.27), '--brand', sx, 0.32, 0, torso); add(new THREE.BoxGeometry(0.46, 0.07, 0.27), '--brand', 0, 0.42, 0, torso); add(new THREE.BoxGeometry(0.46, 0.08, 0.27), '--brand', 0, 0.06, 0, torso); add(new THREE.TorusGeometry(0.06, 0.018, 6, 14), '--art-steel', 0, 0.5, -0.15, torso);
    for (const lg of [legL, legR]) add(new THREE.TorusGeometry(0.1, 0.025, 6, 14), '--brand', 0, -0.12, 0, lg).rotation.x = Math.PI / 2; }
  // 팔
  const armPose = { stand: [0, 0.08], walk: [-0.4, 0.08], carry: [-1.2, 0.15], crouch: [-0.9, 0.1], lie: [0, 0.3], weld: [-1.3, 0.1], flag: [0, 2.6], point: [-1.4, 0.1], sit: [-0.6, 0.15], wipe: [-0.6, 0.15], climb: [-2.7, 0.2] }[pose] || [0, 0.08];
  limb(-0.26, 0.54, 0, 0.62, 0.06, '--art-shirt', armPose[0], armPose[1], torso);
  const rArm = limb(0.26, 0.54, 0, 0.62, 0.06, '--art-shirt', pose === 'walk' ? 0.4 : pose === 'flag' ? 0 : pose === 'wipe' ? -2.5 : armPose[0], pose === 'flag' ? -2.7 : pose === 'wipe' ? 0.5 : -armPose[1], torso);
  if (pose === 'flag') { add(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), '--art-steel', 0, -0.9, 0, rArm); add(new THREE.BoxGeometry(0.02, 0.28, 0.36), '--danger', 0, -1.1, 0.18, rArm); }
  if (pose === 'carry') add(new THREE.BoxGeometry(1.4, 0.04, 0.5), K.T(texPlywood()), 0, 0.42, -0.42, torso);
  if (pose === 'weld') { add(new THREE.BoxGeometry(0.06, 0.06, 0.4), '--art-dark', 0.1, 0.45, -0.45, torso); }
  // 머리·안전모
  const head = new THREE.Group(); head.position.set(0, 0.72, 0); torso.add(head);
  add(new THREE.SphereGeometry(0.115, 14, 12), '--skin', 0, 0.06, 0, head);
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), '--skin', 0, -0.07, 0, head); // 목
  if (o.helmet === false) add(new THREE.SphereGeometry(0.118, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), '--art-dark', 0, 0.075, 0.005, head); // 머리카락
  else {
    const hc = o.helmet === 'white' ? '--bg' : '--brand';
    const hg = new THREE.Group(); hg.position.set(0, 0.09, 0); if (o.strap === false) hg.rotation.z = 0.28; head.add(hg);
    add(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hc, 0, 0, 0, hg);
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 18), hc, 0, 0, 0.02, hg);
    add(new THREE.BoxGeometry(0.03, 0.03, 0.26), hc, 0, 0.13, 0, hg);
    if (o.strap === false) { add(new THREE.BoxGeometry(0.015, 0.2, 0.015), '--art-dark', -0.12, -0.1, 0, hg); add(new THREE.BoxGeometry(0.015, 0.22, 0.015), '--art-dark', 0.13, -0.12, 0.02, hg); }
    else add(new THREE.TorusGeometry(0.105, 0.008, 4, 16, Math.PI), '--art-dark', 0, -0.03, 0, hg).rotation.set(0, Math.PI / 2, Math.PI);
  }
  if (pose === 'weld') add(new THREE.BoxGeometry(0.26, 0.24, 0.05), '--asphalt-2', 0, 0.06, -0.13, head);
  if (pose === 'lie') { g.rotation.z = Math.PI / 2; g.position.y = y + 0.18; }
  return g;
}

/* ---------------- 장면 공통 ---------------- */
function baseScene(K, scene, { ground = 'art-ground', size = 60, sky = true, hole = null } = {}) {
  const mat = K.T(texSpeckle(ground, size / 4, 2600, 0.1));
  const plane = (x0, x1, z0, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m; };
  const h = size / 2;
  let gr;
  if (!hole) gr = plane(-h, h, -h, h);
  else { const [x0, x1, z0, z1] = hole; gr = plane(-h, x0, -h, h); plane(x1, h, -h, h); plane(x0, x1, -h, z0); plane(x0, x1, z1, h); } // 구덩이 자리만 비움
  if (sky) scene.background = texSky();
  return gr;
}
// 위험 자리 하나: bad/good 두 벌을 그룹으로 만들어 둔다. anchor=null 이면 위험한 모습 물체의 경계 상자 중심으로 자동 (누를 곳이 물체 위에 오게, v16)
function hz(K, list, id, anchor, bad, good, close) {
  const gb = K.group(bad), gg = K.group(good); gg.visible = false;
  list[id] = { anchor, bad: gb, good: gg, close };
}

/* ---------------- 장면 7곳 (단위 m, y 위) ---------------- */
const SCENES = {
  // 0. 출근·TBM: 사무실 컨테이너 앞에 줄 선 4명
  tbm(K, H, S) {
    baseScene(K, K.scene, { ground: 'art-ground' });
    K.box(9, 2.7, 2.6, K.T(texFacade(1)), -1, 0, -4.5); K.box(9.2, 0.2, 2.8, '--art-concrete-dark', -1, 2.7, -4.5);
    // v17: 지도(site3d)와 같은 소품 — TBM 게시판, 보호구 표지, 식수대, 가림막, 자재, 콘 (props3d.js). 사람 앞(가운데)은 비워 둠
    Pr.board(K, 3.9, -1.7, -0.35); Pr.sign(K, -4.3, -1.6, 'mandatory', 0.25); Pr.sign(K, 5.6, -2.6, 'caution', -0.4);
    Pr.water(K, -4.8, 0.3); Pr.toilet(K, 7.2, -4.6, -0.3); Pr.extinguisher(K, 2.9, -2.2);
    Pr.fence(K, -12, -8, 12, -8); Pr.pallet(K, -5.6, -2.8, 0.3); Pr.rebar(K, 4.2, 1.4, -0.5, 2.6); Pr.lumber(K, -3.6, 1.7, 0.35);
    for (const [x, z] of [[-2.7, 2.6], [2.9, 2.5], [-4.6, 1.2]]) Pr.cone(K, x, z); Pr.barrow(K, 6.0, -0.6, 2.4);
    for (const [x, c] of [[-6, '--art-concrete'], [7, '--art-wall']]) K.box(4, 6, 4, K.T(texFacade(2)), x, 0, -14);
    Pr.towerCrane(K, -11, -16, 0.6, 18, 14, 9, 8);
    hz(K, H, '0-1', [-2.4, 1.62, 0], () => person(K, -2.4, 0, { helmet: false }), () => person(K, -2.4, 0, {}), { pos: [-2.2, 1.75, 1.9], look: [-2.4, 1.35, 0] });
    hz(K, H, '0-2', [-0.8, 1.62, 0], () => person(K, -0.8, 0, { strap: false }), () => person(K, -0.8, 0, {}), { pos: [-0.8, 1.7, 1.1], look: [-0.8, 1.6, 0] });
    hz(K, H, '0-3', [0.8, 0.12, 0], () => person(K, 0.8, 0, { shoes: 'sneaker' }), () => person(K, 0.8, 0, {}), { pos: [0.8, 0.7, 1.6], look: [0.8, 0.2, 0] });
    person(K, 2.4, 0, { helmet: 'white', pose: 'point', ry: -0.3 }); S['0-s1'] = [2.4, 1.2, 0];
    // 바닥의 철근 토막·못 박힌 각재 — 안전화를 신어야 하는 이유가 보이게 (v16)
    K.rod([0.5, 0.03, 0.45], [1.3, 0.03, 0.75], 0.02, '--art-rebar'); K.box(0.9, 0.06, 0.12, K.T(texPlywood()), 1.0, 0, 0.35, 0.4); for (let i = 0; i < 3; i++) K.cyl(0.006, 0.07, '--art-steel', 0.75 + i * 0.22, 0.06, 0.27 + i * 0.09);
    return { cam: [0, 1.7, 6.3], look: [0, 0.95, -0.8], fov: 58 };
  },
  // 1. 골조 층 바닥: 3층 슬래브 위에 서서 앞을 봄. 앞쪽 끝 아래로 땅이 보임
  floor(K, H, S) {
    const gnd = baseScene(K, K.scene, { ground: 'art-grass', size: 120 });
    gnd.position.y = -9;
    const con = K.T(texSpeckle('art-concrete', 4, 2600, 0.12));
    K.box(18, 0.3, 14, con, 0, -0.3, -1); // 슬래브
    for (const [x, z] of [[-8, -7], [8, -7], [-8, 5], [8, 5], [0, -7], [0, 5]]) K.box(0.5, 9, 0.5, '--art-concrete-dark', x, -9.3, z);
    for (const [x, z] of [[-8, -7], [8, -7], [0, -7], [-8, 5]]) K.box(0.5, 2.6, 0.5, '--art-concrete-dark', x, 0, z); // 위층 기둥
    const rail = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.8); for (let i = 0; i <= n; i++) K.box(0.06, 1.1, 0.06, '--art-helmet', x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n); K.rod([x0, 1.05, z0], [x1, 1.05, z1], 0.03, '--art-helmet'); K.rod([x0, 0.55, z0], [x1, 0.55, z1], 0.025, '--art-helmet'); };
    rail(-9, -8, -9, 6); rail(9, -8, 9, 6);
    K.box(14, 0.06, 0.5, '--bg', -2, 0, 3.3); // 통로 표시
    for (const [x, z] of [[-18, -26], [14, -30], [-4, -34]]) K.box(7, 14, 7, K.T(texFacade(3)), x, -9, z);
    K.rod([3, 9, -10], [3, 4.2, -10], 0.02, '--asphalt'); K.box(0.3, 0.3, 0.3, '--asphalt', 3, 3.9, -10);
    hz(K, H, '1-1', [-2.8, 0.02, 2.0], () => { K.box(1.3, 0.04, 1.3, '--art-dark', -2.8, -0.02, 2.0); K.box(1.3, 0.3, 0.05, '--art-concrete-dark', -2.8, -0.3, 2.65); },
      () => { K.box(1.5, 0.05, 1.5, K.T(texStripes()), -2.8, 0, 2.0); }, { pos: [-2.0, 1.6, 4.8], look: [-2.8, 0, 2.0] });
    hz(K, H, '1-2', [1.5, 0.9, -7.4], () => { K.box(9, 0.02, 0.06, '--art-concrete-dark', 1.5, -0.02, -7.98); person(K, 1.5, -7.35, { ry: Math.PI, pose: 'point' }); }, () => { rail(-3, -7.9, 6, -7.9); K.box(9, 0.15, 0.03, '--art-helmet', 1.5, 0, -7.9); person(K, 1.5, -7.35, { ry: Math.PI, pose: 'point' }); }, { pos: [3.8, 2.6, -4.0], look: [1.2, -1.6, -8.8] });
    K.rod([5.2, 1.9, -6.6], [8.6, 1.9, -6.6], 0.012, '--art-steel'); K.box(0.1, 2, 0.1, '--art-steel', 5.2, 0, -6.6); K.box(0.1, 2, 0.1, '--art-steel', 8.6, 0, -6.6);
    hz(K, H, '1-3', null, () => person(K, 6.6, -6.2, { pose: 'carry', ry: -1.2 }), () => { person(K, 6.6, -6.2, { pose: 'carry', ry: -1.2, harness: true }); K.rod([6.62, 1.4, -6.35], [6.7, 1.9, -6.6], 0.03, '--brand'); }, { pos: [5.2, 1.9, -3.6], look: [6.6, 1.2, -6.3] });
    hz(K, H, '1-4', [1.0, 0.35, 3.2], () => { K.box(2.4, 0.18, 1.2, K.T(texPlywood()), 1.2, 0, 3.3, 0.2); K.box(2.4, 0.18, 1.2, K.T(texPlywood()), 1.3, 0.18, 3.2, -0.1); for (let i = 0; i < 4; i++) K.rod([0, 0.42, 2.6 + i * 0.12], [2.6, 0.42, 3.4 + i * 0.12], 0.03, '--art-steel'); person(K, -1.2, 3.3, { pose: 'carry', ry: Math.PI / 2 }); },
      () => { K.box(2.4, 0.18, 1.2, K.T(texPlywood()), 3.4, 0, 4.7); K.box(2.4, 0.18, 1.2, K.T(texPlywood()), 3.4, 0.18, 4.7); person(K, -1.2, 3.3, { pose: 'carry', ry: Math.PI / 2 }); }, { pos: [-0.4, 2.0, 7.2], look: [1.2, 0.3, 3.4] });
    hz(K, H, '1-5', [-5.6, 0.9, -4.6], () => { for (let i = 0; i < 6; i++) K.cyl(0.02, 1.3, '--art-rebar', -6 + (i % 3) * 0.35, 0, -4.8 + Math.floor(i / 3) * 0.35); },
      () => { for (let i = 0; i < 6; i++) { K.cyl(0.02, 1.25, '--art-rebar', -6 + (i % 3) * 0.35, 0, -4.8 + Math.floor(i / 3) * 0.35); K.cyl(0.06, 0.1, '--vest', -6 + (i % 3) * 0.35, 1.24, -4.8 + Math.floor(i / 3) * 0.35); } }, { pos: [-4.6, 1.5, -2.6], look: [-5.6, 0.9, -4.6] });
    K.box(1.5, 0.05, 1.5, K.T(texStripes()), 4.6, 0, 0.6); S['1-s1'] = [4.6, 0.03, 0.6];
    // v17 지도와 같은 소품 (위험 자리는 비움)
    Pr.rebar(K, -6.6, 0.8, 0.3, 3); Pr.pallet(K, -6.9, -2.2, 0.2); Pr.pipes(K, 6.8, 3.4, 0.2); Pr.drum(K, 7.6, -1.4, '--mandatory'); Pr.cone(K, 6.2, 1.8);
    K.group(() => Pr.towerCrane(K, 0, 0, 0.5, 26, 14, 8, 14), -18, -9, -24); K.group(() => Pr.mixer(K, 0, 0, 0.4), 10, -9, -16);
    return { cam: [0, 1.6, 7.5], look: [0, 0.2, -3.4], fov: 56 };
  },
  // 2. 외부 비계·고소작업대: 땅에서 건물 외벽 쪽을 올려다봄
  scaffold(K, H, S) {
    baseScene(K, K.scene, { ground: 'art-ground' });
    K.box(24, 13, 3, K.T(texFacade(3)), 0, 0, -3.5);
    const bay = [-8, -5.6, -3.2, -0.8, 1.6];
    for (const x of bay) for (const z of [-1.7, -0.5]) K.cyl(0.03, 9.6, '--art-steel', x, 0, z, 8);
    for (const y of [2.4, 4.8, 7.2]) { K.rod([-8, y + 1, -0.5], [1.6, y + 1, -0.5], 0.025, '--art-helmet'); K.rod([-8, y + 0.5, -0.5], [1.6, y + 0.5, -0.5], 0.02, '--art-helmet'); }
    const plank = (x0, x1, y) => K.box(x1 - x0, 0.06, 1.2, K.T(texPlywood()), (x0 + x1) / 2, y, -1.1);
    plank(-8, 1.6, 2.4); plank(-8, 1.6, 7.2); plank(-8, -3.2, 4.8); plank(-0.8, 1.6, 4.8);
    hz(K, H, '2-1', [-2, 4.85, -1.1], () => { person(K, -0.2, -1.1, { ry: -1.2, pose: 'carry' }, 4.83); }, () => { plank(-3.2, -0.8, 4.8); person(K, -0.2, -1.1, { ry: -1.2, pose: 'carry' }, 4.83); }, { pos: [-2.0, 9.0, 0.8], look: [-2.0, 4.8, -1.1] });
    hz(K, H, '2-2', null, () => person(K, -6.6, -1.1, { ry: 0.2 }, 7.26), () => { person(K, -6.6, -1.1, { ry: 0.2, harness: true }, 7.26); K.rod([-6.6, 8.25, -1.25], [-6.4, 8.26, -0.5], 0.03, '--brand'); }, { pos: [-5.6, 8.8, 2.0], look: [-6.6, 8.1, -1.1] });
    person(K, 0.6, -1.1, { harness: true, pose: 'crouch' }, 2.46); K.rod([0.6, 3.2, -1.15], [0.8, 3.4, -0.5], 0.015, '--vest'); S['2-s1'] = [0.6, 3.1, -1.1];
    Pr.pipes(K, 1.8, 5.2, 0.1); Pr.cone(K, -0.6, 5.8); Pr.sign(K, -10.8, 0.8, 'mandatory', 0.4); Pr.plywood(K, 9.4, 4.0, -0.3); Pr.barrow(K, -2.8, 6.8, 0.6); Pr.container(K, 13, -0.6, -0.2);
    hz(K, H, '2-3', null, () => person(K, -3.6, 0.4, { pose: 'walk', ry: 1.4 }), () => { person(K, -6.6, 3.4, { pose: 'walk', ry: 1.4 }); for (let x = -8; x <= 1.6; x += 1.2) K.cone(0.16, 0.5, '--vest', x, 0, 0.8); K.rod([-8, 0.45, 0.8], [1.6, 0.45, 0.8], 0.015, '--danger'); }, { pos: [-2.2, 2.0, 6.8], look: [-4.0, 2.0, 0.4] });
    // 고소작업대
    K.group(() => { K.box(2.6, 0.6, 1.4, '--vest', 6.6, 0.25, 0.8); for (const [x, z] of [[5.6, 0.2], [7.6, 0.2], [5.6, 1.4], [7.6, 1.4]]) K.cyl(0.22, 0.2, '--asphalt', x, 0.05, z);
    K.rod([6.6, 0.8, 0.8], [6.1, 4.8, 0.2], 0.12, '--art-steel'); K.box(1.6, 0.1, 1, '--art-steel', 6.1, 4.8, 0.2);
    for (const [x, z] of [[5.3, -0.3], [6.9, -0.3], [5.3, 0.7], [6.9, 0.7]]) K.box(0.05, 1.1, 0.05, '--art-helmet', x, 4.9, z); K.box(1.6, 0.05, 1, '--art-helmet', 6.1, 5.95, 0.2); }, -1.4, 0, 0);
    hz(K, H, '2-4', null, () => person(K, 4.7, 0.2, { ry: -0.4 }, 4.9), () => { person(K, 4.7, 0.2, { ry: -0.4, harness: true }, 4.9); K.rod([4.72, 6.4, 0.05], [4.0, 5.95, -0.3], 0.03, '--brand'); }, { pos: [3.2, 6.9, 3.6], look: [4.7, 5.9, 0.2] });
    // 이동식 비계
    const tower = (outr) => K.group(() => { for (const [x, z] of [[-10.2, 1.4], [-8.8, 1.4], [-10.2, 2.6], [-8.8, 2.6]]) { K.cyl(0.03, 3.6, '--art-steel', x, 0.25, z); if (outr) K.rod([x, 0.6, z], [x + (x < -9.5 ? -0.8 : 0.8), 0.05, z + (z < 2 ? -0.8 : 0.8)], 0.025, '--art-steel'); } K.box(1.5, 0.06, 1.3, K.T(texPlywood()), -9.5, 3.8, 2);
      for (const [x, z] of [[-10.2, 1.4], [-8.8, 1.4], [-10.2, 2.6], [-8.8, 2.6]]) { K.cyl(0.13, 0.08, '--asphalt', x, 0.1, z); if (outr) K.box(0.12, 0.08, 0.2, '--danger', x, 0.22, z + 0.15); } person(K, -9.5, 2, {}, 3.86); }, 3.6, 0, 2.4);
    hz(K, H, '2-5', [-5.9, 0.4, 4.4], () => tower(false), () => tower(true), { pos: [-4.4, 1.4, 7.4], look: [-5.9, 0.6, 4.4] });
    return { cam: [-1.2, 1.6, 11.5], look: [-1.2, 4.0, -1], fov: 62 };
  },
  // 3. 양중·크레인·리프트
  lifting(K, H, S) {
    baseScene(K, K.scene, { ground: 'art-ground' });
    K.box(10, 14, 6, K.T(texFacade(3)), -7, 0, -6);
    // 타워크레인
    for (const [dx, dz] of [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]]) K.box(0.12, 22, 0.12, '--art-helmet', 6 + dx, 0, -9 + dz);
    for (let y = 1; y < 22; y += 1.5) K.box(1, 0.08, 1, '--art-helmet', 6.45, y, -8.55);
    K.box(26, 0.7, 0.8, '--art-helmet', -1, 21.6, -8.55); K.box(3, 1.4, 1.2, '--art-concrete-dark', 10.5, 21, -8.55);
    // 매단 짐 + 아래 통행
    K.rod([0, 21.6, -2], [0, 6.2, -2], 0.02, '--asphalt'); K.box(0.4, 0.4, 0.4, '--asphalt', 0, 5.9, -2);
    K.rod([0, 5.9, -2], [-0.9, 4.9, -2], 0.015, '--asphalt'); K.rod([0, 5.9, -2], [0.9, 4.9, -2], 0.015, '--asphalt');
    for (let i = 0; i < 5; i++) K.rod([-1.1, 4.75 + i * 0.07, -2.2 + i * 0.1], [1.1, 4.75 + i * 0.07, -2.2 + i * 0.1], 0.03, '--art-rebar');
    hz(K, H, '3-1', null, () => person(K, 0, -1.8, { pose: 'walk', ry: 1.5 }), () => { person(K, 3.8, 0.8, { pose: 'walk', ry: 1.5 }); for (let a = 0; a < 6.28; a += 0.7) K.cone(0.16, 0.5, '--vest', Math.cos(a) * 2.2, 0, -2 + Math.sin(a) * 2.2); }, { pos: [-2.6, 1.0, 4.4], look: [0.2, 3.0, -1.9] });
    hz(K, H, '3-2', [4.4, 8.6, -3], () => { K.rod([4.4, 21.6, -3], [4.4, 9.5, -3], 0.02, '--asphalt'); K.rod([4.4, 9.5, -3], [3.6, 8.4, -3], 0.015, '--asphalt'); K.box(2.4, 0.4, 0.6, K.T(texPlywood()), 4.4, 7.7, -3).rotation.z = -0.6; },
      () => { K.rod([4.4, 21.6, -3], [4.4, 9.8, -3], 0.02, '--asphalt'); K.rod([4.4, 9.8, -3], [3.5, 8.6, -3], 0.015, '--asphalt'); K.rod([4.4, 9.8, -3], [5.3, 8.6, -3], 0.015, '--asphalt'); K.box(2.4, 0.4, 0.6, K.T(texPlywood()), 4.4, 8.3, -3); }, { pos: [3, 9.6, 2], look: [4.4, 8.6, -3] });
    // 건설용 리프트
    K.box(0.4, 14, 0.4, '--art-steel', -2.3, 0, -2.9);
    const car = (open) => { K.box(1.6, 2.2, 1.4, '--art-helmet', -3.2, 3.5, -2.5); K.box(1.3, 1.9, 0.04, '--art-dark', -3.2, 3.6, -1.79); if (!open) K.box(1.3, 1.9, 0.05, K.M('--art-glass', { transparent: true, opacity: 0.85 }), -3.2, 3.6, -1.76); else K.box(0.65, 1.9, 0.05, '--art-helmet', -4.2, 3.6, -1.6, 0.7); };
    hz(K, H, '3-3', [-3.2, 4.6, -1.8], () => { car(true); person(K, -3.2, -2.0, { ry: 0, pose: 'point' }, 3.6); }, () => { car(false); person(K, -3.2, -2.3, { ry: 0 }, 3.6); }, { pos: [-1.8, 4.6, 2.4], look: [-3.2, 4.5, -1.9] });
    // 지게차
    const fork = () => { K.box(1.2, 0.9, 2, '--vest', 4.4, 0.35, 3.2); K.box(1.1, 1.2, 0.9, '--asphalt-2', 4.4, 1.25, 3.6); K.box(0.08, 2.2, 0.08, '--art-steel', 4.0, 0.2, 2.1); K.box(0.08, 2.2, 0.08, '--art-steel', 4.8, 0.2, 2.1); K.box(1, 0.06, 1, '--art-steel', 4.4, 0.35, 1.6); K.box(1, 0.6, 1, K.T(texPlywood()), 4.4, 0.42, 1.6); for (const [x, z] of [[3.8, 2.6], [5, 2.6], [3.8, 3.9], [5, 3.9]]) K.cyl(0.28, 0.25, '--asphalt', x, 0.05, z); };
    hz(K, H, '3-4', [4.4, 1.1, 2.6], () => { fork(); person(K, 2.6, 2.2, { pose: 'walk', ry: -1.5 }); }, () => { fork(); person(K, 2.4, 3.6, { pose: 'flag', ry: 1.2 }); }, { pos: [3.2, 2.2, 7], look: [4.4, 0.9, 2.6] });
    person(K, -5.8, 1.6, { pose: 'flag', ry: 0.5 }); S['3-s1'] = [-5.8, 1.2, 1.6];
    Pr.pallet(K, -2.2, 4.2, 0.2); Pr.lumber(K, -3.4, 5.6, 0.1); Pr.rebar(K, 7.8, 5.2, 0.4, 3); Pr.sign(K, -8.6, 3.4, 'caution', 0.4); Pr.drum(K, 7.4, -1.6, '--art-steel'); Pr.drum(K, 8.1, -1.1, '--art-steel'); Pr.fence(K, -14, -10, 14, -10);
    return { cam: [0, 1.6, 10], look: [0, 4.4, -2], fov: 62 };
  },
  // 4. 장비·토공사
  equip(K, H, S) {
    baseScene(K, K.scene, { ground: 'art-dirt', hole: [3.6, 8.8, 0.6, 6.0] }); // 오른쪽 앞에 실제 구덩이 (깊이 2.4m)
    const exc = (x, z, ry, s = 1) => K.group(() => { K.box(3.2 * s, 0.7 * s, 0.7 * s, '--asphalt', 0, 0, -0.9 * s); K.box(3.2 * s, 0.7 * s, 0.7 * s, '--asphalt', 0, 0, 0.9 * s); K.box(2.6 * s, 1.1 * s, 2.3 * s, '--art-helmet', 0, 0.7 * s, 0); K.box(1 * s, 1.1 * s, 1 * s, '--art-glass', -0.6 * s, 1.8 * s, 0.6 * s); K.rod([0.9 * s, 1.6 * s, 0.3 * s], [2.8 * s, 3.2 * s, 0.3 * s], 0.18 * s, '--art-helmet'); K.rod([2.8 * s, 3.2 * s, 0.3 * s], [3.9 * s, 0.9 * s, 0.3 * s], 0.14 * s, '--art-helmet'); K.box(0.7 * s, 0.6 * s, 0.9 * s, '--asphalt', 3.9 * s, 0.2 * s, 0.3 * s); }, x, 0, z, ry);
    const dump = (x, z, ry) => K.group(() => { K.box(4.4, 1.6, 2.3, '--vest', -0.6, 0.9, 0); K.box(1.6, 1.8, 2.3, '--vest', 2.3, 0.7, 0); K.box(0.1, 0.8, 2, '--art-glass', 3.1, 1.6, 0); for (const xx of [-2, -0.6, 2.2]) for (const zz of [-1.1, 1.1]) K.cyl(0.45, 0.35, '--asphalt', xx, 0.27, zz).rotation.x = Math.PI / 2; }, x, 0, z, ry);
    exc(-4.2, -1.6, 0.4); K.group(() => { for (let a = -1.2; a <= 1.4; a += 0.2) K.box(0.25, 0.04, 0.08, '--danger', Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6); }, -4.2, 0.02, -1.6);
    hz(K, H, '4-1', null, () => person(K, -1.4, -0.3, { ry: 0.5 }), () => { person(K, 0.9, 2.2, { pose: 'flag', ry: 0.5 }); for (let a = -1.2; a <= 1.4; a += 0.4) K.cone(0.16, 0.5, '--vest', -4.2 + Math.cos(a) * 5, 0, -1.6 + Math.sin(a) * 5); }, { pos: [0.6, 2.4, 3.6], look: [-2.2, 1.0, -0.8] });
    dump(3.2, -6, 0.2); exc(7.2, -4.4, Math.PI + 0.6, 0.8);
    hz(K, H, '4-2', null, () => person(K, 5.3, -5.0, { ry: 0.3 }), () => person(K, 7.8, -1.2, { pose: 'flag', ry: 0.3 }), { pos: [5.0, 3.0, 0.6], look: [5.3, 1.0, -5.0] });
    const roller = () => K.group(() => { K.box(1.8, 0.9, 1.4, '--art-helmet', 0.6, 0.55, 0); K.cyl(0.6, 1.4, '--art-steel', -0.9, 0, 0).rotation.x = Math.PI / 2; K.box(0.9, 0.9, 1, '--asphalt-2', 0.8, 1.45, 0); for (const zz of [-0.7, 0.7]) K.cyl(0.5, 0.3, '--asphalt', 1.2, 0.0, zz).rotation.x = Math.PI / 2; }, 10.4, 0, -1.6, Math.PI / 2);
    roller();
    hz(K, H, '4-3', null, () => person(K, 10.4, -0.1, { pose: 'crouch', ry: Math.PI }), () => person(K, 12.2, 1.6, { pose: 'flag', ry: -0.8 }), { pos: [8.6, 1.8, 3.6], look: [10.4, 0.7, -0.8] });
    // 굴착면: 땅에 판 구덩이(깊이 2.4m). 위험 = 수직 벽 + 금 + 가장자리 흙더미, 사람은 바닥에서 일함 / 안전 = 같은 구덩이를 기울기로 (v16)
    const D = 2.4, X0 = 3.6, X1 = 8.8, Z0 = 0.6, Z1 = 6.0, dirt = K.T(texSpeckle('art-dirt', 1, 2200, 0.2));
    K.box(X1 - X0, 0.05, Z1 - Z0, '--art-dirt-dark', (X0 + X1) / 2, -D, (Z0 + Z1) / 2); // 구덩이 바닥
    const trench = (steep) => {
      if (steep) { K.box(0.2, D, Z1 - Z0, dirt, X0 + 0.1, -D, (Z0 + Z1) / 2); K.box(0.2, D, Z1 - Z0, dirt, X1 - 0.1, -D, (Z0 + Z1) / 2); K.box(X1 - X0, D, 0.2, dirt, (X0 + X1) / 2, -D, Z0 + 0.1);
        for (const [y, z] of [[-0.5, 1.6], [-0.9, 2.6], [-0.4, 3.4]]) K.box(0.03, 0.9, 0.05, '--art-dirt-dark', X1 - 0.22, y - 0.4, z).rotation.x = 0.4; // 벽의 금
        K.cone(1.3, 1.1, dirt, (X0 + X1) / 2, 0, Z0 - 1.0); K.cone(0.9, 0.8, dirt, X1 + 1.0, 0, 2.4); // 가장자리 흙더미
        person(K, 6.2, 1.9, { pose: 'crouch', ry: 0.3 }, -D); }
      else { const slope = (x, z, w, d, rx, rz) => { const m = K.box(w, 0.12, d, dirt, x, -D / 2, z); m.rotation.set(rx, 0, rz); };
        slope(X0 + 1.2, (Z0 + Z1) / 2, 3.4, Z1 - Z0, 0, -0.78); slope(X1 - 1.2, (Z0 + Z1) / 2, 3.4, Z1 - Z0, 0, 0.78); slope((X0 + X1) / 2, Z0 + 1.2, X1 - X0, 3.4, 0.78, 0);
        person(K, 6.2, 1.9, { pose: 'crouch', ry: 0.3 }, -D); }
    };
    hz(K, H, '4-4', [6.2, -1.5, 1.9], () => trench(true), () => trench(false), { pos: [6.4, 4.2, 9.6], look: [6.2, -1.6, 2.4] });
    person(K, -5, 2, { pose: 'flag', ry: 0.6 }); S['4-s1'] = [-5, 1.2, 2];
    Pr.barrier(K, -1.4, 5.8, 0.2); Pr.drum(K, -8.4, 3.4, '--danger'); Pr.drum(K, -9.0, 4.0, '--mandatory'); Pr.container(K, -10, -9, 0.3); Pr.toilet(K, 12, -8, -0.4); Pr.fence(K, -16, -12, 16, -12);
    return { cam: [1.2, 3.6, 11.5], look: [1.2, 0.2, -0.8], fov: 62 };
  },
  // 5. 타설·동바리: 거푸집 아래와 위가 함께 보임
  pour(K, H, S) {
    baseScene(K, K.scene, { ground: 'art-concrete' });
    K.box(12, 0.25, 6, K.T(texPlywood(3)), 0, 3.2, -1);
    const shore = (x, z) => { K.cyl(0.035, 3.2, '--art-steel', x, 0, z); K.box(0.2, 0.06, 0.2, '--art-steel', x, 3.12, z); };
    for (const x of [-5, -3, -1, 1, 3, 5]) for (const z of [-3, 1]) if (!(x === -3 && z === 1) && !(x === 3 && z === 1)) shore(x, z);
    hz(K, H, '5-1', null, () => { K.rod([-3, 0, 1], [-2.5, 1.6, 1], 0.04, '--art-steel'); K.rod([-2.5, 1.6, 1], [-3, 3.15, 1], 0.04, '--art-steel'); person(K, -3.4, 1.6, { ry: 0.5 }); },
      () => { shore(-3, 1); person(K, -1.0, 5.0, { pose: 'walk', ry: 0.6 }); }, { pos: [-1.6, 1.8, 5.0], look: [-3, 1.5, 1.2] });
    hz(K, H, '5-2', [0.6, 3.8, -1], () => { K.cone(1.5, 1, '--art-concrete-dark', 0.6, 3.32, -1); }, () => { K.box(9, 0.15, 4.8, '--art-concrete-dark', 0, 3.32, -1); }, { pos: [0.6, 5.6, 3], look: [0.6, 3.6, -1] });
    hz(K, H, '5-3', [3, 1.6, 1], () => { K.cyl(0.035, 1.4, '--art-steel', 3, 0, 1); K.box(0.4, 0.3, 0.4, K.T(texPlywood()), 3, 1.4, 1); K.cyl(0.035, 1.5, '--art-steel', 3, 1.7, 1); }, () => shore(3, 1), { pos: [3.6, 1.8, 4.2], look: [3, 1.5, 1] });
    // 펌프카 + 전선
    K.box(4.5, 1.4, 2.2, '--vest', 9, 0.5, -1.5); for (const x of [7.4, 8.8, 10.4]) for (const z of [-2.6, -0.4]) K.cyl(0.45, 0.35, '--asphalt', x, 0.27, z).rotation.x = Math.PI / 2;
    for (const z of [-6, -6.6]) K.rod([-14, 9.5, z], [16, 9.2, z], 0.02, '--asphalt'); K.box(0.3, 10, 0.3, '--art-rebar', 14, 0, -6.3);
    hz(K, H, '5-4', [9.6, 8.6, -5.4], () => { K.rod([9, 1.9, -1.5], [9.6, 8.4, -4], 0.16, '--art-steel'); K.rod([9.6, 8.4, -4], [9.6, 8.9, -5.9], 0.12, '--art-steel'); },
      () => { K.rod([9, 1.9, -1.5], [8, 5.6, -2], 0.16, '--art-steel'); K.rod([8, 5.6, -2], [3, 5.2, -1.5], 0.12, '--art-steel'); }, { pos: [2.4, 5.0, 9.0], look: [8.0, 6.2, -3.6] });
    person(K, 5.6, 3.2, { ry: -0.4, pose: 'point' }); S['5-s1'] = [5.6, 1.2, 3.2];
    Pr.rebar(K, -7.2, 3.0, 0.3, 3); Pr.plywood(K, -8.8, 0.6, 0.2); Pr.barrow(K, 7.8, 4.8, -0.6); Pr.cone(K, 3.2, 5.8); Pr.cone(K, -1.4, 6.0); K.group(() => Pr.mixer(K, 0, 0, 0.2), -9, 0, -7); Pr.fence(K, -16, -11, 16, -11);
    return { cam: [1.5, 1.6, 10.5], look: [1.5, 3.0, -1], fov: 64 };
  },
  // 6. 용접·밀폐공간·폭염
  hot(K, H, S) {
    baseScene(K, K.scene, { ground: 'art-concrete' });
    K.box(16, 5, 0.3, K.T(texFacade(2)), 0, 0, -6);
    const sparks = (x, y, z, n = 14, sx = 0.9) => { for (let i = 0; i < n; i++) K.box(0.05, 0.05, 0.05, K.M('--vest', { emissive: new THREE.Color(tok('--brand')) }), x + Math.random() * sx, y + Math.random() * 0.5, z + Math.random() * 0.6); };
    // 땡볕: 하늘의 해 (v16)
    const sunm = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(tok('--brand')) })); sunm.position.set(8, 14, -17); K.scene.add(sunm);
    person(K, -3.8, -0.4, { pose: 'weld', ry: -0.6 }); K.box(1.2, 0.5, 0.8, '--art-steel', -3.1, 0, -1.1); sparks(-3, 0.5, -1.0);
    hz(K, H, '6-1', [-2.1, 0.35, -0.2], () => { sparks(-2.9, 0.1, -0.7, 30, 1.0); K.cyl(0.18, 0.5, '--danger', -2.3, 0, -0.1); K.cyl(0.18, 0.5, '--art-shirt', -1.85, 0, 0.05); K.cyl(0.18, 0.45, '--bg', -2.05, 0, 0.42); K.box(0.7, 0.45, 0.5, '--bg', -1.4, 0, -0.45); },
      () => { K.box(0.05, 1.6, 1.8, '--art-tan', -2.5, 0, -0.4); K.cyl(0.12, 0.6, '--danger', -1.7, 0, 0.3); K.box(0.14, 0.14, 0.14, '--asphalt', -1.7, 0.6, 0.3); }, { pos: [-0.6, 1.2, 2.2], look: [-2.5, 0.35, -0.5] });
    // 맨홀
    // 맨홀: 어두운 입구 + 테두리 + 밖으로 나온 사다리 + 옆에 벗긴 뚜껑 (v16)
    const manhole = () => { K.cyl(0.42, 0.03, '--art-dark', 1.4, 0.0, 1.2, 24); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.07, 8, 28), K.M('--art-steel')); ring.rotation.x = Math.PI / 2; ring.position.set(1.4, 0.06, 1.2); K.cur.add(ring);
      K.cyl(0.5, 0.05, '--art-steel', 2.55, 0, 1.95, 24); for (const dx of [-0.17, 0.17]) K.box(0.04, 0.95, 0.04, '--art-steel', 1.4 + dx, -0.05, 1.58); for (let k = 0; k < 3; k++) K.box(0.34, 0.03, 0.03, '--art-steel', 1.4, 0.15 + k * 0.28, 1.58); };
    hz(K, H, '6-2', [1.4, 0.45, 1.2], () => { manhole(); person(K, 1.4, 1.1, { pose: 'climb', ry: Math.PI }, -1.15); },
      () => { manhole(); K.rod([1.4, 1.9, 1.2], [0.6, 0, 0.7], 0.035, '--art-steel'); K.rod([1.4, 1.9, 1.2], [2.2, 0, 0.7], 0.035, '--art-steel'); K.rod([1.4, 1.9, 1.2], [1.4, 0, 2.1], 0.035, '--art-steel');
        K.box(0.6, 0.6, 0.6, '--art-steel', 2.9, 0, 0.1); K.rod([2.9, 0.4, 0.4], [1.6, 0.1, 1.0], 0.1, '--art-dark'); K.rod([1.6, 0.1, 1.0], [1.4, -1.2, 1.2], 0.1, '--art-dark');
        person(K, 0.2, 2.0, { ry: 0.9, pose: 'point' }); K.box(0.14, 0.22, 0.08, '--brand', 0.45, 1.05, 1.75); K.rod([0.45, 1.0, 1.75], [1.3, -0.6, 1.25], 0.012, '--art-dark'); }, { pos: [2.4, 2.4, 4.6], look: [1.4, 0.2, 1.2] });
    // 전선
    hz(K, H, '6-3', [2.8, 0.06, 2.9], () => { K.cyl(0.8, 0.008, K.M('--art-glass', { transparent: true, opacity: 0.75 }), 2.9, 0, 3.0, 24); K.rod([0.6, 0.04, 2.7], [2.6, 0.04, 2.9], 0.04, '--asphalt'); for (let k = 0; k < 6; k++) K.rod([2.6, 0.04, 2.9], [2.95 + (k % 3) * 0.06, 0.04 + (k % 2) * 0.03, 2.86 + k * 0.025], 0.008, '--vest'); K.rod([3.05, 0.04, 2.95], [5.6, 0.04, 3.2], 0.04, '--asphalt'); },
      () => { for (const x of [0.6, 2.8, 5.6]) K.box(0.06, 1.2, 0.06, '--art-steel', x, 0, 2.9); K.rod([0.6, 1.15, 2.9], [2.8, 1.1, 2.9], 0.04, '--asphalt'); K.rod([2.8, 1.1, 2.9], [5.6, 1.15, 2.9], 0.04, '--asphalt'); }, { pos: [3.4, 0.9, 4.6], look: [2.8, 0.1, 2.9] });
    // 땡볕 / 그늘
    hz(K, H, '6-4', null, () => { person(K, 5, -1.6, { pose: 'wipe', ry: -0.4 }); },
      () => { person(K, 5, -1.6, { pose: 'sit', ry: -0.4 }); for (const [x, z] of [[3.8, -2.8], [6.2, -2.8], [3.8, -0.4], [6.2, -0.4]]) K.cyl(0.04, 2.2, '--art-steel', x, 0, z); K.box(2.8, 0.06, 2.8, '--safe', 5, 2.2, -1.6); K.cyl(0.05, 0.22, '--art-shirt', 5.5, 0, -1.2); }, { pos: [4.0, 1.0, 2.6], look: [5.6, 2.8, -3.2] });
    // 함정: 방화포·소화기를 갖춘 용접
    person(K, -6.4, -2.6, { pose: 'weld', ry: 0.4 }); K.box(0.04, 1.6, 1.8, '--art-tan', -5.6, 0, -2.4); K.cyl(0.1, 0.55, '--danger', -7.2, 0, -2); S['6-s1'] = [-6.2, 0.8, -2.5];
    Pr.drum(K, -5.2, 1.4, '--danger'); Pr.welder(K, -5.2, -0.4, 0.3); Pr.pallet(K, 7.6, 0.8, 0.2); Pr.sign(K, 7.0, -4.2, 'caution', -0.3); Pr.water(K, 7.4, -2.8);
    return { cam: [0.4, 1.7, 6.6], look: [0.4, 0.5, -0.6], fov: 66 };
  },
};
export const SCENE3D_IDS = Object.keys(SCENES);

/* ---------------- 만들기 ---------------- */
// 렌더 품질: 부드러운 그림자 + ACES 톤 (지도와 같은 빛)
function look(r) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08; }
// 미리 렌더링용 한 장 (tools/render-scenes.mjs): 위험 켬 목록 on → { url, areas }
export async function renderStill(id, { on, w = 1080, h = 810, fmt = 'image/webp', q = 0.84 } = {}) {
  const v = await makeScene3D(id, { on, width: w, height: h, ratio: 1, shadow: 2048 }); if (!v) return null;
  v.render(); const url = v.canvas.toDataURL(fmt, q), areas = v.areas(); v.dispose(); return { url, areas };
}
let pairRenderer = null;
export async function makeScene3D(id, { on, width = 800, height = 600, ratio = 0, shadow = 1024 } = {}) {
  if (!SCENES[id] || !hasGL()) return null;
  await load3d();
  const canvas = document.createElement('canvas'); canvas.className = 'scene3d';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); } catch { return null; }
  renderer.setPixelRatio(ratio || Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(width, height, false);
  look(renderer);
  const built = build(id, shadow);
  const { scene, camera, H, S } = built;
  const setOn = (ids) => { for (const [k, v] of Object.entries(H)) { const b = !ids || ids.includes(k); v.bad.visible = b; v.good.visible = !b; } };
  setOn(on);
  const render = () => renderer.render(scene, camera);
  render();
  const v = new THREE.Vector3();
  const proj = (p) => { v.set(...p).project(camera); return { x: Math.round(((v.x + 1) / 2) * 400), y: Math.round(((1 - v.y) / 2) * 300), r: 30 }; };
  return {
    canvas, setOn, render,
    areas: () => ({ hazards: Object.fromEntries(Object.entries(H).map(([k, h]) => [k, proj(h.anchor)])), safe: Object.fromEntries(Object.entries(S).map(([k, p]) => [k, proj(p)])) }),
    dispose: () => { renderer.dispose(); renderer.forceContextLoss?.(); },
  };
}
function build(id, shadow = 1024) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(tok('--art-sky'), 30, 90);
  scene.add(new THREE.HemisphereLight(new THREE.Color(tok('--art-sky')), new THREE.Color(tok('--art-ground')), 1.25));
  const sun = new THREE.DirectionalLight(new THREE.Color(tok('--bg')).lerp(new THREE.Color(tok('--brand')), 0.18), 2.0);
  sun.position.set(-12, 22, 14); sun.castShadow = true; sun.shadow.mapSize.set(shadow, shadow); sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 70 }); sun.shadow.bias = -0.0006;
  scene.add(sun);
  const K = kit(scene); K.scene = scene;
  const H = {}, S = {};
  const c = SCENES[id](K, H, S);
  const camera = new THREE.PerspectiveCamera(c.fov || 55, 4 / 3, 0.1, 200);
  camera.position.set(...c.cam); camera.lookAt(...c.look); camera.updateMatrixWorld();
  // anchor=null → 위험한 모습 물체의 경계 상자 중심 (땅 위 부분만)
  for (const hh of Object.values(H)) {
    const bb = new THREE.Box3().setFromObject(hh.bad);
    hh.size = bb.isEmpty() ? 1 : bb.getSize(new THREE.Vector3()).length();
    if (!hh.anchor) { bb.min.y = Math.max(bb.min.y, 0.05); const ce = bb.getCenter(new THREE.Vector3()); hh.anchor = [ce.x, ce.y, ce.z]; }
  }
  return { scene, camera, H, S, cam: c };
}
// 위험마다 가까이 찍은 두 장 (위험 켬 / 끔) → { '0-1': { bad: dataURL, good: dataURL }, ... }
export async function renderPairs(id, { w = 320, h = 220, fmt = 'image/jpeg', q = 0.82, ratio = 1.5 } = {}) {
  if (!SCENES[id] || !hasGL()) return null;
  await load3d();
  if (!pairRenderer) {
    try { pairRenderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, preserveDrawingBuffer: true }); } catch { return null; }
    look(pairRenderer);
  }
  pairRenderer.setPixelRatio(ratio); pairRenderer.setSize(w, h, false);
  const { scene, H, cam } = build(id);
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.05, 200);
  const out = {};
  for (const [k, hh] of Object.entries(H)) {
    const a = new THREE.Vector3(...hh.anchor);
    if (hh.close) { camera.position.set(...hh.close.pos); camera.lookAt(...hh.close.look); }
    else { const from = new THREE.Vector3(...cam.cam); const dir = from.clone().sub(a).normalize(); camera.position.copy(a).addScaledVector(dir, Math.max(2.6, (hh.size || 1) * 1.2)).add(new THREE.Vector3(0, 0.5, 0)); camera.lookAt(a); }
    for (const v of Object.values(H)) { v.bad.visible = true; v.good.visible = false; }
    pairRenderer.render(scene, camera); const bad = pairRenderer.domElement.toDataURL(fmt, q);
    hh.bad.visible = false; hh.good.visible = true;
    pairRenderer.render(scene, camera); const good = pairRenderer.domElement.toDataURL(fmt, q);
    out[k] = { bad, good };
  }
  return out;
}
