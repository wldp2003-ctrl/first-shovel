// 첫 삽 v13 — 현장 장면 그림 (직접 그림, 글자 없음). 좌표는 viewBox 0 0 400 300
// 장면 위 누를 영역은 data/scenes.json 의 area(x, y, r)와 같은 좌표를 쓴다.
import { person } from './art.js';
import { PAIR2 } from './scene-art2.js';

const INK = 'var(--art-dark)', CON = 'var(--art-concrete)', CON2 = 'var(--art-concrete-dark)', SKY = 'var(--art-sky)', RAIL = 'var(--art-helmet)', STEEL = 'var(--art-steel)', WOOD = 'var(--art-wood)', ORANGE = 'var(--brand)';
const svg = (body, vb = '0 0 160 110', bg = SKY) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="0" y="0" width="100%" height="100%" fill="${bg}"/>${body}</svg>`;
const ground = (y = 96) => `<rect x="0" y="${y}" width="160" height="${110 - y}" fill="var(--art-ground)"/>`;
// 노랑·검정 줄무늬 (현장의 개구부 표시) — 글자 대신
const stripes = (id) => `<defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="${RAIL}"/><rect x="5" width="5" height="10" fill="var(--art-dark)"/></pattern></defs>`;

/* ---------------- 장면 1: 골조 층 바닥 ---------------- */
// 기울여 본 슬래브(바닥판). 뒤·왼쪽 끝에는 난간, 앞쪽 끝은 열려 있음(위험)
export function sceneFloor() {
  const A = [30, 160], B = [228, 92], C = [388, 140], Dp = [190, 208];
  const pt = (p) => p.join(',');
  // 슬래브 위 한 점: u(왼→오른 앞쪽 방향), v(앞→뒤)
  const at = (u, v) => [Dp[0] + (C[0] - Dp[0]) * u + (A[0] - Dp[0]) * v, Dp[1] + (C[1] - Dp[1]) * u + (A[1] - Dp[1]) * v];
  let g = `<rect width="400" height="300" fill="${SKY}"/>`;
  // 아래층 기둥과 다음 층 거푸집 일부 (배경)
  g += `<path d="M${pt(Dp)} L${Dp[0]} 290 M${pt(C)} L${C[0]} 260 M${pt(A)} L${A[0]} 250" stroke="${CON2}" stroke-width="10"/>`;
  g += `<path d="M0 285 H400 V300 H0Z" fill="var(--art-ground)"/>`;
  // 슬래브 두께와 윗면
  g += `<path d="M${pt(A)} L${pt(Dp)} L${pt(C)} L${C[0]} ${C[1] + 12} L${Dp[0]} ${Dp[1] + 12} L${A[0]} ${A[1] + 12}Z" fill="${CON2}"/>`;
  g += `<path d="M${pt(A)} L${pt(B)} L${pt(C)} L${pt(Dp)}Z" fill="${CON}" stroke="${INK}" stroke-width="1.5"/>`;
  // 뒤쪽(A-B, B-C)과 왼쪽 앞(A-D) 끝 난간 — 안전한 끝
  const rail = (P, Q) => { let r = ''; for (let k = 0; k <= 4; k++) { const x = P[0] + (Q[0] - P[0]) * k / 4, y = P[1] + (Q[1] - P[1]) * k / 4; r += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 22}" stroke="${RAIL}" stroke-width="3"/>`; }
    return r + `<line x1="${P[0]}" y1="${P[1] - 22}" x2="${Q[0]}" y2="${Q[1] - 22}" stroke="${RAIL}" stroke-width="3.4"/><line x1="${P[0]}" y1="${P[1] - 11}" x2="${Q[0]}" y2="${Q[1] - 11}" stroke="${RAIL}" stroke-width="2.6"/>`; };
  g += rail(A, B) + rail(B, C) + rail(A, Dp);
  // 앞쪽 끝(D-C)은 난간 없음 — 아래가 보이게 짧은 그림자
  g += `<path d="M${pt(Dp)} L${pt(C)}" stroke="var(--art-steel)" stroke-width="2" stroke-dasharray="6 5"/>`;
  // [1-1] 덮개 없는 개구부 (어두운 구멍)
  const h1 = [at(0.07, 0.54), at(0.21, 0.54), at(0.21, 0.70), at(0.07, 0.70)];
  g += `<path d="M${h1.map(pt).join(' L')}Z" fill="var(--art-dark)" stroke="${INK}" stroke-width="1.2"/>`;
  // [함정] 덮개 덮고 줄무늬 표시한 개구부 — 안전
  const h2 = [at(0.48, 0.74), at(0.62, 0.74), at(0.62, 0.90), at(0.48, 0.90)];
  g += stripes('stp') + `<path d="M${h2.map(pt).join(' L')}Z" fill="url(#stp)" stroke="${INK}" stroke-width="1.4"/>`;
  // [1-4] 통로 위에 쌓인 자재 (합판 더미)
  const m = at(0.30, 0.12);
  g += `<g transform="translate(${m[0]} ${m[1]})"><path d="M-26 -4 L6 -15 L30 -5 L-2 6Z" fill="${WOOD}" stroke="${INK}" stroke-width="1"/><path d="M-26 -4 L-26 4 L-2 14 L-2 6Z" fill="var(--art-wood-dark)"/><path d="M-2 6 L-2 14 L30 3 L30 -5Z" fill="var(--art-wood-dark)"/><path d="M-22 -12 L10 -23 L28 -15 L-4 -4Z" fill="${WOOD}" stroke="${INK}" stroke-width="1"/><path d="M-22 -12 L-22 -6 L-4 2 L-4 -4Z" fill="var(--art-wood-dark)"/></g>`;
  // [1-5] 위로 솟은 철근 (보호캡 없음)
  const r0 = at(0.78, 0.72);
  for (let k = 0; k < 4; k++) g += `<line x1="${r0[0] - 12 + k * 8}" y1="${r0[1] + 2 - k * 2}" x2="${r0[0] - 12 + k * 8}" y2="${r0[1] - 34 - k * 2}" stroke="var(--art-rebar)" stroke-width="3" stroke-linecap="round"/>`;
  // [1-3] 슬래브 위를 걷는 사람 — 안전대 없음, 앞쪽 끝 가까이
  const w = at(0.90, 0.12);
  g += person(w[0], w[1], { scale: 0.82, vest: true, hold: true });
  g += `<rect x="${w[0] + 6}" y="${w[1] - 30}" width="20" height="7" rx="1" fill="${WOOD}" stroke="${INK}" stroke-width=".8" transform="rotate(-12 ${w[0] + 16} ${w[1] - 26})"/>`;
  // 뒤쪽 동료 (안전 — 난간 안쪽에서 작업)
  const w2 = at(0.10, 0.95);
  g += person(w2[0], w2[1], { scale: 0.7, vest: true, helmet: 'var(--bg)' });
  // 하늘 쪽 크레인 줄 (배경)
  g += `<line x1="330" y1="0" x2="330" y2="40" stroke="${INK}" stroke-width="1.6"/><path d="M325 40 h10 v6 q-5 6 -10 0z" fill="${INK}"/>`;
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img">${g}</svg>`;
}
// 그림 안 위치 계산 도우미 (scenes.json 좌표를 정할 때 썼던 값과 같음)
export const FLOOR_SPOTS = (() => {
  const A = [30, 160], C = [388, 140], Dp = [190, 208];
  const at = (u, v) => [Math.round(Dp[0] + (C[0] - Dp[0]) * u + (A[0] - Dp[0]) * v), Math.round(Dp[1] + (C[1] - Dp[1]) * u + (A[1] - Dp[1]) * v)];
  const up = (p, d) => [p[0], p[1] - d];
  return { hole: at(0.14, 0.62), edge: at(0.52, 0.0), walker: up(at(0.90, 0.12), 18), pile: up(at(0.30, 0.12), 6), rebar: up(at(0.78, 0.72), 16), covered: at(0.55, 0.82) };
})();

/* ---------------- 위험한 모습 / 안전한 모습 (160×110) ---------------- */
const slab = `<path d="M0 62 L160 62 L160 110 L0 110Z" fill="${CON}"/>`;
export const PAIR = {
  // 1-1 개구부: 뚫린 구멍 ↔ 덮개 + 줄무늬 표시
  holeBad: () => svg(slab + `<path d="M40 74 h56 l10 18 h-56z" fill="var(--art-dark)"/>` + person(118, 66, { scale: 0.7, hold: true })),
  holeGood: () => svg(stripes('s2') + slab + `<path d="M40 74 h56 l10 18 h-56z" fill="url(#s2)" stroke="${INK}" stroke-width="1.5"/>` + person(118, 66, { scale: 0.7, hold: true })),
  // 1-2 바닥 끝: 난간 없음 ↔ 안전난간
  edgeBad: () => svg(`<rect x="0" y="58" width="96" height="52" fill="${CON}"/><path d="M96 58 v52" stroke="var(--art-steel)" stroke-width="2" stroke-dasharray="5 4"/>` + person(84, 58, { scale: 0.75 })),
  edgeGood: () => svg(`<rect x="0" y="58" width="96" height="52" fill="${CON}"/><line x1="96" y1="58" x2="96" y2="26" stroke="${RAIL}" stroke-width="3.4"/><line x1="70" y1="58" x2="70" y2="26" stroke="${RAIL}" stroke-width="3"/><line x1="66" y1="28" x2="100" y2="28" stroke="${RAIL}" stroke-width="3.4"/><line x1="66" y1="43" x2="100" y2="43" stroke="${RAIL}" stroke-width="3"/><rect x="66" y="52" width="34" height="6" fill="${ORANGE}"/>` + person(52, 58, { scale: 0.75 })),
  // 1-3 슬래브 위 이동: 안전대 없음 ↔ 부착설비에 고리 걸기
  walkBad: () => svg(slab + `<line x1="0" y1="18" x2="160" y2="18" stroke="${STEEL}" stroke-width="2"/>` + person(80, 62, { scale: 0.85 })),
  walkGood: () => svg(slab + `<line x1="0" y1="18" x2="160" y2="18" stroke="${STEEL}" stroke-width="2"/><path d="M84 37 Q88 26 92 18" stroke="${ORANGE}" stroke-width="2.2" fill="none"/><circle cx="92" cy="18" r="3" fill="none" stroke="${INK}" stroke-width="1.8"/>` + person(80, 62, { scale: 0.85, harness: true })),
  // 1-4 통로 자재: 길을 막은 더미에 걸림 ↔ 옆으로 쌓아 길 확보
  pileBad: () => svg(slab + `<rect x="60" y="66" width="44" height="12" fill="${WOOD}" stroke="${INK}"/><rect x="64" y="58" width="40" height="8" fill="${WOOD}" stroke="${INK}"/>` + person(54, 66, { scale: 0.75, rot: 28 })),
  pileGood: () => svg(slab + `<rect x="118" y="66" width="36" height="12" fill="${WOOD}" stroke="${INK}"/><rect x="120" y="58" width="32" height="8" fill="${WOOD}" stroke="${INK}"/><path d="M10 92 H108" stroke="var(--bg)" stroke-width="3" stroke-dasharray="8 6"/>` + person(56, 74, { scale: 0.75 })),
  // 1-5 철근 끝: 뾰족한 끝 ↔ 보호캡
  rebarBad: () => svg(slab + [40, 62, 84, 106].map((x) => `<line x1="${x}" y1="64" x2="${x}" y2="22" stroke="var(--art-rebar)" stroke-width="4" stroke-linecap="round"/>`).join('') + person(132, 64, { scale: 0.7, rot: -10 })),
  rebarGood: () => svg(slab + [40, 62, 84, 106].map((x) => `<line x1="${x}" y1="64" x2="${x}" y2="26" stroke="var(--art-rebar)" stroke-width="4"/><rect x="${x - 6}" y="16" width="12" height="12" rx="3" fill="${ORANGE}" stroke="${INK}" stroke-width="1"/>`).join('') + person(132, 64, { scale: 0.7 })),
};
export const pair = (id) => (PAIR[id] ? PAIR[id]() : PAIR2[id] ? PAIR2[id]() : '');
