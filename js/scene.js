// 3D 현장 — Three.js 복셀 렌더링
import * as THREE from 'three';
import { t as $t } from './lang.js';
import { buildModel } from './models.js';
import { BUILDINGS, COUNTRIES } from './data.js';

let renderer, scene, camera, clock, labelsEl;
let hemi, sun, groundMat;
let siteGroup = null, buildingsInfo = [], focusIdx = 0;
const tgt = new THREE.Vector3(0, 6, 0), curTgt = new THREE.Vector3(0, 6, 0);
let theta = 0.7, phi = 1.05, dist = 45, curDist = 45;
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const blockMat = new THREE.MeshLambertMaterial();
const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
let anims = [];
let people = [], me = null, friends = new Map();
let mixer = null, pile = null, crane = null, craneStopped = false;
let particles = null, wxKind = 'clear';
let stats = { workers: 0 };
let introMode = false;
export const hooks = { onGift: null, onHoistTap: null };
let hoist = null, hoistRide = null, paused = false;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

const SKY = { clear: 0x9fd8f5, cloud: 0xb7c8d4, fog: 0xc9d1d6, rain: 0x8a9aa8, snow: 0xc4ced8, storm: 0x5f6b78 };

export function initScene(canvas, labels) {
  labelsEl = labels;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY.clear);
  scene.fog = new THREE.Fog(SKY.clear, 90, 260);
  camera = new THREE.PerspectiveCamera(45, 1, 0.5, 600);
  hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.15);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff3dd, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.far = 260;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), groundMat = new THREE.MeshLambertMaterial({ color: 0x7cc456 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true;
  scene.add(ground);
  clock = new THREE.Clock();
  setupControls(canvas);
  window.addEventListener('resize', resize);
  resize();
  renderer.setAnimationLoop(loop);
}

function resize() {
  const c = renderer.domElement, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 세로 화면: 아래쪽 패널을 피해 화면 중심을 위로 올림
  camera.setViewOffset(w, h, 0, h > w ? h * 0.13 : 0, w, h);
  camera.updateProjectionMatrix();
}

// ---------- 카메라 조작: 드래그 회전, 핀치 확대 ----------
function setupControls(el) {
  const pts = new Map(); let lastPinch = 0;
  let down = null;
  el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch {} pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = pts.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
  el.addEventListener('pointerup', (e) => {
    if (!down || !hoist || hoistRide) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 500) return;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(hoist, true).length) hooks.onHoistTap?.();
  });
  el.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId);
    if (pts.size === 1) {
      theta -= (e.clientX - p.x) * 0.008;
      phi = Math.min(1.45, Math.max(0.25, phi - (e.clientY - p.y) * 0.006));
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const [a2, b2] = [...pts.values()];
      const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y);
      if (d0 > 0) zoomBy(d0 / d1);
      return;
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  const up = (e) => pts.delete(e.pointerId);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
}
function zoomBy(k) { dist = Math.min(220, Math.max(14, dist * k)); }

// ---------- 사람(인부) ----------
export function makePerson(vest = 0xff8a1e, helmet = 0xffd400) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const legL = box(0.28, 0.6, 0.3, 0x3a4a6a, -0.16, 0.3, 0);
  const legR = box(0.28, 0.6, 0.3, 0x3a4a6a, 0.16, 0.3, 0);
  box(0.66, 0.62, 0.38, vest, 0, 0.9, 0);
  box(0.68, 0.08, 0.4, 0xeeee66, 0, 0.95, 0); // 반사띠
  const armL = box(0.18, 0.55, 0.22, 0xf0c8a0, -0.43, 0.9, 0);
  const armR = box(0.18, 0.55, 0.22, 0xf0c8a0, 0.43, 0.9, 0);
  box(0.46, 0.44, 0.44, 0xf3cfa6, 0, 1.43, 0);
  box(0.08, 0.08, 0.02, 0x222222, -0.1, 1.46, 0.23); box(0.08, 0.08, 0.02, 0x222222, 0.1, 1.46, 0.23);
  box(0.56, 0.2, 0.56, helmet, 0, 1.72, 0);
  box(0.6, 0.05, 0.66, helmet, 0, 1.63, 0.04);
  const brick = box(0.5, 0.25, 0.3, 0xb5523b, 0, 1.05, 0.38); brick.visible = false;
  g.userData = { legL, legR, armL, armR, brick };
  return g;
}

function makeBubbleEl(cls = '') {
  const b = document.createElement('div'); b.className = 'bubble ' + cls; b.style.display = 'none';
  labelsEl.appendChild(b); return b;
}
function makeLabelEl(text, cls = '') {
  const b = document.createElement('div'); b.className = 'plabel ' + cls; b.textContent = text;
  labelsEl.appendChild(b); return b;
}

function newAgent(kind, opts = {}) {
  const mesh = makePerson(opts.vest, opts.helmet);
  const a = { kind, mesh, pos: new THREE.Vector3(), target: new THREE.Vector3(), wait: Math.random() * 2, speed: 2 + Math.random(),
    carrying: false, phase: Math.random() * 10, bubble: makeBubbleEl(), bubbleT: 0, label: null, gift: null, hop: 0 };
  if (opts.label) a.label = makeLabelEl(opts.label, opts.labelCls);
  scene.add(mesh);
  return a;
}
function removeAgent(a) {
  scene.remove(a.mesh); a.bubble.remove(); a.label?.remove(); a.gift?.remove();
}

// ---------- 현장 ----------
function siteSpots() {
  const b = buildingsInfo[focusIdx];
  if (!b) return null;
  const s = b.size;
  return {
    b, cx: b.x, w: (s.x1 - s.x0) / 2, d: (s.z1 - s.z0) / 2,
    pile: new THREE.Vector3(b.x + s.x0 - 5, 0, s.z0 - 2),
    mixer: new THREE.Vector3(b.x + s.x0 - 5, 0, s.z0 + 3),
  };
}

function rngf(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function setCountry(countryIdx, states, focus, opts = {}) {
  // states: [{ shown: number(blocks) }] for each building in the country
  clearSite();
  introMode = false;
  const country = COUNTRIES[countryIdx];
  groundMat.color.setHex(country.ground);
  siteGroup = new THREE.Group(); scene.add(siteGroup);
  const list = BUILDINGS.filter((b) => b.c === country.id);
  let x = 0;
  buildingsInfo = list.map((def, i) => {
    const model = buildModel(def.id);
    const s = model.size;
    if (i > 0) x += -s.x0 + 12;
    const info = { def, model, size: s, x, mesh: null, shown: 0, label: null };
    x += s.x1;
    return info;
  });
  const mid = (buildingsInfo[0].x + buildingsInfo[buildingsInfo.length - 1].x) / 2;
  buildingsInfo.forEach((info) => { info.x -= mid; });
  const soilMat = new THREE.MeshLambertMaterial({ color: country.soil });
  let maxZ = 0;
  buildingsInfo.forEach((info, i) => {
    const s = info.size;
    maxZ = Math.max(maxZ, s.z1);
    const plot = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0 + 7, 0.2, s.z1 - s.z0 + 7), soilMat);
    plot.position.set(info.x + (s.x0 + s.x1) / 2, -0.45, (s.z0 + s.z1) / 2); plot.receiveShadow = true;
    siteGroup.add(plot);
    const mesh = new THREE.InstancedMesh(boxGeo, blockMat, info.model.blocks.length);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.count = 0; mesh.frustumCulled = false;
    const r = rngf(i * 977 + 13);
    info.model.blocks.forEach((b, k) => {
      tmpC.setHex(b[3]); const v = 0.92 + r() * 0.13; tmpC.r *= v; tmpC.g *= v; tmpC.b *= v;
      mesh.setColorAt(k, tmpC);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    info.mesh = mesh;
    siteGroup.add(mesh);
    info.label = makeLabelEl(info.def.name, 'blabel');
    setShown(i, states[i]?.shown || 0, false);
    // 착공 전 부지 표지판
    const sign = makePlotSign();
    sign.position.set(info.x + s.x0 - 2, 0, s.z1 + 3);
    siteGroup.add(sign); info.sign = sign;
  });
  // 도로
  const road = new THREE.Mesh(new THREE.BoxGeometry(2000, 0.1, 6), new THREE.MeshLambertMaterial({ color: 0x45484e }));
  road.position.set(0, -0.44, maxZ + 12); road.receiveShadow = true; siteGroup.add(road);
  for (let k = -60; k <= 60; k++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.3), new THREE.MeshLambertMaterial({ color: 0xffd400 }));
    line.position.set(k * 6, -0.38, maxZ + 12); siteGroup.add(line);
  }
  // 나무 / 사막 바위
  const r = rngf(countryIdx * 31 + 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9a3a }), leafMat2 = new THREE.MeshLambertMaterial({ color: 0x58b048 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5232 });
  const rockMat = new THREE.MeshLambertMaterial({ color: country.soil });
  const span = (buildingsInfo[buildingsInfo.length - 1].x - buildingsInfo[0].x) / 2 + 60;
  for (let k = 0; k < 70; k++) {
    const px = (r() * 2 - 1) * span, pz = r() < 0.5 ? -(20 + r() * 50) : maxZ + 18 + r() * 40;
    const g = new THREE.Group();
    if (country.trees) {
      const h = 2 + Math.floor(r() * 3);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), trunkMat); t.position.y = h / 2 - 0.5; t.castShadow = true; g.add(t);
      const l = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), r() < 0.5 ? leafMat : leafMat2); l.position.y = h + 1; l.castShadow = true; g.add(l);
    } else {
      const s = 1 + r() * 2.5;
      const l = new THREE.Mesh(new THREE.BoxGeometry(s * 1.6, s * 0.7, s), rockMat); l.position.y = s * 0.3 - 0.4; g.add(l);
    }
    g.position.set(px, 0, pz); siteGroup.add(g);
  }
  // 자재 더미 + 믹서
  pile = makePile(); siteGroup.add(pile);
  mixer = makeMixer(); siteGroup.add(mixer);
  focusOn(focus, true);
  if (opts.viewOnly) { pile.visible = false; mixer.visible = false; }
}

function makePlotSign() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
  post.position.y = 0.7; g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.2), new THREE.MeshLambertMaterial({ color: 0xffd400 }));
  board.position.y = 2.2; g.add(board);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.25, 0.22), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  stripe.position.y = 1.6; g.add(stripe);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
function makePile() {
  const g = new THREE.Group();
  const cols = [0xb5523b, 0xa84a35, 0xc0c0b8, 0x9c6a3c];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: cols[i % 4] }));
    m.position.set((i % 3) - 1, Math.floor(i / 6) * 1, Math.floor((i % 6) / 3) - 0.5);
    m.castShadow = true; g.add(m);
  }
  const sack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), new THREE.MeshLambertMaterial({ color: 0xe8e0c8 }));
  sack.position.set(2, -0.25, 0); g.add(sack);
  return g;
}
function makeMixer() {
  const g = new THREE.Group();
  const orange = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.2), new THREE.MeshLambertMaterial({ color: 0x555555 }));
  frame.position.y = 0.2; g.add(frame);
  for (const sx of [-0.6, 0.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12), new THREE.MeshLambertMaterial({ color: 0x222222 })); w.rotation.z = Math.PI / 2; w.position.set(sx, -0.1, 0.65); g.add(w); }
  const drum = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 1.4, 10), orange); drum.add(body);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.4, 10), orange); lip.position.y = 0.9; drum.add(lip);
  for (let k = 0; k < 3; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), new THREE.MeshLambertMaterial({ color: 0xffb070 })); fin.position.set(Math.cos(k * 2.1) * 0.75, 0, Math.sin(k * 2.1) * 0.75); drum.add(fin); }
  drum.position.y = 1.3; drum.rotation.x = -0.6;
  g.add(drum); g.userData.drum = drum;
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
function makeCrane(h) {
  const g = new THREE.Group();
  const y = new THREE.MeshLambertMaterial({ color: 0xffc400 });
  const dk = new THREE.MeshLambertMaterial({ color: 0x333333 });
  for (let i = 0; i < h; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), i % 2 ? y : new THREE.MeshLambertMaterial({ color: 0xe0a800 }));
    seg.position.y = i + 0.5; seg.castShadow = true; g.add(seg);
  }
  const top = new THREE.Group(); top.position.y = h;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8, 0.8), y); jib.position.set(7, 0.6, 0); top.add(jib);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), new THREE.MeshLambertMaterial({ color: 0xfafafa })); cab.position.set(0, -0.3, 1.2); top.add(cab);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1.4), dk); cw.position.set(-3.5, 0.3, 0); top.add(cw);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), y); peak.position.set(0, 2.2, 0); top.add(peak);
  const trolley = new THREE.Group(); trolley.position.set(10, 0, 0);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), dk); trolley.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), new THREE.MeshLambertMaterial({ color: 0xb5523b })); trolley.add(hook);
  top.add(trolley);
  top.traverse((o) => { o.castShadow = true; });
  g.add(top);
  g.userData = { top, trolley, cable, hook, h };
  return g;
}

function clearSite() {
  if (siteGroup) { scene.remove(siteGroup); siteGroup.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); }
  buildingsInfo.forEach((b) => b.label?.remove());
  buildingsInfo = []; anims = [];
  if (crane) { scene.remove(crane); crane = null; }
  if (hoist) { scene.remove(hoist); hoist = null; }
}

export function focusOn(i, instant = false) {
  focusIdx = Math.max(0, Math.min(i, buildingsInfo.length - 1));
  const b = buildingsInfo[focusIdx]; if (!b) return;
  const s = b.size;
  tgt.set(b.x + (s.x0 + s.x1) / 2, Math.min(s.h * 0.38, 24), (s.z0 + s.z1) / 2);
  dist = Math.max(44, Math.min(160, s.h * 1.6 + 30));
  if (instant) { curTgt.copy(tgt); curDist = dist; }
  const sp = siteSpots();
  if (pile && sp) { pile.position.set(sp.pile.x, 0, sp.pile.z); mixer.position.set(sp.mixer.x, 0, sp.mixer.z); }
  if (crane) placeCrane();
  if (hoist) placeHoist();
  // 기존 인부 위치 재배치
  people.forEach((a) => { if (sp) { a.pos.set(sp.pile.x + (Math.random() - 0.5) * 4, 0, sp.pile.z + 2); a.mesh.position.copy(a.pos); } });
  if (me && sp) { me.pos.set(b.x + s.x0 - 2, 0, s.z1 + 4); me.mesh.position.copy(me.pos); }
}

export function setShown(i, n, animate = true) {
  const b = buildingsInfo[i]; if (!b) return;
  const blocks = b.model.blocks;
  n = Math.max(0, Math.min(blocks.length, Math.floor(n)));
  const now = performance.now();
  if (n > b.shown) {
    const startAnim = animate ? Math.max(b.shown, n - 500) : n;
    for (let k = b.shown; k < n; k++) {
      const bl = blocks[k];
      if (k >= startAnim) {
        const delay = ((k - startAnim) / Math.max(1, n - startAnim)) * Math.min(900, (n - startAnim) * 40);
        anims.push({ b, k, t0: now + delay });
        tmpM.makeTranslation(b.x + bl[0], 9999, bl[2]);
      } else tmpM.makeTranslation(b.x + bl[0], bl[1], bl[2]);
      b.mesh.setMatrixAt(k, tmpM);
    }
  } else if (n < b.shown) {
    anims = anims.filter((a) => a.b !== b || a.k < n);
  }
  b.shown = n;
  let my = 0; for (let k = 0; k < n; k++) if (blocks[k][1] > my) my = blocks[k][1];
  b.maxY = n ? my : 0;
  if (hoist && b === buildingsInfo[focusIdx]) placeHoist();
  b.mesh.count = n;
  b.mesh.instanceMatrix.needsUpdate = true;
  if (b.sign) b.sign.visible = n === 0;
}
export const blockCount = (i) => buildingsInfo[i]?.model.blocks.length || 0;

function updateAnims(now) {
  if (!anims.length) return;
  const touched = new Set();
  anims = anims.filter((a) => {
    const bl = a.b.model.blocks[a.k];
    const p = (now - a.t0) / 380;
    if (p < 0) return true;
    const e = p >= 1 ? 1 : 1 - Math.pow(1 - p, 3);
    const y = bl[1] + (1 - e) * 12;
    tmpM.makeTranslation(a.b.x + bl[0], y, bl[2]);
    a.b.mesh.setMatrixAt(a.k, tmpM);
    touched.add(a.b);
    return p < 1;
  });
  touched.forEach((b) => { b.mesh.instanceMatrix.needsUpdate = true; });
}

// ---------- 인부/친구/나 ----------
export function setWorkers(n) {
  stats.workers = n;
  while (people.length < n) {
    const a = newAgent('worker');
    const sp = siteSpots();
    if (sp) a.pos.set(sp.pile.x + (Math.random() - 0.5) * 4, 0, sp.pile.z + 2);
    a.mesh.position.copy(a.pos);
    people.push(a);
  }
  while (people.length > n) removeAgent(people.pop());
}
export function ensureMe() {
  if (me) return;
  me = newAgent('me', { helmet: 0xffffff, vest: 0x2fb35a, label: $t('scene.ensureMe.1'), labelCls: 'me' });
  const sp = siteSpots(); if (sp) me.pos.set(sp.cx - sp.w - 3, 0, sp.d + 4);
}
export function setFriends(list) {
  const ids = new Set(list.map((f) => f.id));
  for (const [id, a] of friends) if (!ids.has(id)) { removeAgent(a); friends.delete(id); }
  const vests = [0x3a7bd5, 0x9b59b6, 0x16a085, 0xe84393, 0x2c3e50];
  list.forEach((f, i) => {
    if (friends.has(f.id)) { friends.get(f.id).label.textContent = f.nick; return; }
    const a = newAgent('friend', { vest: vests[i % vests.length], helmet: 0xffffff, label: f.nick, labelCls: 'friend' });
    const sp = siteSpots(); if (sp) a.pos.set(sp.cx + (Math.random() - 0.5) * 10, 0, sp.d + 5);
    friends.set(f.id, a);
  });
}
export function friendSay(id, text) { const a = friends.get(id); if (a) showBubble(a, text, 4); }

function showBubble(a, text, sec = 3.2) {
  a.bubble.textContent = text; a.bubble.style.display = 'block'; a.bubbleT = sec;
  a.bubble.classList.remove('pop'); void a.bubble.offsetWidth; a.bubble.classList.add('pop');
}
export function say(text, who = 'random') {
  let a;
  if (who === 'mixer') a = people[0];
  else if (who === 'me') a = me;
  else if (typeof who === 'number') a = people[who];
  else a = people.length ? people[Math.floor(Math.random() * people.length)] : null;
  if (!a) return false;
  showBubble(a, text);
  return true;
}
export function giftBubble(text, onClick) {
  const cands = people.filter((p) => !p.gift);
  const a = cands[Math.floor(Math.random() * cands.length)];
  if (!a) return false;
  const g = document.createElement('div'); g.className = 'bubble gift pop'; g.textContent = '⟦gift⟧ ' + text;
  g.addEventListener('pointerdown', (e) => { e.stopPropagation(); g.remove(); a.gift = null; onClick?.(); });
  labelsEl.appendChild(g); a.gift = g;
  setTimeout(() => { if (a.gift === g) { g.remove(); a.gift = null; } }, 14000);
  return true;
}
export function workPulse() {
  people.forEach((a) => { a.hop = 0.35; });
  if (me) me.hop = 0.45;
}

// ---------- 크레인 ----------
export function setCrane(has, stopped) {
  craneStopped = stopped;
  if (has && !crane && buildingsInfo.length) { placeCrane(); }
  if (!has && crane) { scene.remove(crane); crane = null; }
}
function placeCrane() {
  const b = buildingsInfo[focusIdx]; if (!b) return;
  const h = Math.min(90, Math.max(18, Math.round(b.size.h + 8)));
  if (crane && crane.userData.h !== h) { scene.remove(crane); crane = null; }
  if (!crane) { crane = makeCrane(h); scene.add(crane); }
  crane.position.set(b.x + b.size.x1 + 4, 0, b.size.z0 - 4);
}

// ---------- 날씨 ----------
export function setWeather(kind) {
  wxKind = kind;
  const sky = SKY[kind] ?? SKY.clear;
  scene.background.setHex(sky); scene.fog.color.setHex(sky);
  scene.fog.near = kind === 'fog' ? 25 : 90; scene.fog.far = kind === 'fog' ? 120 : 260;
  sun.intensity = kind === 'clear' ? 1.5 : kind === 'cloud' ? 0.9 : 0.55;
  hemi.intensity = kind === 'clear' ? 1.15 : 1.0;
  if (particles) { scene.remove(particles); particles.geometry.dispose(); particles = null; }
  if (kind === 'rain' || kind === 'storm' || kind === 'snow') {
    const n = kind === 'snow' ? 1400 : 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 120; pos[i * 3 + 1] = Math.random() * 70; pos[i * 3 + 2] = (Math.random() - 0.5) * 120; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: kind === 'snow' ? 0xffffff : 0xcfe3ff, size: kind === 'snow' ? 0.5 : 0.22, transparent: true, opacity: 0.85 });
    particles = new THREE.Points(geo, mat); particles.userData.kind = kind;
    scene.add(particles);
  }
}

// ---------- 인트로: 블록이 하나씩 떨어져 집 완성 ----------
let introTimer = null;
export function playIntro() {
  clearSite();
  introMode = true;
  groundMat.color.setHex(0x7cc456);
  siteGroup = new THREE.Group(); scene.add(siteGroup);
  const model = buildModel('house');
  const info = { def: { name: '' }, model, size: model.size, x: 0, mesh: new THREE.InstancedMesh(boxGeo, blockMat, model.blocks.length), shown: 0 };
  info.mesh.count = 0; info.mesh.castShadow = true; info.mesh.frustumCulled = false;
  model.blocks.forEach((b, k) => { tmpC.setHex(b[3]); info.mesh.setColorAt(k, tmpC); });
  siteGroup.add(info.mesh);
  buildingsInfo = [info];
  const r = rngf(5);
  const trunk = new THREE.MeshLambertMaterial({ color: 0x7a5232 }), leaf = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
  for (let k = 0; k < 18; k++) {
    const a = r() * Math.PI * 2, d = 14 + r() * 25;
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.8), trunk); t.position.set(Math.cos(a) * d, 1, Math.sin(a) * d);
    const l = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), leaf); l.position.set(Math.cos(a) * d, 3.8, Math.sin(a) * d);
    t.castShadow = l.castShadow = true; siteGroup.add(t, l);
  }
  focusIdx = 0;
  tgt.set(0, 1.5, 0); dist = 46; curTgt.copy(tgt); curDist = dist; theta = 0.6; phi = 1.12;
  setWeather('clear');
  clearInterval(introTimer);
  let n = 0;
  const total = model.blocks.length;
  introTimer = setInterval(() => {
    n += Math.max(1, Math.round(total / 70));
    setShown(0, Math.min(n, total), true);
    if (n >= total) clearInterval(introTimer);
  }, 45);
}
export function endIntro() { clearInterval(introTimer); introMode = false; }

// ---------- 루프 ----------
const proj = new THREE.Vector3();
function placeEl(el, worldPos, yOff) {
  proj.copy(worldPos); proj.y += yOff; proj.project(camera);
  if (proj.z > 1) { el.style.visibility = 'hidden'; return; }
  const c = renderer.domElement;
  el.style.visibility = 'visible';
  el.style.transform = `translate(-50%, -100%) translate(${(proj.x * 0.5 + 0.5) * c.clientWidth}px, ${(-proj.y * 0.5 + 0.5) * c.clientHeight}px)`;
}

function updateAgent(a, dt, t, sp, idx) {
  const ud = a.mesh.userData;
  if (a.kind === 'worker' && idx === 0 && sp) {
    // 첫 번째 인부: 믹서 옆에서 삽으로 시멘트 젓기
    a.pos.set(sp.mixer.x - 1.6, 0, sp.mixer.z + 0.4);
    a.mesh.position.copy(a.pos);
    a.mesh.rotation.y = Math.PI / 2;
    const s = Math.sin(t * 5);
    ud.armL.rotation.x = -1 + s * 0.5; ud.armR.rotation.x = -1 + s * 0.5;
    if (!ud.shovel) {
      const sh = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), new THREE.MeshLambertMaterial({ color: 0x8a6a4a })); stick.position.y = -0.3; sh.add(stick);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.06), new THREE.MeshLambertMaterial({ color: 0x777777 })); blade.position.y = -1.1; sh.add(blade);
      sh.position.set(0, 1.0, 0.45); a.mesh.add(sh); ud.shovel = sh;
    }
    ud.shovel.rotation.x = 0.6 + s * 0.4;
  } else if (sp) {
    if (ud.shovel) { a.mesh.remove(ud.shovel); ud.shovel = null; }
    const d = a.target.distanceTo(a.pos);
    if (a.wait > 0) {
      a.wait -= dt;
      ud.legL.rotation.x = ud.legR.rotation.x = 0;
      if (a.wait <= 0) {
        // 다음 목적지
        if (a.kind === 'worker') {
          a.carrying = !a.carrying;
          if (a.carrying) {
            const side = Math.floor(Math.random() * 4);
            const b = sp.b, s = b.size;
            const cx = b.x + (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
            const hw = (s.x1 - s.x0) / 2 + 1.6, hd = (s.z1 - s.z0) / 2 + 1.6;
            const u = Math.random() * 2 - 1;
            const pts = [[cx + u * hw, cz + hd], [cx + u * hw, cz - hd], [cx + hw, cz + u * hd], [cx - hw, cz + u * hd]];
            a.target.set(pts[side][0], 0, pts[side][1]);
          } else a.target.set(sp.pile.x + (Math.random() - 0.5) * 3, 0, sp.pile.z + 1.8 + Math.random());
        } else {
          const b = sp.b, s = b.size;
          a.target.set(b.x + s.x0 - 3 + Math.random() * (s.x1 - s.x0 + 6), 0, s.z1 + 3 + Math.random() * 4);
        }
      }
    } else if (d > 0.15) {
      const step = Math.min(d, a.speed * dt);
      const dir = a.target.clone().sub(a.pos).normalize();
      a.pos.addScaledVector(dir, step);
      a.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      const sw = Math.sin(t * 10 + a.phase) * 0.6;
      ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw;
      ud.armL.rotation.x = a.carrying ? -1.2 : -sw; ud.armR.rotation.x = a.carrying ? -1.2 : sw;
    } else a.wait = 0.6 + Math.random() * 1.8;
    ud.brick.visible = a.carrying;
    a.mesh.position.set(a.pos.x, 0, a.pos.z);
  }
  if (a.hop > 0) { a.hop -= dt; a.mesh.position.y = Math.sin((0.35 - a.hop) * 9) * 0.5 * Math.max(0, a.hop) * 2; }
  // 말풍선
  if (a.bubbleT > 0) { a.bubbleT -= dt; placeEl(a.bubble, a.mesh.position, 2.6); if (a.bubbleT <= 0) a.bubble.style.display = 'none'; }
  if (a.gift) placeEl(a.gift, a.mesh.position, a.bubbleT > 0 ? 4.2 : 2.6);
  if (a.label) placeEl(a.label, a.mesh.position, 2.15);
}

function loop() {
  if (paused) { clock.getDelta(); return; }
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  const now = performance.now();
  updateAnims(now);
  if (introMode) theta += dt * 0.25;
  if (hoistRide) {
    const p = Math.min(1, (now - hoistRide.t0) / hoistRide.ms), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const y = hoistRide.from + (hoistRide.to - hoistRide.from) * e;
    hoist.userData.cage.position.y = y;
    tgt.set(hoist.position.x, y + 1.5, hoist.position.z); dist = 26;
    hoistRide.onUpdate?.(e);
    if (p >= 1) { const r = hoistRide; hoistRide = null; r.resolve(); }
  }
  curTgt.lerp(tgt, Math.min(1, dt * (hoistRide ? 8 : 3)));
  curDist += (dist - curDist) * Math.min(1, dt * 3);
  camera.position.set(curTgt.x + curDist * Math.sin(phi) * Math.sin(theta), curTgt.y + curDist * Math.cos(phi), curTgt.z + curDist * Math.sin(phi) * Math.cos(theta));
  camera.lookAt(curTgt);
  sun.position.set(curTgt.x + 40, 80, curTgt.z + 30); sun.target.position.copy(curTgt);
  const sp = introMode ? null : siteSpots();
  people.forEach((a, i) => { a.mesh.visible = !introMode; updateAgent(a, dt, t, sp, i); });
  if (me) { me.mesh.visible = !introMode; if (me.label) me.label.style.display = introMode ? 'none' : ''; updateAgent(me, dt, t, sp, -1); }
  for (const a of friends.values()) updateAgent(a, dt, t, sp, -1);
  if (mixer) mixer.userData.drum.rotation.y += dt * 3;
  if (crane) {
    const { top, trolley, cable, hook } = crane.userData;
    if (!craneStopped) { top.rotation.y = Math.sin(t * 0.25) * 1.2; trolley.position.x = 8 + Math.sin(t * 0.5) * 4; }
    const L = 4 + (Math.sin(t * 0.7) + 1) * 4;
    cable.scale.y = L; cable.position.y = -L / 2; hook.position.y = -L;
  }
  if (particles) {
    const p = particles.geometry.attributes.position, arr = p.array, snow = particles.userData.kind === 'snow';
    const sp2 = snow ? 6 : 38;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= sp2 * dt;
      if (snow) arr[i] += Math.sin(t + i) * dt * 0.8;
      if (arr[i + 1] < 0) arr[i + 1] = 70;
    }
    p.needsUpdate = true;
    particles.position.set(curTgt.x, 0, curTgt.z);
  }
  // 건물 이름표
  buildingsInfo.forEach((b, i) => {
    if (!b.label) return;
    const show = !introMode && (i === focusIdx || b.shown >= b.model.blocks.length || b.shown === 0);
    b.label.style.display = show ? '' : 'none';
    if (show) placeEl(b.label, new THREE.Vector3(b.x + (b.size.x0 + b.size.x1) / 2, 0, (b.size.z0 + b.size.z1) / 2), b.shown === 0 ? 4.2 : (b.size.h * b.shown / b.model.blocks.length) + 2.5);
  });
  renderer.render(scene, camera);
}

// ---------- 호이스트(건설용 리프트) ----------
export function setPaused(p) { paused = p; }
function makeHoist() {
  const g = new THREE.Group();
  const posts = [];
  for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
    const p = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xe0a800 })); p.scale.set(0.14, 1, 0.14); p.position.set(dx, 0.5, dz); g.add(p); posts.push(p);
  }
  const ties = new THREE.Group(); g.add(ties);
  const cage = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 1.8), new THREE.MeshLambertMaterial({ color: 0x2f8fd0 })); body.position.set(-1.25, 1.1, 0); cage.add(body);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8, 1.2), new THREE.MeshLambertMaterial({ color: 0xffd400 })); door.position.set(-2.27, 1, 0); cage.add(door);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 2), new THREE.MeshLambertMaterial({ color: 0xffd400 })); roof.position.set(-1.25, 2.28, 0); cage.add(roof);
  g.add(cage);
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 3), new THREE.MeshLambertMaterial({ color: 0x555555 })); base.position.set(-0.8, 0.2, 0); g.add(base);
  g.traverse((o) => { o.castShadow = true; });
  g.userData = { posts, cage, ties };
  return g;
}
function placeHoist() {
  const b = buildingsInfo[focusIdx]; if (!b || !hoist) return;
  const s = b.size, H = Math.max(6, (b.maxY || 0) + 4);
  hoist.position.set(b.x + s.x1 + 3.2, 0, (s.z0 + s.z1) / 2 + Math.min(4, (s.z1 - s.z0) / 4));
  hoist.userData.posts.forEach((p) => { p.scale.y = H; p.position.y = H / 2; });
  const ties = hoist.userData.ties; ties.clear();
  for (let y = 3; y < H; y += 3) { const t = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x777777 })); t.scale.set(2.6, 0.12, 0.12); t.position.set(-1.6, y, 0); ties.add(t); }
  if (!hoistRide) hoist.userData.cage.position.y = Math.min(hoist.userData.cage.position.y, H - 2.5);
}
export function setHoist(on) {
  if (on && !hoist && buildingsInfo.length) { hoist = makeHoist(); scene.add(hoist); placeHoist(); }
  if (!on && hoist) { scene.remove(hoist); hoist = null; }
}
export const hasHoist = () => !!hoist;
// 현재 건물에서 층 비율(0~1)에 해당하는 높이
export function floorY(frac) { const b = buildingsInfo[focusIdx]; return b ? Math.max(0, frac * b.size.h - 1) : 0; }
export function rideHoist(toY, ms = 2200, onUpdate) {
  if (!hoist) return Promise.resolve();
  return new Promise((resolve) => { hoistRide = { from: hoist.userData.cage.position.y, to: toY, ms, t0: performance.now(), onUpdate, resolve }; });
}
export function endRide() { if (hoist) hoist.userData.cage.position.y = 0; focusOn(focusIdx); }

export function relabel(meText) { if (me?.label) me.label.textContent = meText; }
