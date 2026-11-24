// 첫 삽 v18 — 하나의 PBR 재질 세트 (아트 바이블 통일 규칙 1~3)
// 출처가 다른 모델(코드 모델 · Kenney CC0 모델)을 모두 같은 12가지 재질로 다시 입힌다.
//  재질 종류(12): concrete · steel · paint · plywood · dirt · gravel · rubber · plastic · vest · fabric · skin · glass
//  색은 css/tokens.css 토큰(팔레트)에서만. 질감(결·노멀·거칠기)은 Poly Haven CC0 → assets/tex/ (tools/prep-textures.mjs)
//  질감은 "월드 좌표"로 붙인다: 크기가 다른 상자(인스턴싱)라도 1m 당 같은 밀도 → 덩어리마다 늘어나 보이지 않음
// 사용: const kit = await loadKit(THREE, { onUpdate }); kit.mat('--art-concrete') · kit.mat('paint:yellow') · await kit.env(renderer) · await kit.preload(['cone']) · kit.parts('cone')
const BASE = new URL('../../assets/', import.meta.url);
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';

// 종류별 기본값: 질감(tex), 1m 당 반복(ws), 거칠기, 금속성
export const KINDS = {
  concrete: { tex: 'concrete', ws: 0.4, rough: 0.92, color: '--pbr-concrete' },
  steel: { tex: 'metal', ws: 1.5, rough: 0.42, metal: 0.6, color: '--pbr-steel' },
  paint: { rough: 0.5, metal: 0.05, color: '--pbr-paper' },
  plywood: { tex: 'plywood', ws: 0.9, rough: 0.78, color: '--art-wood' },
  dirt: { tex: 'dirt', ws: 0.28, rough: 1, color: '--pbr-dirt' },
  gravel: { tex: 'gravel', ws: 0.42, rough: 1, color: '--pbr-dirt-2' },
  rubber: { rough: 0.82, color: '--pbr-navy' },
  plastic: { rough: 0.36, color: '--pbr-orange' },
  vest: { rough: 0.62, color: '--pbr-orange', glow: 0.1 },
  fabric: { rough: 0.95, color: '--pbr-navy' },
  skin: { rough: 0.72, color: '--skin' },
  glass: { rough: 0.06, metal: 0.2, color: '--art-glass' },
};
// 예전(v17) 토큰 → [재질 종류, 색 토큰]. 지도·장면의 코드 소품이 그대로 새 재질을 받는다
const FROM = {
  '--art-concrete': ['concrete', '--pbr-concrete'], '--art-concrete-dark': ['concrete', '--art-concrete-dark'],
  '--art-steel': ['steel', '--pbr-steel'], '--art-rebar': ['steel', '--art-rebar'],
  '--art-helmet': ['paint', '--pbr-yellow'], '--brand': ['paint', '--pbr-yellow'], '--caution': ['paint', '--pbr-yellow'],
  '--art-wood': ['plywood', '--art-wood'], '--art-wood-dark': ['plywood', '--art-wood-dark'], '--art-tan': ['plywood', '--art-tan'],
  '--art-dirt': ['dirt', '--pbr-dirt'], '--art-dirt-dark': ['dirt', '--art-dirt-dark'], '--art-ground': ['gravel', '--pbr-dirt-2'], '--art-grass': ['gravel', '--art-grass'],
  '--asphalt': ['rubber', '--pbr-navy'], '--asphalt-2': ['rubber', '--asphalt-2'], '--art-dark': ['rubber', '--art-dark'],
  '--vest': ['plastic', '--pbr-orange'], '--art-wall': ['paint', '--pbr-paper'], '--bg': ['paint', '--pbr-paper'], '--bg-soft': ['paint', '--bg-soft'], '--line': ['paint', '--line'],
  '--art-glass': ['glass', '--art-glass'], '--art-shirt': ['fabric', '--art-shirt'], '--skin': ['skin', '--skin'],
};
// 'kind:tone' 의 tone → 색 토큰
const TONE = { yellow: '--pbr-yellow', orange: '--pbr-orange', navy: '--pbr-navy', paper: '--pbr-paper', wall: '--pbr-paper', white: '--pbr-paper', steel: '--pbr-steel', concrete: '--pbr-concrete', dirt: '--pbr-dirt', shirt: '--art-shirt',
  blue: '--mandatory', red: '--danger', green: '--safe', caution: '--pbr-yellow', dark: '--art-dark', khaki: '--art-tan', gray: '--art-concrete-dark' };
const ALIAS = { reflect: 'paint:white' };
// CC0 모델 목록 (assets/models/<이름>.json, tools/import-cc0.mjs). 지도와 장면이 함께 미리 불러옴
export const MODELS = ['container', 'cone', 'barrier', 'warnlight', 'excavator', 'mixer', 'crane', 'dumper'];
export function resolve(key) {
  key = ALIAS[key] || key;
  if (key.startsWith('--')) return FROM[key] || ['paint', key];
  const [kind, tone] = key.split(':');
  if (!KINDS[kind]) return ['paint', '--pbr-paper'];
  return [kind, tone ? (tone.startsWith('--') ? tone : TONE[tone] || KINDS[kind].color) : KINDS[kind].color];
}

// 월드 좌표 UV (상자 투영): 면의 방향으로 xz / zy / xy 중 하나
function worldUV(m, ws) {
  m.defines = { ...(m.defines || {}), WS: ws.toFixed(3) };
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
{ vec4 wq = vec4(transformed, 1.0); vec3 wn = objectNormal;
#ifdef USE_INSTANCING
  wq = instanceMatrix * wq; wn = mat3(instanceMatrix) * wn;
#endif
  wq = modelMatrix * wq; wn = abs(mat3(modelMatrix) * wn);
  vec2 wuv = (wn.y >= max(wn.x, wn.z) ? wq.xz : (wn.x >= wn.z ? wq.zy : wq.xy)) * WS;
#ifdef USE_MAP
  vMapUv = wuv;
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv = wuv;
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv = wuv;
#endif
}`);
  };
}

// 작은 HDRI 읽기 (압축 없는 RGBE, tools/prep-textures.mjs 가 만든 sky.hdr)
function parseHDR(THREE, buf) {
  const b = new Uint8Array(buf); let pos = 0;
  const line = () => { let s = ''; while (b[pos] !== 10) s += String.fromCharCode(b[pos++]); pos++; return s; };
  while (line() !== '') { /* 머리말 */ }
  const t = line().split(' '), h = +t[1], w = +t[3];
  const data = new Uint16Array(w * h * 4), toH = THREE.DataUtils.toHalfFloat;
  for (let i = 0; i < w * h; i++) {
    const o = pos + i * 4, e = b[o + 3], m = e ? Math.pow(2, e - 136) : 0;
    data[i * 4] = toH(b[o] * m); data[i * 4 + 1] = toH(b[o + 1] * m); data[i * 4 + 2] = toH(b[o + 2] * m); data[i * 4 + 3] = toH(1);
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
}

const b64 = (s, T) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };

export async function loadKit(THREE, { onUpdate, aniso = 4, textures = true } = {}) {
  const mats = new Map(), texs = new Map(), geos = new Map(), envs = new Map();
  const loader = new THREE.TextureLoader(), wait = [];
  const tex = (name, kind) => {
    const k = name + kind; if (texs.has(k)) return texs.get(k);
    let done; wait.push(new Promise((r) => { done = r; }));
    const t = loader.load(new URL(`tex/${name}_${kind}.webp`, BASE).href, () => { done(); onUpdate?.(); }, undefined, () => done());
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.colorSpace = THREE.NoColorSpace;
    texs.set(k, t); return t;
  };
  // mat(key, opt): key = 예전 토큰('--art-steel') 또는 'kind:tone'. opt: { transparent, opacity, emissive(토큰), glow }
  function mat(key, opt = {}) {
    const [kind, color] = resolve(key), K = KINDS[kind];
    const ck = kind + '|' + color + (Object.keys(opt).length ? JSON.stringify(opt) : '');
    if (mats.has(ck)) return mats.get(ck);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(tok(color)), roughness: K.rough, metalness: K.metal || 0 });
    if (K.tex && textures) { m.map = tex(K.tex, 'd'); m.normalMap = tex(K.tex, 'n'); m.roughnessMap = tex(K.tex, 'r'); m.normalScale.set(0.8, 0.8); worldUV(m, K.ws); }
    if (K.glow || opt.glow) { m.emissive = new THREE.Color(tok(color)); m.emissiveIntensity = opt.glow ?? K.glow; }
    if (opt.emissive) { m.emissive = typeof opt.emissive === 'string' ? new THREE.Color(tok(opt.emissive)) : opt.emissive.clone(); m.emissiveIntensity = opt.glow ?? 0.8; }
    if (opt.transparent) { m.transparent = true; m.opacity = opt.opacity ?? 0.8; }
    if (kind === 'glass') m.envMapIntensity = 1.6;
    m.userData.kind = kind; mats.set(ck, m); return m;
  }
  // 하늘 HDRI → PMREM 환경광 (렌더러마다 하나)
  async function env(renderer) {
    if (envs.has(renderer)) return envs.get(renderer);
    const p = (async () => {
      try {
        const buf = await (await fetch(new URL('tex/sky.hdr', BASE).href)).arrayBuffer();
        const eq = parseHDR(THREE, buf), pm = new THREE.PMREMGenerator(renderer);
        const rt = pm.fromEquirectangular(eq); eq.dispose(); pm.dispose(); return rt.texture;
      } catch { return null; }
    })();
    envs.set(renderer, p); return p;
  }
  // CC0 모델 (tools/import-cc0.mjs 가 만든 JSON) → 재질별 BufferGeometry
  async function preload(names) {
    await Promise.all(names.filter((n) => !geos.has(n)).map(async (n) => {
      try {
        const j = await (await fetch(new URL(`models/${n}.json`, BASE).href)).json();
        const parts = Object.entries(j.parts).map(([key, P]) => {
          const g = new THREE.BufferGeometry(), pos = b64(P.p, Float32Array), nr = b64(P.n, Int8Array);
          g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nr, 3, true));
          g.setIndex(new THREE.BufferAttribute(pos.length / 3 > 65535 ? b64(P.i, Uint32Array) : b64(P.i, Uint16Array), 1));
          return { key, geo: g };
        });
        geos.set(n, { parts, size: j.size });
      } catch { geos.set(n, null); }
    }));
  }
  const parts = (n) => geos.get(n)?.parts || null;
  const size = (n) => geos.get(n)?.size || null;
  function dispose() { mats.forEach((m) => m.dispose()); texs.forEach((t) => t.dispose()); geos.forEach((g) => g?.parts.forEach((p) => p.geo.dispose())); }
  const ready = () => Promise.all(wait); // 지금까지 부른 질감이 다 읽힐 때까지 (미리 렌더링용)
  return { mat, env, preload, parts, size, dispose, ready, kinds: () => [...new Set([...mats.values()].map((m) => m.userData.kind))] };
}
