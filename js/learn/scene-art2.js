// 첫 삽 v13 — 장면 0, 2~6 그림과 "위험한 모습 / 안전한 모습" (직접 그림, 글자 없음)
// 장면 좌표: viewBox 0 0 400 300. 누를 영역 중심(SPOTS)은 data/scenes.json area와 같아야 한다.
import { person } from './art.js';

const INK = '#1f2937', SKY = '#e8f1fb', GROUND = '#d9cfbd', CON = '#c3c8cf', CON2 = '#aab1ba', RAIL = '#f2b705', STEEL = '#8d96a0', WOOD = '#c8964a', ORANGE = '#ef7d00', YEL = '#f5c400', RED = '#d93a2b', GRN = '#1f9d55', DIRT = '#9c7a55';
const S400 = (body, bg = SKY) => `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img"><rect width="400" height="300" fill="${bg}"/>${body}</svg>`;
const S160 = (body, bg = SKY) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="160" height="110" fill="${bg}"/>${body}</svg>`;
const g400 = (y = 250) => `<rect x="0" y="${y}" width="400" height="${300 - y}" fill="${GROUND}"/>`;
const g160 = (y = 92) => `<rect x="0" y="${y}" width="160" height="${110 - y}" fill="${GROUND}"/>`;
const P = (x, y, o = {}) => person(x, y, o);

/* ---------- 공통 부품 ---------- */
const sun = (x, y, r = 14) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${ORANGE}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${x}" y1="${y - r - 4}" x2="${x}" y2="${y - r - 10}" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round" transform="rotate(${a} ${x} ${y})"/>`).join('')}`;
const wall = (x, y, w, h) => { let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cfd6de" stroke="${INK}" stroke-width="1.5"/>`; for (let r = y + 10; r < y + h - 10; r += 34) for (let c = x + 8; c < x + w - 16; c += 26) s += `<rect x="${c}" y="${r}" width="16" height="16" fill="#9cc3e6"/>`; return s; };
// 비계: 기둥 + 발판 층. gap = 빈 칸이 있는 층 번호(-1 없음)
const scaffold = (x, yb, w, h, levels, gap = -1) => {
  let s = ''; for (let i = 0; i <= 3; i++) s += `<line x1="${x + i * w / 3}" y1="${yb}" x2="${x + i * w / 3}" y2="${yb - h}" stroke="${STEEL}" stroke-width="3"/>`;
  for (let k = 1; k <= levels; k++) { const yy = yb - k * h / levels;
    if (k === gap) s += `<rect x="${x - 2}" y="${yy}" width="${w / 3 - 2}" height="4" fill="${WOOD}"/><rect x="${x + 2 * w / 3 + 2}" y="${yy}" width="${w / 3}" height="4" fill="${WOOD}"/>`;
    else s += `<rect x="${x - 2}" y="${yy}" width="${w + 4}" height="4" fill="${WOOD}"/>`;
    s += `<line x1="${x}" y1="${yy - 12}" x2="${x + w}" y2="${yy - 12}" stroke="${RAIL}" stroke-width="2.4"/>`; }
  return s;
};
const hook = (x, y1, y2) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${INK}" stroke-width="1.8"/><path d="M${x - 5} ${y2} h10 v6 q-5 7 -10 0z" fill="${INK}"/>`;
const load2 = (x, y, w = 50) => `<line x1="${x}" y1="${y}" x2="${x - w / 2 + 4}" y2="${y + 16}" stroke="${INK}" stroke-width="1.5"/><line x1="${x}" y1="${y}" x2="${x + w / 2 - 4}" y2="${y + 16}" stroke="${INK}" stroke-width="1.5"/><rect x="${x - w / 2}" y="${y + 16}" width="${w}" height="10" fill="${WOOD}" stroke="${INK}"/>`;
const load1 = (x, y, w = 50) => `<line x1="${x}" y1="${y}" x2="${x - w / 2 + 6}" y2="${y + 18}" stroke="${INK}" stroke-width="1.5"/><rect x="${x - w / 2}" y="${y + 16}" width="${w}" height="10" fill="${WOOD}" stroke="${INK}" transform="rotate(28 ${x - w / 2 + 6} ${y + 18})"/>`;
const excavator = (x, y, s = 1, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><rect x="-30" y="-10" width="64" height="10" rx="5" fill="${INK}"/><rect x="-22" y="-34" width="48" height="24" rx="3" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/><rect x="-18" y="-46" width="20" height="14" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/><rect x="-15" y="-43" width="13" height="8" fill="#9cc3e6"/><path d="M24 -30 L60 -56 L82 -24" stroke="${YEL}" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M76 -26 l14 0 l-4 14 l-12 -4z" fill="${INK}"/></g>`;
const dump = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-40" y="-30" width="56" height="22" fill="${ORANGE}" stroke="${INK}" stroke-width="1.3"/><rect x="16" y="-26" width="22" height="18" fill="${ORANGE}" stroke="${INK}" stroke-width="1.3"/><rect x="21" y="-23" width="12" height="8" fill="#9cc3e6"/>${[-28, -8, 28].map((c) => `<circle cx="${c}" cy="-6" r="7" fill="${INK}"/>`).join('')}</g>`;
const roller = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-24" y="-30" width="36" height="16" fill="${YEL}" stroke="${INK}" stroke-width="1.3"/><rect x="-16" y="-44" width="18" height="14" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="-24" cy="-12" r="12" fill="${STEEL}" stroke="${INK}"/><circle cx="16" cy="-10" r="10" fill="${INK}"/></g>`;
const manhole = (x, y, open = true) => open ? `<ellipse cx="${x}" cy="${y}" rx="24" ry="8" fill="#20262e"/><ellipse cx="${x + 30}" cy="${y + 4}" rx="22" ry="7" fill="${STEEL}" stroke="${INK}"/>` : `<ellipse cx="${x}" cy="${y}" rx="24" ry="8" fill="${STEEL}" stroke="${INK}"/>`;
const detector = (x, y) => `<rect x="${x}" y="${y}" width="10" height="14" rx="2" fill="${YEL}" stroke="${INK}"/><rect x="${x + 2}" y="${y + 2}" width="6" height="4" fill="#9cc3e6"/>`;
const fan = (x, y) => `<rect x="${x - 10}" y="${y - 20}" width="20" height="20" rx="3" fill="${STEEL}" stroke="${INK}"/><circle cx="${x}" cy="${y - 10}" r="7" fill="none" stroke="${INK}"/><path d="M${x} ${y} q-4 20 10 36" stroke="${INK}" stroke-width="3" fill="none"/>`;
const sparks = (x, y) => [[0, 0], [10, -6], [16, 4], [6, 10], [22, -2], [14, 14]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2.2" fill="${ORANGE}"/>`).join('');
const cans = (x, y) => `<rect x="${x}" y="${y - 18}" width="14" height="18" fill="${RED}" stroke="${INK}"/><rect x="${x + 16}" y="${y - 14}" width="12" height="14" fill="#5b8bd6" stroke="${INK}"/><rect x="${x + 30}" y="${y - 16}" width="22" height="16" fill="#fff4c9" stroke="${INK}"/>`;
const ext = (x, y) => `<rect x="${x}" y="${y - 22}" width="10" height="22" rx="4" fill="${RED}" stroke="${INK}"/><rect x="${x + 2}" y="${y - 28}" width="6" height="6" fill="${INK}"/>`;
const cable = (x, y, bad) => `<path d="M${x} ${y} q30 -10 60 0 t60 0" stroke="${INK}" stroke-width="4" fill="none"/>${bad ? `<path d="M${x + 54} ${y - 2} q6 -3 12 0" stroke="${ORANGE}" stroke-width="5" fill="none"/><path d="M${x + 60} ${y - 22} l-5 9 h5 l-4 9" stroke="${YEL}" stroke-width="2.4" fill="none"/>` : ''}`;
const shade = (x, y) => `<path d="M${x - 34} ${y - 50} h68 l-8 -14 h-52z" fill="${GRN}"/><rect x="${x - 2}" y="${y - 50}" width="4" height="50" fill="${STEEL}"/>`;
const shore = (x, yt, yb, bent = false) => bent ? `<path d="M${x} ${yt} q14 ${(yb - yt) / 2} 0 ${yb - yt}" stroke="${STEEL}" stroke-width="5" fill="none"/>` : `<rect x="${x - 2.5}" y="${yt}" width="5" height="${yb - yt}" fill="${STEEL}"/>`;
const shore2 = (x, yt, yb) => { const m = (yt + yb) / 2; return `<rect x="${x - 2.5}" y="${yt}" width="5" height="${m - yt - 6}" fill="${STEEL}"/><rect x="${x - 9}" y="${m - 6}" width="18" height="10" fill="${WOOD}" stroke="${INK}"/><rect x="${x - 2.5}" y="${m + 4}" width="5" height="${yb - m - 4}" fill="${STEEL}"/>`; };
const pumpBoom = (x, y, tx, ty) => `<rect x="${x - 34}" y="${y - 22}" width="60" height="18" rx="3" fill="${ORANGE}" stroke="${INK}"/><circle cx="${x - 22}" cy="${y - 2}" r="6" fill="${INK}"/><circle cx="${x + 14}" cy="${y - 2}" r="6" fill="${INK}"/><path d="M${x} ${y - 22} L${x + 20} ${y - 70} L${tx} ${ty}" stroke="${STEEL}" stroke-width="5" fill="none" stroke-linejoin="round"/><line x1="${tx}" y1="${ty}" x2="${tx}" y2="${ty + 30}" stroke="${INK}" stroke-width="3"/>`;
const powerline = (y) => `<line x1="0" y1="${y}" x2="400" y2="${y + 6}" stroke="${INK}" stroke-width="1.6"/><line x1="0" y1="${y + 8}" x2="400" y2="${y + 14}" stroke="${INK}" stroke-width="1.6"/><rect x="386" y="${y - 6}" width="6" height="${300 - y}" fill="#6b4f3a"/>`;
const lift = (x, yb, h, open) => `<rect x="${x + 30}" y="${yb - h}" width="6" height="${h}" fill="${STEEL}"/><rect x="${x}" y="${yb - 70}" width="30" height="34" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/>${open ? `<rect x="${x + 3}" y="${yb - 66}" width="12" height="28" fill="#20262e"/><rect x="${x - 11}" y="${yb - 66}" width="12" height="28" fill="${YEL}" stroke="${INK}"/>` : `<rect x="${x + 3}" y="${yb - 66}" width="24" height="28" fill="#9cc3e6" stroke="${INK}"/>`}<path d="M${x + 15} ${yb - 80} l-5 7 h10z" fill="${INK}"/>`;
const flagger = (x, y, s = 1) => P(x, y, { vest: true, armsUp: true, scale: s }) + `<rect x="${x - 15 * s}" y="${y - 54 * s}" width="${3 * s}" height="${12 * s}" fill="${RED}" transform="rotate(-25 ${x - 14 * s} ${y - 48 * s})"/>`;

/* ---------- 장면 0: 출근·TBM ---------- */
// 레이어: on = 이번에 낼 위험 id 목록(없으면 전부). 꺼진 위험은 같은 자리에 안전한 모습으로 그린다
export function sceneTbm(on) {
  const A = (id) => !on || on.includes(id);
  let g = g400(220);
  g += `<rect x="20" y="120" width="130" height="100" fill="#dfe6ee" stroke="${INK}" stroke-width="1.5"/><rect x="34" y="140" width="34" height="26" fill="#9cc3e6"/><rect x="96" y="150" width="34" height="70" fill="#8d96a0"/>`; // 현장 사무실
  g += `<rect x="190" y="110" width="80" height="54" fill="#fff" stroke="${INK}" stroke-width="1.5"/>${[0, 1, 2].map((k) => `<rect x="198" y="${120 + k * 14}" width="${40 + (k % 2) * 20}" height="5" fill="#cfd6de"/>`).join('')}<rect x="228" y="164" width="4" height="56" fill="${STEEL}"/>`; // 게시판(글자 없음)
  g += P(130, 268, { scale: 1.35, helmet: A('0-1') ? null : undefined, vest: true }); // 0-1 안전모 없음
  g += P(205, 272, { scale: 1.35, strap: A('0-2') ? false : true, vest: true }); // 0-2 턱끈 풀림
  g += P(280, 268, { scale: 1.35, vest: true, shoes: A('0-3') ? 'sneaker' : 'safety' }); // 0-3 운동화
  g += P(355, 272, { scale: 1.35, vest: true, helmet: '#fff', shoes: 'safety', point: true }); // 함정: 반장(제대로 갖춤)
  return S400(g);
}

/* ---------- 장면 2: 외부 비계·고소작업대 ---------- */
export function sceneScaffold() {
  let g = g400(262) + wall(150, 40, 230, 222);
  g += scaffold(40, 262, 120, 210, 3, 2); // 가운데 층에 빈 칸
  g += P(68, 50, { scale: 0.8, vest: true }); // 2-2 비계 위 안전대 없음 (맨 위층)
  g += P(132, 185, { scale: 0.8, vest: true, harness: true }) + `<line x1="20" y1="122" x2="168" y2="122" stroke="${INK}" stroke-width="1.4"/><path d="M136 158 Q140 140 142 122" stroke="${ORANGE}" stroke-width="2" fill="none"/>`; // 함정: 안전대 건 작업자
  g += P(118, 290, { scale: 0.85 }); // 2-3 비계 아래 통행
  // 고소작업대(오른쪽)
  g += `<rect x="262" y="246" width="78" height="14" rx="4" fill="${ORANGE}" stroke="${INK}"/><circle cx="276" cy="262" r="6" fill="${INK}"/><circle cx="326" cy="262" r="6" fill="${INK}"/><path d="M300 246 L320 170" stroke="${STEEL}" stroke-width="6"/><rect x="296" y="140" width="50" height="30" fill="none" stroke="${RAIL}" stroke-width="3"/>`;
  g += P(321, 168, { scale: 0.8, vest: true }); // 2-4 작업대 위 안전대 없음
  // 이동식 비계(가운데 아래) — 바퀴 고정 없음
  g += `<rect x="186" y="186" width="44" height="4" fill="${WOOD}"/><line x1="188" y1="186" x2="188" y2="254" stroke="${STEEL}" stroke-width="3"/><line x1="228" y1="186" x2="228" y2="254" stroke="${STEEL}" stroke-width="3"/><line x1="188" y1="220" x2="228" y2="220" stroke="${STEEL}" stroke-width="2"/><circle cx="188" cy="258" r="5" fill="${INK}"/><circle cx="228" cy="258" r="5" fill="${INK}"/>` + P(207, 186, { scale: 0.7 });
  return S400(g);
}
/* ---------- 장면 3: 양중·크레인·리프트 ---------- */
export function sceneLifting() {
  let g = g400(250) + wall(270, 30, 120, 220);
  g += `<rect x="40" y="10" width="8" height="240" fill="${YEL}" stroke="${INK}"/><rect x="0" y="6" width="260" height="7" fill="${YEL}" stroke="${INK}"/>`; // 타워크레인
  g += hook(150, 13, 90) + load2(150, 96, 60) + P(158, 282, { scale: 0.95 }); // 3-1 짐 아래 통행 (사람 걸어감)
  g += hook(220, 13, 60) + load1(220, 66, 50); // 3-2 한 줄로 매단 짐
  g += lift(232, 250, 200, true); // 3-3 문 열린 리프트
  g += `<rect x="70" y="214" width="56" height="20" rx="3" fill="${ORANGE}" stroke="${INK}"/><rect x="76" y="198" width="22" height="16" fill="${ORANGE}" stroke="${INK}"/><rect x="79" y="201" width="14" height="8" fill="#9cc3e6"/><circle cx="82" cy="238" r="6" fill="${INK}"/><circle cx="116" cy="238" r="6" fill="${INK}"/>`; // 3-4 신호수 없이 움직이는 지게차
  g += flagger(30, 288, 0.8); // 함정: 신호수
  return S400(g);
}
/* ---------- 장면 4: 장비·토공사 ---------- */
export function sceneEquip() {
  let g = g400(210);
  g += `<path d="M250 210 L250 300 L400 300 L400 210Z" fill="#7a5c3e"/><path d="M250 210 L250 300" stroke="#5e4630" stroke-width="3"/>`; // 4-4 수직으로 깊게 판 굴착면 (오른쪽)
  g += P(300, 290, { scale: 0.75, vest: true }); // 굴착면 아래 작업자
  g += excavator(90, 210, 0.9) + `<path d="M40 222 a70 22 0 1 0 140 0" stroke="${RED}" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>` + P(48, 238, { scale: 0.8 }); // 4-1 회전 반경 안 사람
  g += dump(180, 168, 0.9) + excavator(240, 172, 0.7, true) + P(212, 164, { scale: 0.65 }); // 4-2 덤프·굴착기 사이
  g += roller(150, 284, 0.9) + P(108, 286, { scale: 0.7, hold: true }); // 4-3 후진 롤러 뒤
  g += flagger(368, 196, 0.7); // 함정: 안전한 곳의 유도자
  return S400(g);
}
/* ---------- 장면 5: 타설·동바리 ---------- */
export function scenePour() {
  let g = g400(262) + powerline(28);
  g += `<rect x="40" y="130" width="250" height="12" fill="${WOOD}" stroke="${INK}" stroke-width="1.4"/>`; // 거푸집 슬래브
  g += shore(60, 142, 262) + shore(110, 142, 262, true) + shore2(200, 142, 262) + shore(270, 142, 262); // 5-1 휜 동바리, 5-3 2단 동바리
  g += P(116, 262, { scale: 0.75 }); // 휜 동바리 아래 사람
  g += `<path d="M150 130 q20 -32 40 0z" fill="${CON2}" stroke="${INK}"/>` + `<path d="M170 30 L170 98" stroke="${INK}" stroke-width="6"/>`; // 5-2 한곳에 몰아 부은 콘크리트 + 호스
  g += pumpBoom(330, 262, 362, 44); // 5-4 펌프카 붐 끝이 전선 가까이
  g += P(22, 262, { scale: 0.75, vest: true, helmet: '#fff', point: true }); // 함정: 감시자(밖에서 지켜봄)
  return S400(g);
}
/* ---------- 장면 6: 용접·밀폐공간·폭염 ---------- */
export function sceneHot() {
  let g = g400(200) + sun(360, 34, 16);
  g += P(60, 196, { scale: 0.85, hold: true }) + `<rect x="48" y="146" width="22" height="16" rx="3" fill="#3b4f6b"/>` + sparks(82, 182) + cans(96, 196); // 6-1 불티 옆 가연물
  g += manhole(205, 236, true) + P(205, 262, { scale: 0.8, rot: 0 }); // 6-2 측정 없이 맨홀 진입 (몸이 반쯤 들어감)
  g += `<rect x="181" y="240" width="48" height="60" fill="${GROUND}"/>`; // 맨홀 아래 몸 가리기
  g += cable(20, 270, true); // 6-3 피복 벗겨진 전선
  g += P(330, 280, { scale: 0.9, rot: 90 }); // 6-4 땡볕 아래 누워 쉼
  g += P(300, 196, { scale: 0.7, hold: true }) + `<rect x="288" y="156" width="18" height="13" rx="3" fill="#3b4f6b"/>` + ext(320, 196) + `<rect x="312" y="150" width="4" height="46" fill="${STEEL}"/><rect x="306" y="150" width="34" height="30" fill="#c9a46b" opacity=".8"/>`; // 함정: 방화포·소화기 갖춘 용접
  return S400(g);
}

// 누를 영역 중심 (scenes.json area 와 맞춤)
export const SPOTS = {
  tbm: { '0-1': [130, 230], '0-2': [205, 222], '0-3': [280, 262], s: [355, 232] },
  scaffold: { '2-1': [100, 120], '2-2': [68, 32], '2-3': [118, 268], '2-4': [321, 150], '2-5': [208, 238], s: [140, 172] },
  lifting: { '3-1': [158, 258], '3-2': [218, 92], '3-3': [240, 196], '3-4': [92, 220], s: [30, 262] },
  equip: { '4-1': [48, 220], '4-2': [212, 148], '4-3': [128, 268], '4-4': [292, 252], s: [368, 172] },
  pour: { '5-1': [114, 222], '5-2': [170, 116], '5-3': [200, 200], '5-4': [362, 50], s: [22, 240] },
  hot: { '6-1': [96, 178], '6-2': [205, 228], '6-3': [80, 266], '6-4': [330, 270], s: [312, 176] },
};

// 안전모 쓴 얼굴 크게 (턱끈 보기용). ok=false: 턱끈이 풀려 늘어지고 모자가 기울어짐
const headClose = (ok) => `<rect x="44" y="96" width="72" height="14" rx="6" fill="#2f6fb3"/><rect x="72" y="84" width="16" height="14" fill="#f2c9a0"/><circle cx="80" cy="62" r="24" fill="#f2c9a0"/><circle cx="71" cy="62" r="2.6" fill="${INK}"/><circle cx="89" cy="62" r="2.6" fill="${INK}"/><path d="M73 74 q7 5 14 0" stroke="${INK}" stroke-width="2" fill="none"/>`
  + `<g transform="rotate(${ok ? 0 : -14} 80 46)"><path d="M52 50 a28 26 0 0 1 56 0z" fill="${YEL}" stroke="${INK}" stroke-width="1.6"/><rect x="46" y="47" width="68" height="7" rx="3.5" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/></g>`
  + (ok ? `<path d="M57 54 Q60 86 80 89 Q100 86 103 54" stroke="${INK}" stroke-width="2.6" fill="none"/><rect x="75" y="85" width="10" height="7" rx="2" fill="${INK}"/>`
        : `<path d="M55 58 q-4 16 2 32" stroke="${INK}" stroke-width="2.6" fill="none"/><path d="M101 50 q8 14 4 34" stroke="${INK}" stroke-width="2.6" fill="none"/><rect x="100" y="82" width="9" height="6" rx="2" fill="${INK}"/>`);
/* ---------- 위험한 모습 / 안전한 모습 (160×110) ---------- */
export const PAIR2 = {
  // 장면 0
  noHelmetBad: () => S160(g160() + P(80, 96, { scale: 1.6, helmet: null, vest: true }) + `<rect x="98" y="14" width="18" height="8" fill="${WOOD}" transform="rotate(30 107 18)"/>`),
  noHelmetGood: () => S160(g160() + P(80, 96, { scale: 1.6, vest: true })),
  strapBad: () => S160(headClose(false)),
  strapGood: () => S160(headClose(true)),
  sneakerBad: () => S160(g160() + P(80, 96, { scale: 1.6, shoes: 'sneaker' }) + `<rect x="94" y="80" width="22" height="10" fill="${STEEL}" transform="rotate(25 105 85)"/>`),
  sneakerGood: () => S160(g160() + P(80, 96, { scale: 1.6, shoes: 'safety' })),
  // 장면 2
  gapBad: () => S160(g160() + scaffold(40, 92, 90, 80, 2, 2) + P(60, 52, { scale: 0.7 })),
  gapGood: () => S160(g160() + scaffold(40, 92, 90, 80, 2) + P(60, 52, { scale: 0.7 })),
  scafHarnessBad: () => S160(g160() + scaffold(40, 92, 90, 80, 2) + P(85, 52, { scale: 0.75 })),
  scafHarnessGood: () => S160(g160() + scaffold(40, 92, 90, 80, 2) + `<line x1="20" y1="18" x2="150" y2="18" stroke="${INK}" stroke-width="1.4"/><path d="M89 30 Q92 24 94 18" stroke="${ORANGE}" stroke-width="2" fill="none"/>` + P(85, 52, { scale: 0.75, harness: true })),
  underBad: () => S160(g160() + scaffold(30, 92, 70, 80, 2) + `<rect x="60" y="20" width="10" height="5" fill="${STEEL}"/>` + P(66, 96, { scale: 0.75 })),
  underGood: () => S160(g160() + scaffold(30, 92, 70, 80, 2) + `<path d="M24 92 L108 92" stroke="${RED}" stroke-width="3" stroke-dasharray="6 4"/>` + P(132, 96, { scale: 0.75 })),
  awpBad: () => S160(g160() + `<rect x="40" y="80" width="70" height="10" rx="3" fill="${ORANGE}"/><path d="M75 80 L90 44" stroke="${STEEL}" stroke-width="5"/><rect x="70" y="20" width="40" height="24" fill="none" stroke="${RAIL}" stroke-width="3"/>` + P(90, 44, { scale: 0.6 })),
  awpGood: () => S160(g160() + `<rect x="40" y="80" width="70" height="10" rx="3" fill="${ORANGE}"/><path d="M75 80 L90 44" stroke="${STEEL}" stroke-width="5"/><rect x="70" y="20" width="40" height="24" fill="none" stroke="${RAIL}" stroke-width="3"/><path d="M93 30 Q100 26 104 22" stroke="${ORANGE}" stroke-width="2" fill="none"/>` + P(90, 44, { scale: 0.6, harness: true })),
  wheelBad: () => S160(g160() + `<rect x="50" y="34" width="60" height="4" fill="${WOOD}"/><line x1="54" y1="34" x2="54" y2="86" stroke="${STEEL}" stroke-width="3"/><line x1="106" y1="34" x2="106" y2="86" stroke="${STEEL}" stroke-width="3"/><circle cx="54" cy="90" r="5" fill="${INK}"/><circle cx="106" cy="90" r="5" fill="${INK}"/>` + P(80, 34, { scale: 0.6 }) + `<path d="M118 88 h18 l-5 -4 m5 4 l-5 4" stroke="${RED}" stroke-width="2" fill="none"/>`),
  wheelGood: () => S160(g160() + `<rect x="50" y="34" width="60" height="4" fill="${WOOD}"/><line x1="54" y1="34" x2="54" y2="86" stroke="${STEEL}" stroke-width="3"/><line x1="106" y1="34" x2="106" y2="86" stroke="${STEEL}" stroke-width="3"/><circle cx="54" cy="90" r="5" fill="${INK}"/><circle cx="106" cy="90" r="5" fill="${INK}"/><rect x="47" y="86" width="14" height="6" fill="${RED}"/><rect x="99" y="86" width="14" height="6" fill="${RED}"/><path d="M54 86 L34 92 M106 86 L126 92" stroke="${STEEL}" stroke-width="3"/>` + P(80, 34, { scale: 0.6 })),
  // 장면 3
  underLoadBad: () => S160(g160() + hook(80, 0, 20) + load2(80, 26, 56) + P(80, 96, { scale: 0.8 })),
  underLoadGood: () => S160(g160() + hook(60, 0, 20) + load2(60, 26, 56) + `<path d="M24 92 h72" stroke="${RED}" stroke-width="3" stroke-dasharray="6 4"/>` + P(132, 96, { scale: 0.8 })),
  slingBad: () => S160(hook(80, 0, 26) + load1(80, 32, 64)),
  slingGood: () => S160(hook(80, 0, 26) + load2(80, 32, 64)),
  liftDoorBad: () => S160(g160() + `<rect x="70" y="0" width="6" height="92" fill="${STEEL}"/><rect x="34" y="34" width="36" height="40" fill="${YEL}" stroke="${INK}"/><rect x="38" y="38" width="14" height="32" fill="#20262e"/><rect x="22" y="38" width="14" height="32" fill="${YEL}" stroke="${INK}"/><path d="M52 26 l-5 7 h10z" fill="${INK}"/>`),
  liftDoorGood: () => S160(g160() + `<rect x="70" y="0" width="6" height="92" fill="${STEEL}"/><rect x="34" y="34" width="36" height="40" fill="${YEL}" stroke="${INK}"/><rect x="38" y="38" width="28" height="32" fill="#9cc3e6" stroke="${INK}"/><path d="M52 26 l-5 7 h10z" fill="${INK}"/>`),
  noSignalBad: () => S160(g160() + `<rect x="20" y="64" width="56" height="20" rx="3" fill="${ORANGE}" stroke="${INK}"/><rect x="26" y="48" width="22" height="16" fill="${ORANGE}" stroke="${INK}"/><circle cx="32" cy="88" r="6" fill="${INK}"/><circle cx="66" cy="88" r="6" fill="${INK}"/>` + P(110, 96, { scale: 0.75 }) + `<path d="M78 74 h20" stroke="${RED}" stroke-width="2.4"/>`),
  noSignalGood: () => S160(g160() + `<rect x="20" y="64" width="56" height="20" rx="3" fill="${ORANGE}" stroke="${INK}"/><rect x="26" y="48" width="22" height="16" fill="${ORANGE}" stroke="${INK}"/><circle cx="32" cy="88" r="6" fill="${INK}"/><circle cx="66" cy="88" r="6" fill="${INK}"/>` + flagger(128, 96, 0.75)),
  // 장면 4
  swingBad: () => S160(g160() + excavator(50, 92, 0.6) + P(28, 96, { scale: 0.7 }) + `<path d="M8 96 a44 12 0 1 0 88 0" stroke="${RED}" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/>`),
  swingGood: () => S160(g160() + excavator(50, 92, 0.6) + `<path d="M8 96 a44 12 0 1 0 88 0" stroke="${RED}" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/>` + flagger(140, 96, 0.7)),
  betweenBad: () => S160(g160() + dump(54, 92, 0.8) + excavator(120, 92, 0.55, true) + P(92, 96, { scale: 0.65 })),
  betweenGood: () => S160(g160() + dump(54, 92, 0.8) + excavator(120, 92, 0.55, true) + flagger(150, 70, 0.55)),
  rollerBad: () => S160(g160() + roller(80, 92) + P(40, 96, { scale: 0.75, hold: true }) + `<path d="M58 70 h-12" stroke="${RED}" stroke-width="2.4"/><path d="M46 70 l5 -4 m-5 4 l5 4" stroke="${RED}" stroke-width="2.4" fill="none"/>`),
  rollerGood: () => S160(g160() + roller(80, 92) + flagger(140, 96, 0.7)),
  trenchBad: () => S160(`<rect x="0" y="40" width="160" height="70" fill="#7a5c3e"/><rect x="50" y="40" width="60" height="70" fill="${SKY}"/><path d="M50 40 V110 M110 40 V110" stroke="#5e4630" stroke-width="3"/>` + P(80, 106, { scale: 0.7 })),
  trenchGood: () => S160(`<rect x="0" y="40" width="160" height="70" fill="#7a5c3e"/><path d="M20 40 L56 106 L104 106 L140 40Z" fill="${SKY}"/>` + P(80, 106, { scale: 0.7 })),
  // 장면 5
  bentShoreBad: () => S160(g160() + `<rect x="20" y="20" width="120" height="8" fill="${WOOD}"/>` + shore(40, 28, 92) + shore(80, 28, 92, true) + shore(120, 28, 92) + P(86, 96, { scale: 0.7 })),
  bentShoreGood: () => S160(g160() + `<rect x="20" y="20" width="120" height="8" fill="${WOOD}"/>` + shore(40, 28, 92) + shore(80, 28, 92) + shore(120, 28, 92) + P(148, 96, { scale: 0.7, point: true })),
  pileUpBad: () => S160(`<rect x="10" y="60" width="140" height="8" fill="${WOOD}"/>` + shore(30, 68, 110) + shore(80, 68, 110) + shore(130, 68, 110) + `<path d="M58 60 q22 -40 44 0z" fill="${CON2}" stroke="${INK}"/>`),
  pileUpGood: () => S160(`<rect x="10" y="60" width="140" height="8" fill="${WOOD}"/>` + shore(30, 68, 110) + shore(80, 68, 110) + shore(130, 68, 110) + `<rect x="12" y="50" width="136" height="10" fill="${CON2}" stroke="${INK}"/>`),
  twoTierBad: () => S160(g160() + `<rect x="20" y="10" width="120" height="8" fill="${WOOD}"/>` + shore2(80, 18, 92)),
  twoTierGood: () => S160(g160() + `<rect x="20" y="10" width="120" height="8" fill="${WOOD}"/>` + shore(80, 18, 92)),
  boomBad: () => S160(g160() + `<line x1="0" y1="14" x2="160" y2="18" stroke="${INK}" stroke-width="1.6"/>` + `<rect x="10" y="74" width="50" height="16" rx="3" fill="${ORANGE}" stroke="${INK}"/><path d="M40 74 L70 30 L120 22" stroke="${STEEL}" stroke-width="5" fill="none"/>`),
  boomGood: () => S160(g160() + `<line x1="0" y1="14" x2="160" y2="18" stroke="${INK}" stroke-width="1.6"/>` + `<rect x="10" y="74" width="50" height="16" rx="3" fill="${ORANGE}" stroke="${INK}"/><path d="M40 74 L70 46 L120 44" stroke="${STEEL}" stroke-width="5" fill="none"/>`),
  // 장면 6
  sparkBad: () => S160(g160() + P(36, 96, { hold: true, scale: 0.8 }) + `<rect x="26" y="48" width="18" height="12" rx="3" fill="#3b4f6b"/>` + sparks(58, 80) + cans(90, 96)),
  sparkGood: () => S160(g160() + P(36, 96, { hold: true, scale: 0.8 }) + `<rect x="26" y="48" width="18" height="12" rx="3" fill="#3b4f6b"/>` + sparks(58, 80) + `<rect x="74" y="56" width="6" height="40" fill="${STEEL}"/><rect x="70" y="56" width="30" height="34" fill="#c9a46b" opacity=".85"/>` + ext(120, 96)),
  manholeBad: () => S160(g160(60) + manhole(80, 64, true) + P(80, 86, { scale: 0.7 }) + `<rect x="56" y="68" width="48" height="42" fill="${GROUND}"/>`),
  manholeGood: () => S160(g160(60) + manhole(80, 64, true) + fan(40, 62) + P(122, 92, { scale: 0.7, hold: true }) + detector(128, 56)),
  cableBad: () => S160(g160(70) + cable(10, 86, true)),
  cableGood: () => S160(g160(70) + `<path d="M10 40 h140" stroke="${INK}" stroke-width="4"/>${[30, 80, 130].map((x) => `<path d="M${x} 40 v-14" stroke="${STEEL}" stroke-width="3"/>`).join('')}`),
  sunBad: () => S160(g160() + sun(130, 22, 12) + P(70, 100, { rot: 90, scale: 0.8 })),
  sunGood: () => S160(g160() + sun(140, 18, 9) + `<path d="M30 40 h80 l-8 -12 h-64z" fill="${GRN}"/><rect x="68" y="40" width="4" height="52" fill="${STEEL}"/>` + P(70, 96, { scale: 0.75 }) + `<rect x="84" y="80" width="8" height="12" rx="2" fill="#5b8bd6"/>`),
};

/* ---------- 마무리 "위험하면 멈추고 알려요" 세 장 + 점검용 한 쌍 ---------- */
// 금이 가며 기우는 벽 (급박한 위험)
const crackWall = (x, y) => `<g transform="rotate(-8 ${x} ${y})"><rect x="${x - 14}" y="${y - 60}" width="28" height="60" fill="#cfd6de" stroke="${INK}" stroke-width="1.4"/><path d="M${x - 4} ${y - 56} l6 12 l-7 10 l8 12 l-5 14" stroke="${INK}" stroke-width="1.6" fill="none"/></g>`;
const palm = (x, y) => `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${RED}" stroke-width="3"/><path d="M${x - 6} ${y + 8} v-12 a2 2 0 0 1 4 0 v4 v-8 a2 2 0 0 1 4 0 v8 v-6 a2 2 0 0 1 4 0 v8 a7 7 0 0 1 -7 7 h-2 a4 4 0 0 1 -3 -1z" fill="#f2c9a0" stroke="${INK}" stroke-width="1"/>`;
const bubble = (x, y) => `<path d="M${x - 16} ${y - 12} h32 a5 5 0 0 1 5 5 v14 a5 5 0 0 1 -5 5 h-18 l-8 7 v-7 h-6 a5 5 0 0 1 -5 -5 v-14 a5 5 0 0 1 5 -5z" fill="#fff" stroke="${INK}" stroke-width="1.6"/><path d="M${x} ${y - 7} v9" stroke="${RED}" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="${y + 7}" r="1.8" fill="${RED}"/>`;
export const STOP = {
  stop: () => S160(g160() + crackWall(34, 92) + P(84, 96, { scale: 0.85, point: true }) + palm(122, 40)),
  away: () => S160(g160() + crackWall(24, 92) + P(110, 96, { scale: 0.85 }) + `<path d="M60 66 h34 m-8 -7 l8 7 l-8 7" stroke="${GRN}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  tell: () => S160(g160() + P(60, 96, { scale: 0.85, point: true }) + P(112, 96, { scale: 0.85, vest: true, helmet: '#fff' }) + bubble(54, 26)),
  // 보호구를 제대로 갖춘 사람 (안전모·턱끈·조끼·안전대·안전화) + 파란 원(지시 표지 모양)
  ppe: () => S160(g160() + `<circle cx="118" cy="40" r="16" fill="#2563b0"/><path d="M110 40 l6 6 l10 -12" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + P(64, 100, { scale: 1.35, vest: true, harness: true, shoes: 'safety' })),
};
// 점검 6번: 위험한데 계속 일함 ↔ 멈추고 알림
PAIR2.keepBad = () => S160(g160() + crackWall(40, 92) + P(70, 96, { scale: 0.85, hold: true }) + `<rect x="78" y="62" width="12" height="4" fill="${STEEL}" transform="rotate(-30 84 64)"/>`);
PAIR2.keepGood = () => S160(g160() + crackWall(24, 92) + P(92, 96, { scale: 0.85, point: true }) + P(132, 96, { scale: 0.85, vest: true, helmet: '#fff' }) + bubble(88, 30));
