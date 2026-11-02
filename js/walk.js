// "작은 3D 공간에서 캐릭터 걷기" 공용 모듈 — 안전 순찰·유리 옮기기·층별 이벤트·야간 당직에서 재사용
import * as THREE from 'three';
import { createJoystick } from './joystick.js';
import { makePerson, setPaused } from './scene.js';
import { h } from './ui.js';

const matCache = new Map();
export const mat = (c) => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c })); return matCache.get(c); };
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

let active = null;
export const walkActive = () => active;

/**
 * openWalk({ title, night, sky, ground, bounds:{x0,x1,z0,z1}, start:{x,z}, actionLabel, timeLimit,
 *            build(api), onTick(dt, api), onAction(spot, api), onTimeUp(api), onQuit(api), speed })
 */
export function openWalk(o) {
  if (active) active.end(true);
  setPaused(true);
  const root = h('div', { class: 'walk' + (o.night ? ' night' : '') });
  const canvas = h('canvas', { class: 'walk-gl' });
  const labels = h('div', { class: 'walk-labels' });
  const title = h('div', { class: 'walk-title' }, o.title || '');
  const info = h('div', { class: 'walk-info' }, o.info || '');
  const timerEl = h('div', { class: 'walk-timer hidden' });
  const quit = h('button', { class: 'x walk-x', 'aria-label': '나가기' }, '✕');
  const actBtn = h('button', { class: 'walk-act', disabled: true }, o.actionLabel || '확인');
  const extra = h('div', { class: 'walk-extra' });
  const hud = h('div', { class: 'walk-hud' }, h('div', { class: 'walk-top' }, title, timerEl, quit), info);
  root.append(canvas, labels, hud, actBtn, extra);
  document.querySelector('#app').append(root);
  const joy = createJoystick(root);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const skyCol = o.sky ?? (o.night ? 0x0b1430 : 0x9fd8f5);
  scene.background = new THREE.Color(skyCol);
  scene.fog = new THREE.Fog(skyCol, o.night ? 14 : 40, o.night ? 40 : 90);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 300);
  const hemi = new THREE.HemisphereLight(o.night ? 0x5566aa : 0xffffff, o.night ? 0x222233 : 0x88aa66, o.night ? 0.55 : 1.2);
  const sun = new THREE.DirectionalLight(o.night ? 0x8899cc : 0xfff3dd, o.night ? 0.25 : 1.3);
  sun.position.set(20, 40, 15);
  scene.add(hemi, sun);
  const B = o.bounds || { x0: -15, x1: 15, z0: -12, z1: 12 };
  const ground = new THREE.Mesh(new THREE.BoxGeometry(B.x1 - B.x0 + 40, 1, B.z1 - B.z0 + 40), mat(o.ground ?? 0x9b9a94));
  ground.position.set((B.x0 + B.x1) / 2, -0.5, (B.z0 + B.z1) / 2);
  scene.add(ground);

  const colliders = [], spots = [], tracked = [], agents = [];
  const player = { g: makePerson(0x2fb35a, 0xffffff), pos: new THREE.Vector3(o.start?.x ?? 0, 0, o.start?.z ?? 0), dir: 0, moving: 0, frozen: false, speed: o.speed ?? 5 };
  scene.add(player.g);

  let flash = null;
  if (o.night) {
    flash = new THREE.SpotLight(0xfff2c0, 60, 22, 0.42, 0.45, 1);
    scene.add(flash, flash.target);
    // 별
    const n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 40; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 30 + Math.random() * 60; pos[i * 3 + 2] = Math.sin(a) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, fog: false }));
    scene.add(stars);
  }

  const api = {
    THREE, scene, camera, renderer, root, player, hemi, sun, colliders, spots, extra, joy,
    elapsed: 0, timeLeft: o.timeLimit ?? null, ended: false, data: {},
    box(w, hh, d, color, x, y, z, solid = false) {
      const m = new THREE.Mesh(boxGeo, mat(color)); m.scale.set(w, hh, d); m.position.set(x, y + hh / 2, z); scene.add(m);
      if (solid) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, mesh: m });
      return m;
    },
    group(x = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); return g; },
    addBox(g, w, hh, d, color, x, y, z) { const m = new THREE.Mesh(boxGeo, mat(color)); m.scale.set(w, hh, d); m.position.set(x, y + hh / 2, z); g.add(m); return m; },
    collider(x0, z0, x1, z1) { const c = { x0, z0, x1, z1 }; colliders.push(c); return c; },
    removeCollider(c) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); },
    person(x, z, opts = {}) {
      const g = makePerson(opts.vest ?? 0xff8a1e, opts.helmet ?? 0xffd400);
      if (opts.noHelmet) g.children.filter((c) => c.position.y > 1.6).forEach((c) => (c.visible = false));
      g.position.set(x, 0, z); g.rotation.y = opts.rot ?? 0; scene.add(g);
      const a = { g, bubble: null, bubbleT: 0, label: null };
      agents.push(a);
      return a;
    },
    lamp(x, z, color = 0xffd27a) {
      api.box(0.25, 4, 0.25, 0x444444, x, 0, z);
      api.box(0.7, 0.3, 0.7, 0xfff3c0, x, 4, z);
      if (o.night) { const L = new THREE.PointLight(color, 30, 14, 1); L.position.set(x, 4, z); scene.add(L); return L; }
      return null;
    },
    label(text, x, y, z, cls = '') {
      const el = h('div', { class: 'wlabel ' + cls }, text); labels.append(el);
      const t = { el, pos: new THREE.Vector3(x, y, z) }; tracked.push(t); return t;
    },
    removeLabel(t) { t.el.remove(); const i = tracked.indexOf(t); if (i >= 0) tracked.splice(i, 1); },
    say(agent, text, sec = 3) {
      if (!agent.bubble) { agent.bubble = h('div', { class: 'bubble' }); labels.append(agent.bubble); }
      agent.bubble.textContent = text; agent.bubble.style.display = 'block'; agent.bubbleT = sec;
      agent.bubble.classList.remove('pop'); void agent.bubble.offsetWidth; agent.bubble.classList.add('pop');
    },
    addSpot(s) {
      const spot = { r: 2.2, done: false, ...s };
      if (s.icon !== null) spot.mark = api.label(s.icon ?? '❗', s.x, s.y ?? 2.6, s.z, 'mark' + (s.cls ? ' ' + s.cls : ''));
      spots.push(spot); return spot;
    },
    doneSpot(spot, icon = '✅') {
      spot.done = true;
      if (spot.mark) { spot.mark.el.textContent = icon; spot.mark.el.classList.add('done'); }
    },
    nearest() {
      let best = null, bd = 1e9;
      for (const s of spots) { if (s.done || s.hidden) continue; const d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z); if (d <= s.r && d < bd) { bd = d; best = s; } }
      return best;
    },
    dist(x, z) { return Math.hypot(x - player.pos.x, z - player.pos.z); },
    setInfo(t) { info.textContent = ''; info.append(t); },
    setTitle(t) { title.textContent = t; },
    setAction(label, enabled) { if (label != null) actBtn.textContent = label; actBtn.disabled = !enabled; },
    button(label, onClick, cls = '') { const b = h('button', { class: 'btn walk-btn ' + cls, onclick: onClick }, label); extra.append(b); return b; },
    flashlight: flash,
    end(silent = false) {
      if (api.ended) return; api.ended = true;
      cancelAnimationFrame(raf); joy.dispose(); renderer.dispose();
      scene.traverse((ob) => { if (ob.geometry && ob.geometry !== boxGeo) ob.geometry.dispose?.(); });
      root.classList.add('out'); setTimeout(() => root.remove(), 200);
      window.removeEventListener('resize', resize);
      if (active === api) active = null;
      setPaused(false);
      if (!silent) o.onEnd?.(api);
    },
  };
  active = api;

  const resize = () => {
    const w = root.clientWidth || window.innerWidth, hh = root.clientHeight || window.innerHeight;
    renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  quit.onclick = () => { if (o.onQuit) o.onQuit(api); else api.end(); };
  actBtn.onclick = () => { if (!api.ended) o.onAction?.(api.nearest(), api); };
  o.build?.(api);

  const collide = (x, z) => {
    const r = 0.38;
    if (x < B.x0 + r || x > B.x1 - r || z < B.z0 + r || z > B.z1 - r) return true;
    for (const c of colliders) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    return false;
  };
  api.collide = collide;
  const proj = new THREE.Vector3();
  const place = (el, v, yOff = 0) => {
    proj.copy(v); proj.y += yOff; proj.project(camera);
    if (proj.z > 1 || Math.abs(proj.x) > 1.2 || Math.abs(proj.y) > 1.2) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    el.style.transform = `translate(-50%, -100%) translate(${(proj.x * 0.5 + 0.5) * root.clientWidth}px, ${(-proj.y * 0.5 + 0.5) * root.clientHeight}px)`;
  };
  const camOff = new THREE.Vector3(...(o.camOffset || [0, 15, 12]));
  const camPos = new THREE.Vector3().copy(player.pos).add(camOff);
  let last = performance.now(), raf = 0, walkT = 0;
  const loop = (now) => {
    if (api.ended) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    api.elapsed += dt;
    const v = joy.read();
    const mag = Math.min(1, Math.hypot(v.x, v.y));
    player.moving = player.frozen ? 0 : mag;
    if (!player.frozen && mag > 0.08) {
      const sp = player.speed * (api.speedMul ?? 1) * mag * dt;
      const dx = v.x / (mag || 1) * sp, dz = -v.y / (mag || 1) * sp;
      const stuck = collide(player.pos.x, player.pos.z); // 움직이는 장애물에 겹친 경우 빠져나올 수 있게
      if (stuck || !collide(player.pos.x + dx, player.pos.z)) player.pos.x += dx;
      if (stuck || !collide(player.pos.x, player.pos.z + dz)) player.pos.z += dz;
      player.pos.x = Math.max(B.x0 + 0.4, Math.min(B.x1 - 0.4, player.pos.x)); player.pos.z = Math.max(B.z0 + 0.4, Math.min(B.z1 - 0.4, player.pos.z));
      player.dir = Math.atan2(dx, dz);
      walkT += dt * 10 * mag;
    }
    const ud = player.g.userData, sw = player.moving > 0.08 ? Math.sin(walkT) * 0.6 : 0;
    ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw;
    if (!api.carrying) { ud.armL.rotation.x = -sw; ud.armR.rotation.x = sw; } else { ud.armL.rotation.x = ud.armR.rotation.x = -1.3; }
    player.g.position.copy(player.pos);
    let dr = player.dir - player.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    player.g.rotation.y += dr * Math.min(1, dt * 12);
    camPos.lerp(proj.copy(player.pos).add(camOff), Math.min(1, dt * 5));
    camera.position.copy(camPos); camera.lookAt(player.pos.x, player.pos.y + 1, player.pos.z);
    if (flash) {
      flash.position.set(player.pos.x, 1.6, player.pos.z);
      flash.target.position.set(player.pos.x + Math.sin(player.g.rotation.y) * 6, 0, player.pos.z + Math.cos(player.g.rotation.y) * 6);
    }
    if (api.timeLeft != null) {
      api.timeLeft = Math.max(0, api.timeLeft - dt);
      timerEl.classList.remove('hidden');
      timerEl.textContent = `⏱ ${Math.ceil(api.timeLeft)}초`;
      timerEl.classList.toggle('low', api.timeLeft <= 10);
      if (api.timeLeft <= 0) { api.timeLeft = null; o.onTimeUp?.(api); }
    }
    const near = api.nearest();
    if (o.autoAction !== false) api.setAction(near ? (near.act || o.actionLabel || '확인') : (o.actionLabel || '확인'), !!near || !!o.actionAlways);
    o.onTick?.(dt, api, near);
    if (api.ended) return;
    for (const a of agents) {
      if (a.bubbleT > 0) { a.bubbleT -= dt; place(a.bubble, a.g.position, 2.6); if (a.bubbleT <= 0) a.bubble.style.display = 'none'; }
    }
    for (const t of tracked) place(t.el, t.pos);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return api;
}

// 공용 소품
export const props = {
  hole(api, x, z, w = 2.4, d = 2.4, covered = false) {
    api.box(w, 0.06, d, 0x111111, x, 0.0, z);
    if (covered) { api.box(w + 0.4, 0.12, d + 0.4, 0x8a6a3a, x, 0.04, z); api.box(0.9, 0.02, 0.9, 0xffd400, x, 0.17, z); }
    else { api.box(w + 0.3, 0.05, 0.15, 0xffd400, x, 0, z - d / 2 - 0.1); }
  },
  rail(api, x0, z0, x1, z1, color = 0xffd400) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 2));
    const g = new THREE.Group();
    for (let i = 0; i <= n; i++) { const t = i / n; const p = new THREE.Mesh(boxGeo, mat(0x666666)); p.scale.set(0.12, 1.1, 0.12); p.position.set(x0 + (x1 - x0) * t, 0.55, z0 + (z1 - z0) * t); g.add(p); }
    for (const y of [1.05, 0.55]) { const r = new THREE.Mesh(boxGeo, mat(color)); r.scale.set(Math.abs(x1 - x0) + 0.1, 0.08, Math.abs(z1 - z0) + 0.1); r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(r); }
    api.scene.add(g); return g;
  },
  pile(api, x, z, messy = false, solid = true) {
    const cols = [0xb5523b, 0x9c6a3c, 0xc0c0b8];
    if (messy) {
      for (let i = 0; i < 9; i++) { const m = api.box(1.6, 0.18, 0.2, cols[i % 3], x + (Math.random() - 0.5) * 3, 0, z + (Math.random() - 0.5) * 3); m.rotation.y = Math.random() * 3; }
      if (solid) api.collider(x - 1.2, z - 1.2, x + 1.2, z + 1.2);
    } else {
      api.box(2.2, 0.15, 1.4, 0x7a5232, x, 0, z);
      for (let i = 0; i < 3; i++) api.box(2, 0.3, 1.2, cols[i % 3], x, 0.15 + i * 0.3, z);
      if (solid) api.collider(x - 1.1, z - 0.7, x + 1.1, z + 0.7);
    }
  },
  scaffold(api, x, z, w = 6, hh = 4, rails = true) {
    for (const dx of [-w / 2, w / 2]) for (const dz of [-0.6, 0.6]) api.box(0.12, hh, 0.12, 0x9aa3ab, x + dx, 0, z + dz);
    api.box(w, 0.12, 1.3, 0x8a6a3a, x, hh * 0.55, z);
    if (rails) { api.box(w, 0.08, 0.08, 0xffd400, x, hh * 0.55 + 1.0, z + 0.62); api.box(w, 0.08, 0.08, 0xffd400, x, hh * 0.55 + 0.55, z + 0.62); }
    api.collider(x - w / 2 - 0.1, z - 0.7, x + w / 2 + 0.1, z + 0.7);
  },
  crane(api, x, z, loadX, loadZ) {
    api.box(1, 12, 1, 0xffc400, x, 0, z);
    const jib = api.box(Math.abs(loadX - x) + 4, 0.6, 0.6, 0xffc400, (x + loadX) / 2, 12, z);
    api.box(0.06, 12 - 3.4, 0.06, 0x333333, loadX, 3.4, loadZ);
    api.box(1.6, 1, 1.6, 0xb5523b, loadX, 2.4, loadZ);
    api.collider(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
    return jib;
  },
  container(api, x, z, rot = 0, color = 0x2f6fbf) {
    const w = rot ? 2.4 : 5, d = rot ? 5 : 2.4;
    api.box(w, 2.6, d, color, x, 0, z, true);
  },
  fence(api, B) {
    const c = 0x2f6fbf;
    api.box(B.x1 - B.x0, 1.6, 0.1, c, (B.x0 + B.x1) / 2, 0, B.z0);
    api.box(0.1, 1.6, B.z1 - B.z0, c, B.x0, 0, (B.z0 + B.z1) / 2);
    api.box(0.1, 1.6, B.z1 - B.z0, c, B.x1, 0, (B.z0 + B.z1) / 2);
  },
};
