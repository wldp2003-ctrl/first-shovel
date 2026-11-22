// 첫 삽 v17 — 첫 화면 "현장 한 바퀴" 지도: 아이소메트릭 디오라마 (three.js, 정사영 카메라)
// 하나의 공사 현장을 두께 있는 땅 블록(옆면 = 흙 단면 층) 위에 올렸다. 7구역 = 신규 근로자가 일할 장소,
// 번호 순서 = 출근해서 현장을 한 바퀴 도는 동선(주황 점선). 소품은 props3d.js (위험 장면과 같은 모델).
// mountSite(box, { zones, onPick }) → { destroy, focus(i) } | null (WebGL 을 못 쓰면 null → 미리 렌더링한 지도 이미지)
//  zones: [{ id, state: 'done'|'cur'|'lock', html }] — 8번째는 "멈추고 알려요"(준공)
// renderSiteStill({ w, h, zone }) → { url, pins } : 같은 각도 이미지 (대체 이미지·미리 보기용, tools/render-scenes.mjs)
// 색은 css/tokens.css 토큰만. 글자·로고·얼굴 없음.
import * as Pr from './props3d.js';

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';

// 구역 중심 (x, z) — 정문(오른쪽 앞) → 출근·TBM → 골조 바닥 → 비계 → 양중 → 장비 → 타설 → 용접·밀폐 → 준공(멈추고 알려요)
export const SPOT = [[16, 16], [0, 16], [-16, 16], [-16, 0], [0, 0], [16, 0], [16, -16], [0, -16]];
const TOPY = [3.2, 5.0, 9.0, 7.0, 4.6, 5.2, 3.2, 5.5]; // 이름표를 붙일 높이
const ZH = [3.5, 6, 9, 20, 5, 9, 3.5, 7]; // 잠긴 구역 안개 높이
const ROUTE = [[16, 27.5], [16, 23], [-22, 23], [-22, 8], [22, 8], [22, -8], [0, -8]];
const HALF = 27, EL = 0.62, AZ = Math.PI / 4; // 땅 블록 반 폭, 내려보는 각(약 35°), 돌린 각(45°)

/* ---------- 조립 도구: 같은 모양·색은 InstancedMesh 하나로 ---------- */
function emitter(THREE) {
  const lists = new Map(), stack = [new THREE.Matrix4()];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), up = new THREE.Vector3(0, 1, 0);
  const push = (geo, c) => { const k = geo + '|' + c; if (!lists.has(k)) lists.set(k, []); lists.get(k).push(stack[stack.length - 1].clone().multiply(m4)); };
  const P = {
    box(w, h, d, c, x, y, z, ry = 0) { e.set(0, ry, 0); q.setFromEuler(e); m4.compose(p.set(x, y + h / 2, z), q, s.set(w, h, d)); push('box', c); },
    cyl(r, h, c, x, y, z) { q.identity(); m4.compose(p.set(x, y + h / 2, z), q, s.set(r, h, r)); push('cyl', c); },
    cone(r, h, c, x, y, z) { q.identity(); m4.compose(p.set(x, y + h / 2, z), q, s.set(r, h, r)); push('cone', c); },
    rod(a, b, r, c) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B); q.setFromUnitVectors(up, B.clone().sub(A).normalize()); m4.compose(p.copy(A).add(B).multiplyScalar(0.5), q, s.set(r, len, r)); push('cyl', c); },
    group(fn, x = 0, y = 0, z = 0, ry = 0, rx = 0) { e.set(rx, ry, 0, 'YXZ'); q.setFromEuler(e); const g = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.clone(), new THREE.Vector3(1, 1, 1)); stack.push(stack[stack.length - 1].clone().multiply(g)); fn(); stack.pop(); },
  };
  const geos = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cone: new THREE.ConeGeometry(1, 1, 12) };
  const finish = (scene) => {
    const mats = new Map();
    for (const [k, list] of lists) {
      const [g, c] = k.split('|');
      if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: new THREE.Color(tok(c)), roughness: 0.86, metalness: 0 }));
      const mesh = new THREE.InstancedMesh(geos[g], mats.get(c), list.length);
      list.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    return () => { Object.values(geos).forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); };
  };
  return { P, finish };
}

// 부드러운 접지 그림자 (구운 AO 대신 — 물체 밑 둥근 어둠)
function aoTex(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, tok('--asphalt')); gr.addColorStop(1, 'transparent');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 흙 단면 무늬 (옆면): 표토 · 흙 · 자갈 · 바위 층 + 돌 알갱이
function strataTex(THREE) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  const L = [['--art-dirt-dark', 0, 18], ['--art-dirt', 18, 62], ['--art-tan', 62, 98], ['--asphalt-2', 98, 128]];
  for (const [col, a, b] of L) { g.fillStyle = tok(col); g.fillRect(0, a, 512, b - a); }
  for (let i = 0; i < 900; i++) { const y = 20 + Math.random() * 105; g.fillStyle = tok(y > 62 && y < 98 ? '--art-concrete-dark' : y > 98 ? '--art-dark' : '--art-dirt-dark'); g.globalAlpha = 0.55; const r = 1 + Math.random() * (y > 62 && y < 98 ? 4 : 2.2); g.beginPath(); g.ellipse(Math.random() * 512, y, r * 1.4, r, 0, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  for (let x = 0; x < 512; x += 2) { g.fillStyle = tok('--art-dirt-dark'); g.fillRect(x, 16 + Math.sin(x / 13) * 2, 2, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
// 땅 윗면 무늬 (흙·자갈 알갱이)
function topTex(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = tok('--art-ground'); g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) { g.fillStyle = tok(i % 3 ? '--art-tan' : '--art-concrete-dark'); g.globalAlpha = 0.35; g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); }
  g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- 현장 만들기 ---------- */
function buildSite(THREE) {
  const scene = new THREE.Scene();
  const { P, finish } = emitter(THREE);
  const disposers = [];
  // 빛: 따뜻한 해 1 + 하늘빛 반구광
  scene.add(new THREE.HemisphereLight(new THREE.Color(tok('--art-sky')), new THREE.Color(tok('--art-dirt')), 1.25));
  const sun = new THREE.DirectionalLight(new THREE.Color(tok('--bg')).lerp(new THREE.Color(tok('--brand')), 0.22), 2.6);
  sun.position.set(-26, 46, 22); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 140 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  // 땅 블록: 윗면 + 옆면 흙 단면 (두께 4.5)
  const TH = 4.5, side = new THREE.MeshStandardMaterial({ map: strataTex(THREE), roughness: 1 }), top = new THREE.MeshStandardMaterial({ map: topTex(THREE), roughness: 1 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, TH, HALF * 2), [side, side, top, side, side, side]);
  slab.position.y = -TH / 2; slab.receiveShadow = true; scene.add(slab);
  side.map.repeat.set(3, 1);
  disposers.push(() => { slab.geometry.dispose(); side.map.dispose(); top.map.dispose(); side.dispose(); top.dispose(); });
  // 블록 밑 그림자 (떠 있는 디오라마 느낌)
  const ao = aoTex(THREE), aoMat = new THREE.MeshBasicMaterial({ map: ao, transparent: true, opacity: 0.38, depthWrite: false });
  const blob = (x, z, w, d, y = 0.02, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), o ? aoMat.clone() : aoMat); if (o) m.material.opacity = o; m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m; };
  blob(2, 3, HALF * 2.6, HALF * 2.6, -TH - 0.05, 0.5);
  // 바닥 구역 (콘크리트·흙)
  const pad = (x, z, w, d, c) => P.box(w, 0.06, d, c, x, 0, z);
  pad(16, 16, 12, 11, '--art-concrete'); pad(0, 16, 12, 11, '--art-concrete'); pad(16, 0, 12, 11, '--art-concrete'); pad(0, 0, 13, 13, '--art-dirt'); pad(0, -16, 10, 10, '--art-concrete');
  // 걷는 길 (자갈 띠) + 주황 점선 동선
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 1.3);
    P.box(Math.abs(bx - ax) + 2.2, 0.04, Math.abs(bz - az) + 2.2, '--art-concrete-dark', (ax + bx) / 2, 0, (az + bz) / 2);
    for (let k = 0; k < n; k += 2) { const t = (k + 0.5) / n; P.box(bx !== ax ? 0.75 : 0.32, 0.06, bx !== ax ? 0.32 : 0.75, '--vest', ax + (bx - ax) * t, 0.04, az + (bz - az) * t); }
  }
  // 둘레 가림막 (정문 자리는 열림)
  Pr.fence(P, -HALF + 0.4, -HALF + 0.4, HALF - 0.4, -HALF + 0.4); Pr.fence(P, -HALF + 0.4, -HALF + 0.4, -HALF + 0.4, HALF - 0.4);
  Pr.fence(P, HALF - 0.4, -HALF + 0.4, HALF - 0.4, HALF - 0.4); Pr.fence(P, -HALF + 0.4, HALF - 0.4, 13.5, HALF - 0.4); Pr.fence(P, 18.5, HALF - 0.4, HALF - 0.4, HALF - 0.4);
  P.box(0.4, 3.2, 0.4, '--art-steel', 13.4, 0, HALF - 0.4); P.box(0.4, 3.2, 0.4, '--art-steel', 18.6, 0, HALF - 0.4); P.box(5.6, 0.5, 0.3, '--brand', 16, 3.0, HALF - 0.4);
  const at = (i, dx, dz) => [SPOT[i][0] + dx, SPOT[i][1] + dz];
  const D = (i, dx, dz, o, y) => { const [x, z] = at(i, dx, dz); Pr.doll(P, x, z, o, y); blob(x, z, 0.9, 0.9, (y || 0) + 0.07); };
  const big = (x, z, w, d) => blob(x, z, w, d, 0.07, 0.45);
  // ① 출근·TBM: 컨테이너 사무실 + TBM 게시판 + 줄 선 4명 + 식수대·화장실·보호구 표지
  { const [x, z] = SPOT[0]; Pr.container(P, x - 1.5, z - 3.4); big(x - 1.5, z - 3.4, 7.5, 3.6); Pr.board(P, x + 3.6, z - 0.6, -Math.PI / 2); Pr.toilet(P, x + 4.6, z - 4.2); Pr.water(P, x - 4.6, z + 0.6); Pr.sign(P, x + 1.2, z + 4.6, 'mandatory'); Pr.sign(P, x + 3.4, z + 4.6, 'caution');
    for (let k = 0; k < 4; k++) D(0, -2.2 + k * 1.2, 1.6, { ry: Math.PI * 0.5 + 0.2 }); D(0, 2.4, 0.2, { helmet: 'white', ry: -Math.PI / 2, arm: 1 }); Pr.pallet(P, x - 4.4, z + 3.6); Pr.cone(P, x + 5, z + 3); }
  // ② 골조 바닥: 기둥 + 슬래브(높이 3.4) + 안전난간(앞쪽 일부 없음) + 개구부 덮개 + 철근
  { const [x, z] = SPOT[1]; Pr.frame(P, x, z - 0.5, 9, 7, 3.4); big(x, z - 0.5, 10, 8);
    for (const [a, b] of [[[-4.5, -4], [4.5, -4]], [[-4.5, -4], [-4.5, 3]], [[4.5, -4], [4.5, 3]], [[-4.5, 3], [0, 3]]]) { P.rod([x + a[0], 4.4, z + a[1]], [x + b[0], 4.4, z + b[1]], 0.06, '--art-helmet'); P.rod([x + a[0], 3.9, z + a[1]], [x + b[0], 3.9, z + b[1]], 0.06, '--art-helmet'); }
    for (const [dx, dz] of [[-4.5, -4], [4.5, -4], [-4.5, 3], [0, 3], [4.5, 3]]) P.box(0.1, 1.1, 0.1, '--art-helmet', x + dx, 3.4, z + dz);
    P.box(1.6, 0.06, 1.6, '--asphalt', x - 1.8, 3.4, z - 1.5); P.box(1.4, 0.07, 1.4, '--brand', x + 1.6, 3.4, z - 1.8);
    for (let k = 0; k < 5; k++) P.box(0.08, 1.4, 0.08, '--art-rebar', x - 3.9 + k * 0.25, 3.4, z - 3.5);
    Pr.plywood(P, x + 2.2, z + 0.8, 0, 4); D(1, -0.6, 0.6, { ry: 0.6 }, 3.4); D(1, 2.8, -2.4, { harness: true, ry: -0.4 }, 3.4); Pr.lumber(P, x + 3.4, z + 4.6, 0.1); Pr.rebar(P, x - 3, z + 4.6, 0); }
  // ③ 비계: 건물 벽 + 비계 4단(발판·안전난간·발끝막이판) + 고소작업대 + 강관 더미
  { const [x, z] = SPOT[2]; Pr.building(P, x - 0.5, z - 3.2, 9, 4.6, 9.6); big(x - 0.5, z - 1.5, 11, 8);
    Pr.scaffold(P, x - 0.5, z - 0.9, 9, 4); D(2, -2.5, -0.4, { harness: true }, 7.2); D(2, 1.8, -0.4, {}, 3.6);
    P.box(2.2, 0.5, 1.4, '--vest', x + 3.4, 0, z + 3.4); for (let k = 0; k < 3; k++) P.rod([x + 2.5, 0.5 + k * 0.9, z + 3.4], [x + 4.3, 1.4 + k * 0.9, z + 3.4], 0.05, '--art-dark');
    P.box(2.2, 0.12, 1.3, '--art-helmet', x + 3.4, 3.2, z + 3.4); P.box(2.2, 0.06, 0.06, '--art-helmet', x + 3.4, 4.2, z + 2.8); P.box(2.2, 0.06, 0.06, '--art-helmet', x + 3.4, 4.2, z + 4.0); D(2, 3.4, 3.4, { harness: true }, 3.3);
    Pr.pipes(P, x - 3.4, z + 4.0, 0); Pr.cone(P, x - 5, z + 1.6); Pr.cone(P, x + 0.5, z + 2.2); }
  // ④ 양중: 타워크레인 + 매단 자재 + 리프트 + 지게차 + 신호수 + 짐 아래 통제
  { const [x, z] = SPOT[3]; Pr.towerCrane(P, x - 3, z - 2.5, 0, 17, 13, 8, 5.2); big(x - 3, z - 2.5, 3.2, 3.2);
    P.group(() => Pr.lumber(P, 0, 0, 0), x + 5, 4.8, z - 2.5);
    for (let a = 0; a < 6.28; a += 0.9) Pr.cone(P, x + 5 + Math.cos(a) * 2.2, z - 2.5 + Math.sin(a) * 2.2);
    Pr.building(P, x + 1, z - 5.6, 5, 1.6, 7); Pr.hoist(P, x - 1.6, z - 4.4, 9, 3.4, true);
    Pr.forklift(P, x + 2.2, z + 3.4, 0.3); Pr.pallet(P, x + 4.6, z + 3.8); D(3, -1.6, 2.6, { arm: 1, ry: -0.6 }); D(3, 5.6, 0.6, { ry: 2.4 }); }
  // ⑤ 장비·토공: 판 구덩이 + 굴착기 + 덤프 + 롤러 + 흙더미 + 콘
  { const [x, z] = SPOT[4]; P.box(5, 0.03, 4, '--art-dirt-dark', x + 3, 0.06, z + 2.6); for (const [dx, dz, w, d] of [[0.5, 2.6, 0.3, 4], [5.5, 2.6, 0.3, 4], [3, 0.6, 5, 0.3], [3, 4.6, 5, 0.3]]) P.box(w, 0.3, d, '--art-dirt', x + dx, 0.06, z + dz);
    D(4, 3, 2.6, { ry: 0.5 }, -0.1); P.cone(1.6, 1.4, '--art-dirt', x + 3, 0, z - 1.2);
    Pr.excavator(P, x - 2.6, z - 2.6, 0.7, 0.4); big(x - 2.6, z - 2.6, 5.5, 4.5); Pr.dump(P, x + 2.4, z - 4.6, 0); big(x + 2.4, z - 4.6, 7.5, 3);
    Pr.roller(P, x - 3.8, z + 3.8, -0.2); for (let k = 0; k < 4; k++) Pr.cone(P, x - 5.8 + k * 1.4, z + 0.8); D(4, -5.4, 2.0, { arm: 1, ry: 0.6 }); }
  // ⑥ 타설: 동바리 + 거푸집 + 펌프카 붐 + 레미콘 + 전선
  { const [x, z] = SPOT[5]; Pr.shoring(P, x - 1.6, z - 1.2, 6, 4.4, 3.2); big(x - 1.6, z - 1.2, 7, 5.5);
    Pr.pumpTruck(P, x + 2.6, z + 4.0, Math.PI, [[0, 2.4, 0], [-1, 7, 0], [2.8, 8.4, 2.4], [4.2, 4.6, 4.8]]); big(x + 2.6, z + 4, 7.6, 3);
    Pr.mixer(P, x + 3.4, z - 4.6, 0); big(x + 3.4, z - 4.6, 7.5, 3);
    for (const dz of [-5, 5]) { P.box(0.25, 9, 0.25, '--art-wood-dark', x + 5.6, 0, z + dz); P.box(1.4, 0.15, 0.15, '--art-wood-dark', x + 5.6, 8.6, z + dz); }
    P.rod([x + 5.0, 8.75, z - 5], [x + 5.0, 8.75, z + 5], 0.03, '--asphalt'); P.rod([x + 6.2, 8.75, z - 5], [x + 6.2, 8.75, z + 5], 0.03, '--asphalt');
    D(5, -2.4, -1.4, {}, 3.42); D(5, -0.6, -0.2, { arm: 1 }, 3.42); D(5, -5, 2.6, { ry: 0.6 }); }
  // ⑦ 용접·밀폐·더위: 방화포 + 용접 + 소화기 / 맨홀 + 삼각대 + 송풍기 / 그늘막 + 물
  { const [x, z] = SPOT[6]; P.box(0.08, 1.8, 2.6, '--art-tan', x - 2.4, 0, z - 2.4); Pr.welder(P, x - 4.4, z - 1.2); D(6, -3.4, -2.6, { ry: -1.2 }); for (let k = 0; k < 10; k++) P.box(0.12, 0.12, 0.12, '--brand', x - 2.9 + Math.sin(k * 2.3) * 0.5, 0.2 + (k % 4) * 0.2, z - 2.6 + Math.cos(k * 1.7) * 0.5); Pr.extinguisher(P, x - 1.8, z - 0.8);
    Pr.manhole(P, x + 1.6, z + 1.4); Pr.tripod(P, x + 1.6, z + 1.4); Pr.blower(P, x + 3.6, z + 0.2, x + 1.7, z + 1.3); D(6, 2.6, 2.8, { ry: 2.6 });
    Pr.shade(P, x - 2.8, z + 3.2); Pr.water(P, x - 2.2, z + 3.4); D(6, -3.4, 3.0, { sit: true, ry: 0.4 }); Pr.drum(P, x + 4.6, z - 3.8, '--danger'); Pr.drum(P, x + 3.9, z - 4.4, '--mandatory'); }
  // ⑧ 준공: 다 지은 건물 + 깃대
  { const [x, z] = SPOT[7]; Pr.building(P, x - 1, z - 2, 6, 5, 6); big(x - 1, z - 2, 7, 6); P.box(0.15, 7.5, 0.15, '--art-steel', x + 3.6, 0, z + 2.4); P.box(1.8, 1.1, 0.06, '--brand', x + 4.5, 6.2, z + 2.4); Pr.cone(P, x + 2.2, z + 3.6); }
  // 자재 야적장 (왼쪽 뒤)
  { const x = -16, z = -16; Pr.rebar(P, x - 2, z - 3, 0.2, 5); Pr.rebar(P, x - 2, z - 1.4, 0.2, 5); Pr.lumber(P, x + 3, z - 3.4, 0.1); Pr.plywood(P, x + 3.4, z - 0.4, 0.3, 8); Pr.pipes(P, x - 2.4, z + 2.2, -0.2);
    for (let k = 0; k < 3; k++) Pr.pallet(P, x + 2 + k * 1.4, z + 3.4); Pr.container(P, x - 1, z - 7.4 + 1.2, 0); Pr.barrow(P, x + 5.6, z + 1.2, 0.8); Pr.drum(P, x - 5.4, z + 4.4, '--art-steel'); Pr.drum(P, x - 4.7, z + 4.9, '--art-steel'); }
  // 길가 콘·바리케이드
  for (const [x, z] of [[-8, 21], [8, 21], [-20, 12], [10, 6.5], [-10, 6.5], [20, -6], [6, -10]]) Pr.cone(P, x, z);
  Pr.barrier(P, 8, -9.6, 0); Pr.barrier(P, -8, 9.6, 0);
  disposers.push(finish(scene));
  disposers.push(() => { ao.dispose(); aoMat.dispose(); });
  // 잠긴 구역 안개 (반투명, 현장 모습은 비침)
  const fogMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tok('--bg-soft')), transparent: true, opacity: 0.62, depthWrite: false });
  const fogs = SPOT.map(([x, z], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(13.6, ZH[i], 13), fogMat); m.position.set(x, ZH[i] / 2 + 0.05, z); m.renderOrder = 5; m.visible = false; scene.add(m); return m; });
  const anchors = SPOT.map(([x, z], i) => new THREE.Vector3(x, TOPY[i], z));
  return { scene, anchors, fogs, dispose: () => { disposers.forEach((f) => f()); fogs.forEach((f) => f.geometry.dispose()); fogMat.dispose(); } };
}

// 정사영 카메라: 블록 전체가 들어오는 크기
function makeCam(THREE, aspect) {
  const halfW = 40, halfH = Math.max(halfW / aspect, 34);
  const cam = new THREE.OrthographicCamera(-halfH * aspect, halfH * aspect, halfH, -halfH, 0.1, 400);
  return cam;
}
function place(cam, target, theta, zoom) {
  cam.position.set(target.x + 120 * Math.cos(EL) * Math.sin(theta), target.y + 120 * Math.sin(EL), target.z + 120 * Math.cos(EL) * Math.cos(theta));
  cam.lookAt(target); cam.zoom = zoom; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
const TARGET0 = [0, -0.5, 1.5], ZOOM0 = 1.42; // 처음: 현장 전체가 화면 폭에 차게

export async function mountSite(box, { zones, onPick, height = 460 } = {}) {
  let THREE;
  try { THREE = await import('../../vendor/three.module.js'); } catch { return null; }
  const canvas = document.createElement('canvas');
  canvas.className = 'site3d-canvas';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch { return null; }
  box.style.height = height + 'px';
  box.append(canvas);
  const marks = document.createElement('div'); marks.className = 'site3d-marks'; box.append(marks);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const S = buildSite(THREE);
  zones.forEach((zn, i) => { if (S.fogs[i]) S.fogs[i].visible = zn.state === 'lock'; });
  let cam = makeCam(THREE, (box.clientWidth || 360) / height);

  // 구역 이름표 (HTML)
  const els = zones.map((zn, i) => {
    const el = document.createElement('div');
    el.className = `z-mark ${zn.state}${zn.roof ? ' roof' : ''}`; el.dataset.zone = zn.id;
    el.innerHTML = zn.html;
    el.querySelector('.zt-name')?.addEventListener('click', () => pick(i));
    marks.append(el);
    return { el, p: S.anchors[i] };
  });

  // 카메라: 끌면 돌아감, 두 손가락·휠로 확대, 구역을 누르면 0.6초 동안 다가감
  const target = new THREE.Vector3(...TARGET0);
  let theta = AZ, zoom = ZOOM0, anim = null, dragging = null, moved = 0;
  const pts = new Map(); let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; } dragging = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; zoom = Math.min(3.2, Math.max(ZOOM0 * 0.8, zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / (pinch0 || 1))); moved = 99; return; }
    if (!dragging) return; const dx = e.clientX - dragging.x; moved += Math.abs(dx) + Math.abs(e.clientY - dragging.y);
    theta -= dx * 0.008; dragging.x = e.clientX; dragging.y = e.clientY; anim = null;
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    if (dragging && moved < 8 && performance.now() - dragging.t < 500) tapAt(e.clientX, e.clientY);
    dragging = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); dragging = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.min(3.2, Math.max(ZOOM0 * 0.8, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); }, { passive: false });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function tapAt(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam); if (!ray.ray.intersectPlane(plane, hit)) return;
    let best = -1, bd = 7.5; SPOT.forEach(([x, z], i) => { const d = Math.hypot(hit.x - x, hit.z - z); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && best < zones.length) pick(best);
  }
  function pick(i) {
    const zn = zones[i];
    if (zn.state === 'lock') { const el = els[i].el; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
    focus(i, () => onPick(zn));
  }
  function focus(i, then) {
    const to = new THREE.Vector3(SPOT[i][0], 1, SPOT[i][1]), from = target.clone(), z0 = zoom, z1 = 2.4, t0 = performance.now(), dur = reduce() ? 0 : 600;
    anim = (now) => { const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3); target.lerpVectors(from, to, e); zoom = z0 + (z1 - z0) * e; if (k >= 1) { anim = null; then?.(); } };
  }
  const v = new THREE.Vector3();
  let alive = true, lastKey = '';
  function size() { const w = box.clientWidth || 360; renderer.setSize(w, height, false); const c2 = makeCam(THREE, w / height); cam = c2; }
  size(); window.addEventListener('resize', size);
  function frame(now) {
    if (!alive) return;
    if (!box.isConnected) { destroy(); return; }
    anim?.(now);
    // 카메라가 그대로면 다시 그리지 않음 (배터리·저사양 휴대전화)
    const key = `${theta.toFixed(4)}|${zoom.toFixed(4)}|${target.x.toFixed(3)}|${target.z.toFixed(3)}|${canvas.width}`;
    if (key === lastKey) { requestAnimationFrame(frame); return; }
    lastKey = key;
    place(cam, target, theta, zoom);
    renderer.render(S.scene, cam);
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    for (const { el, p } of els) { v.copy(p).project(cam); el.style.transform = `translate(${Math.round(((v.x + 1) / 2) * w)}px, ${Math.round(((1 - v.y) / 2) * hh)}px)`; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function destroy() { if (!alive) return; alive = false; window.removeEventListener('resize', size); S.dispose(); renderer.dispose(); }
  window.__site3d = { zones: zones.length, gl: true, pick: (i) => pick(i), focus: (i) => focus(i), get theta() { return theta; } };
  return { destroy, focus };
}

// 같은 각도로 한 장 (대체 지도 이미지 / 구역 가까이 미리 보기). zone: 구역 번호(가까이) 또는 null(전체)
export async function renderSiteStill({ w = 1080, h = 1220, zone = null, fmt = 'image/webp', q = 0.86 } = {}) {
  const THREE = await import('../../vendor/three.module.js');
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const S = buildSite(THREE), cam = makeCam(THREE, w / h);
  const target = zone == null ? new THREE.Vector3(...TARGET0) : new THREE.Vector3(SPOT[zone][0], 1.5, SPOT[zone][1]);
  place(cam, target, AZ, zone == null ? ZOOM0 : 3.3);
  renderer.render(S.scene, cam);
  const url = canvas.toDataURL(fmt, q);
  const v = new THREE.Vector3();
  const pins = S.anchors.map((p) => { v.copy(p).project(cam); return { x: +(((v.x + 1) / 2) * 100).toFixed(2), y: +(((1 - v.y) / 2) * 100).toFixed(2) }; });
  S.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
  return { url, pins };
}
