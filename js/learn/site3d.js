// 첫 삽 v14 — 첫 화면 3D 공사 현장 지도 (블록 방식, three.js). 직접 만든 3D 게임(지예건설)과 같은 느낌
// mountSite(box, { zones, onPick }) → { destroy } | null (WebGL 을 못 쓰면 null → 평면 길로 대신)
//  zones: [{ id, no, title, state: 'done'|'cur'|'lock', stars, roof? }]  — 구역 위 번호 표시(HTML)를 누르면 onPick(id)
// 색은 css/tokens.css 토큰(화면 색 + 그림 전용 --art-*)에서 읽는다. 사람 얼굴·글자는 그리지 않는다.
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';

// 구역 자리 (x, z) — 정문 앞에서 시작해 현장을 한 바퀴 도는 길
const SPOT = [[-14, 14], [-2, 15], [12, 10], [13, -4], [1, -8], [-13, -6], [-7, -21], [10, -21]];

export async function mountSite(box, { zones, onPick, height = 440 } = {}) {
  let THREE;
  try { THREE = await import('../../vendor/three.module.js'); } catch { return null; }
  const canvas = document.createElement('canvas');
  canvas.className = 'site3d-canvas';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch { return null; }
  box.style.height = height + 'px';
  box.append(canvas);
  const marks = document.createElement('div'); marks.className = 'site3d-marks'; box.append(marks);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(tok('--art-sky'));
  scene.fog = new THREE.Fog(tok('--art-sky'), 70, 140);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(tok('--art-grass')), 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-30, 50, 25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 140 });
  scene.add(sun);

  // ---------- 블록 모으기 → 색마다 InstancedMesh 하나 ----------
  const blocks = new Map(); // color → [[x,y,z,w,h,d], ...]
  const B = (x, y, z, w, h, d, c) => { const k = tok(c); if (!blocks.has(k)) blocks.set(k, []); blocks.get(k).push([x, y, z, w, h, d]); };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: new THREE.Color(tok('--art-grass')) }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  B(0, 0.05, -3, 46, 0.1, 46, '--art-ground'); // 현장 부지
  // 울타리 (공사 가림막)
  for (let x = -23; x <= 23; x += 2) { B(x, 0.8, -26, 1.8, 1.6, 0.2, '--art-wall'); }
  for (let z = -26; z <= 20; z += 2) { B(-23, 0.8, z, 0.2, 1.6, 1.8, '--art-wall'); B(23, 0.8, z, 0.2, 1.6, 1.8, '--art-wall'); }
  // 구역 사이 점선 길
  for (let i = 0; i < SPOT.length - 1; i++) {
    const [ax, az] = SPOT[i], [bx, bz] = SPOT[i + 1], n = Math.round(Math.hypot(bx - ax, bz - az) / 1.6);
    for (let k = 1; k < n; k++) if (k % 2) B(ax + (bx - ax) * k / n, 0.14, az + (bz - az) * k / n, 0.9, 0.08, 0.9, '--bg');
  }
  const person = (x, z, vest = '--vest') => { B(x - 0.18, 0.45, z, 0.28, 0.9, 0.3, '--asphalt-2'); B(x + 0.18, 0.45, z, 0.28, 0.9, 0.3, '--asphalt-2'); B(x, 1.3, z, 0.8, 0.9, 0.5, vest); B(x, 2.0, z, 0.55, 0.5, 0.5, '--skin'); B(x, 2.35, z, 0.7, 0.25, 0.65, '--brand'); };
  // ① 출근 사무실: 컨테이너 + 게시판 + 사람
  { const [x, z] = SPOT[0]; B(x - 2, 1.5, z - 2, 6, 3, 3, '--art-wall'); B(x - 3.5, 1.8, z - 0.45, 1.4, 1, 0.1, '--art-glass'); B(x - 0.5, 1.2, z - 0.45, 1, 2.2, 0.1, '--art-steel');
    B(x + 3, 1.6, z - 1, 0.2, 3.2, 0.2, '--art-steel'); B(x + 3, 3, z - 0.9, 2.4, 1.4, 0.15, '--bg'); person(x - 1, z + 1.2); person(x + 0.4, z + 1.6); person(x + 1.8, z + 1.2); }
  // ② 골조 층 바닥: 기둥 + 슬래브 + 난간(앞쪽 끝은 열림) + 철근
  { const [x, z] = SPOT[1]; for (const [dx, dz] of [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]]) B(x + dx, 1.6, z + dz, 0.7, 3.2, 0.7, '--art-concrete-dark');
    B(x, 3.45, z, 7.4, 0.5, 6.2, '--art-concrete'); for (let k = -3; k <= 3; k += 1.5) { B(x + k, 4.3, z - 3, 0.15, 1.2, 0.15, '--art-helmet'); }
    B(x, 4.8, z - 3, 7.2, 0.15, 0.15, '--art-helmet'); B(x - 3.6, 4.8, z, 0.15, 0.15, 6, '--art-helmet'); B(x - 1.5, 3.75, z + 1, 1.2, 0.1, 1.2, '--asphalt');
    for (let k = 0; k < 4; k++) B(x + 1.5 + k * 0.4, 4.5, z - 1, 0.12, 1.6, 0.12, '--art-rebar'); person(x + 2.6, z + 2.2); }
  // ③ 비계: 건물 벽 + 비계 틀 + 발판 3단
  { const [x, z] = SPOT[2]; B(x + 1.6, 5, z - 1.4, 5, 10, 2, '--art-wall'); for (let yy = 1.5; yy < 10; yy += 2.6) for (let xx = -0.4; xx < 4; xx += 1.6) B(x + xx, yy, z - 0.38, 0.9, 1, 0.1, '--art-glass');
    for (const dx of [-1.2, 1.4, 4]) { B(x + dx, 4.8, z + 0.6, 0.15, 9.6, 0.15, '--art-steel'); B(x + dx, 4.8, z + 1.8, 0.15, 9.6, 0.15, '--art-steel'); }
    for (const yy of [3, 6, 9]) { B(x + 1.4, yy, z + 1.2, 5.4, 0.18, 1.3, '--art-wood'); B(x + 1.4, yy + 1, z + 1.8, 5.4, 0.12, 0.12, '--art-helmet'); }
    person(x + 0.2, z + 1.2 + 0 * 1); }
  // ④ 타워크레인 + 매단 짐
  { const [x, z] = SPOT[3]; B(x, 0.4, z, 2, 0.8, 2, '--art-concrete-dark'); B(x, 9, z, 0.9, 17, 0.9, '--art-helmet'); B(x - 3, 17.6, z, 14, 0.7, 0.8, '--art-helmet'); B(x + 5, 17.2, z, 2.2, 1.2, 1.2, '--art-concrete-dark');
    B(x, 18.6, z, 0.4, 1.6, 0.4, '--art-helmet'); B(x - 8, 13.5, z, 0.08, 7.5, 0.08, '--asphalt'); B(x - 8, 9.5, z, 2.4, 0.6, 1.4, '--art-wood'); person(x - 6, z + 2); }
  // ⑤ 굴착기 + 덤프
  { const [x, z] = SPOT[4]; B(x - 1, 0.4, z - 0.9, 4, 0.8, 0.8, '--asphalt'); B(x - 1, 0.4, z + 0.9, 4, 0.8, 0.8, '--asphalt'); B(x - 1, 1.5, z, 3.4, 1.4, 2.4, '--art-helmet');
    B(x - 1.8, 2.7, z + 0.5, 1.2, 1.2, 1.2, '--art-glass'); B(x + 1.2, 3, z, 3, 0.5, 0.5, '--art-helmet'); B(x + 2.8, 2.2, z, 0.5, 1.8, 0.5, '--art-helmet'); B(x + 3, 1.1, z, 1, 0.6, 0.9, '--asphalt');
    B(x + 1, 1.3, z + 4, 4.5, 1.6, 2.2, '--vest'); B(x + 3.8, 1.2, z + 4, 1.4, 1.6, 2, '--vest'); B(x + 3.8, 1.6, z + 4, 1, 0.7, 2.05, '--art-glass'); B(x - 4, 0.3, z - 1, 3, 0.6, 3, '--art-dirt'); person(x - 3.5, z + 2.5); }
  // ⑥ 타설·동바리 + 펌프카
  { const [x, z] = SPOT[5]; for (let dx = -2.4; dx <= 2.4; dx += 1.6) for (const dz of [-1.6, 1.6]) B(x + dx, 1.5, z + dz, 0.18, 3, 0.18, '--art-steel');
    B(x, 3.15, z, 6, 0.3, 4.4, '--art-wood'); B(x - 0.6, 3.6, z, 2, 0.6, 1.6, '--art-concrete-dark');
    B(x + 6, 1, z + 2, 4, 1.2, 2, '--vest'); B(x + 5, 3.5, z + 2, 0.5, 4, 0.5, '--art-steel'); B(x + 3, 5.6, z + 1.2, 4.5, 0.45, 0.45, '--art-steel'); person(x - 3.6, z + 2.8); }
  // ⑦ 용접·밀폐·더위: 방화포 칸막이 + 소화기 + 맨홀
  { const [x, z] = SPOT[6]; B(x, 1, z, 3, 2, 0.15, '--art-tan'); B(x + 1.7, 0.5, z + 0.6, 0.35, 1, 0.35, '--danger'); person(x - 0.6, z + 0.8);
    B(x + 4.5, 0.12, z + 1, 1.6, 0.06, 1.6, '--asphalt'); B(x + 6, 0.2, z + 1.4, 1.4, 0.2, 1.4, '--art-steel'); B(x - 3, 2, z - 1, 0.2, 4, 0.2, '--art-steel'); B(x - 3, 4, z - 1, 2.8, 0.15, 1.8, '--safe'); }
  // ⑧ 준공 깃발 (멈추고 알려요)
  { const [x, z] = SPOT[7]; B(x, 0.3, z, 3, 0.6, 3, '--art-concrete'); B(x, 3, z, 0.2, 5, 0.2, '--art-steel'); B(x + 0.9, 5, z, 1.6, 1, 0.1, '--brand'); }

  const geo = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  for (const [c, list] of blocks) {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: new THREE.Color(c) }), list.length);
    list.forEach(([x, y, z, w, h, d], i) => { pos.set(x, y, z); scl.set(w, h, d); m4.compose(pos, q, scl); mesh.setMatrixAt(i, m4); });
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  }

  // ---------- 구역 위 번호 표시 (HTML) ----------
  const TOPY = [4, 6, 10, 10, 4.5, 6.5, 5, 6.5];
  const els = zones.map((zn, i) => {
    const el = document.createElement('div');
    el.className = `z-mark ${zn.state}${zn.roof ? ' roof' : ''}`;
    el.innerHTML = `<button class="z-btn" ${zn.state === 'lock' ? 'disabled' : ''} data-scene="${zn.roof ? '' : zn.id}" ${zn.roof ? 'id="roofBtn"' : ''} aria-label="${zn.label}">${zn.icon}</button><span class="z-name">${zn.name}${zn.starsHtml || ''}</span>${zn.state === 'cur' && zn.mascot ? `<span class="z-who">${zn.mascot}</span><span class="z-tip">${zn.tip}</span>` : ''}`;
    el.querySelector('.z-btn').addEventListener('click', () => onPick(zn));
    marks.append(el);
    return { el, p: new THREE.Vector3(SPOT[i][0], TOPY[i], SPOT[i][1]) };
  });

  // ---------- 카메라: 끌면 돌아감, 가만히 있으면 천천히 둘러봄 ----------
  let theta = 0.1, phi = 0.72, dist = 80, dragging = null, idle = 0;
  const target = new THREE.Vector3(0, 0, -3.5);
  canvas.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; theta -= (e.clientX - dragging.x) * 0.008; phi = Math.min(1.2, Math.max(0.45, phi - (e.clientY - dragging.y) * 0.005)); dragging = { x: e.clientX, y: e.clientY }; idle = 0; });
  const up = () => { dragging = null; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  const v = new THREE.Vector3();
  let alive = true, t0 = performance.now();
  function size() { const w = box.clientWidth || 360; renderer.setSize(w, height, false); camera.aspect = w / height; camera.updateProjectionMatrix(); }
  size(); window.addEventListener('resize', size);
  function frame(now) {
    if (!alive) return;
    if (!box.isConnected) { destroy(); return; }
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (!dragging && !reduce()) { idle += dt; theta += Math.sin(idle * 0.25) * 0.0016; }
    camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(target);
    renderer.render(scene, camera);
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    for (const { el, p } of els) { v.copy(p).project(camera); const vis = v.z < 1; el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * hh}px)`; el.style.visibility = vis ? 'visible' : 'hidden'; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function destroy() { if (!alive) return; alive = false; window.removeEventListener('resize', size); renderer.dispose(); geo.dispose(); }
  window.__site3d = { zones: zones.length, gl: true };
  return { destroy };
}
