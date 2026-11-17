// 첫 삽 v12.1 캐릭터 "첫삽이" — 현장에 막 온 새내기 근로자 (함께 배우는 동료)
// viewBox 0 0 200 240, 2.3등신. 모든 바깥 윤곽선 6px(--ink), 안쪽 선 4px. 색은 css/tokens.css 변수만 쓴다.
// renderMascot({ pose, face, size, mono, simple }) → SVG 문자열
//   pose: stand | wave | thumb | stop | proud      face: basic | joy | surprise | worry | think | firm | proud
//   size ≤ 56 이면 자동으로 단순 버전(볼·반사띠·장갑 홈선 생략)
// assets/character/*.svg 는 tools/make-mascot.mjs 가 이 파일에서 만든다 (손으로 고치지 않는다)

export const POSES = ['stand', 'wave', 'thumb', 'stop', 'proud'];
export const FACES = ['basic', 'joy', 'surprise', 'worry', 'think', 'firm', 'proud'];
const OUT = 6, IN = 4; // 바깥선·안쪽선 굵기 (200×240 기준)
const C = { ink: 'var(--ink)', brand: 'var(--brand)', vest: 'var(--vest)', brandDark: 'var(--brand-dark)', skin: 'var(--skin)', bg: 'var(--bg)', soft: 'var(--bg-soft)', ink2: 'var(--ink-2)', mouth: 'var(--danger-dark)', edge: 'var(--stripe-edge)', steel: 'var(--locked)' };
let uid = 0;

// 앱 로고와 같은 삽 모양 (안전모 마크·로고·앱 아이콘 공통). (cx, top) 기준, 높이 h
export function shovelShape(cx, top, h, fill) {
  const k = h / 24;
  const X = (v) => (cx + (v - 12) * k).toFixed(2), Y = (v) => (top + v * k).toFixed(2);
  return `<path d="M${X(8)} ${Y(1.5)} H${X(16)} M${X(12)} ${Y(1.5)} V${Y(11)}" stroke="${fill}" stroke-width="${(2.6 * k).toFixed(2)}" stroke-linecap="round" fill="none"/>`
    + `<path d="M${X(6.5)} ${Y(11)} H${X(17.5)} V${Y(15)} C${X(17.5)} ${Y(19.5)} ${X(15)} ${Y(22)} ${X(12)} ${Y(23.5)} C${X(9)} ${Y(22)} ${X(6.5)} ${Y(19.5)} ${X(6.5)} ${Y(15)} Z" fill="${fill}"/>`;
}

/* ---------- 머리 (얼굴 윤곽·안전모·턱끈) ---------- */
// 얼굴: 아래가 살짝 넓은 둥근 사각형, 너비 96 : 높이 88 (1 : 0.92)
const FACE_PATH = 'M57 58 C57 36 77 26 100 26 C123 26 143 36 143 58 L146 92 C146 108 127 114 100 114 C73 114 54 108 54 92 Z';
function head(o) {
  const fill = o.mono ? C.bg : C.skin, hat = o.mono ? C.bg : C.brand, mark = o.mono ? C.ink : C.bg;
  return `<path d="${FACE_PATH}" fill="${fill}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`
    // 턱끈: 안전모 양옆에서 턱 아래로 (교육 내용 "턱끈까지 맨다")
    + `<path d="M61 68 C61 82 63 94 67 103 M139 68 C139 82 137 94 133 103" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
    // 안전모: 얼굴 위 약 40%를 덮는 돔 + 앞 챙 + 가운데 세로 홈 + 흰 삽 마크
    + `<path d="M48 62 C48 30 72 13 100 13 C128 13 152 30 152 62 Z" fill="${hat}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`
    + `<rect x="38" y="57" width="124" height="12" rx="6" fill="${hat}" stroke="${C.ink}" stroke-width="${OUT}"/>`
    + `<path d="M100 16 V27" stroke="${C.ink}" stroke-width="${IN}" stroke-linecap="round"/>`
    + shovelShape(100, 31, 21, mark);
}

/* ---------- 표정 (눈·눈썹·입·볼) ---------- */
// 눈: 세로로 긴 타원(너비 10), 눈 사이 = 눈 너비 × 1.6 = 16 → 중심 x 87 / 113, y 86 (얼굴 세로 중간보다 약간 아래)
const EY = 86, EL = 87, ER = 113;
const eye = (x, y = EY, rx = 5, ry = 7.5) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.ink}"/><circle cx="${x - 1.8}" cy="${y - 3}" r="1.9" fill="${C.bg}"/>`;
const line = (d) => `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${IN}" stroke-linecap="round" stroke-linejoin="round"/>`;
const openMouth = (d) => `<path d="${d}" fill="${C.mouth}" stroke="${C.ink}" stroke-width="${IN}" stroke-linejoin="round"/>`;
const FACE = {
  basic: { eyes: eye(EL) + eye(ER), mouth: line('M92 100 Q100 106 108 100') },
  joy: { eyes: `<path d="M81 89 Q87 77 93 89 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/><path d="M107 89 Q113 77 119 89 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`,
    mouth: openMouth('M88 98 Q100 114 112 98 Z'), brows: line('M80 74 Q87 70 93 73') + line('M107 73 Q113 70 120 74') },
  surprise: { eyes: `<circle cx="${EL}" cy="${EY}" r="7.5" fill="${C.ink}"/><circle cx="${EL - 2}" cy="${EY - 3}" r="2" fill="${C.bg}"/><circle cx="${ER}" cy="${EY}" r="7.5" fill="${C.ink}"/><circle cx="${ER - 2}" cy="${EY - 3}" r="2" fill="${C.bg}"/>`,
    mouth: openMouth('M100 98 a5 6 0 1 0 0.01 0 Z'), brows: line('M80 73 Q87 68 94 72') + line('M106 72 Q113 68 120 73') },
  worry: { eyes: eye(EL) + eye(ER), mouth: line('M92 104 Q100 98 108 104'), brows: line('M80 78 L93 74') + line('M120 78 L107 74') },
  think: { eyes: eye(EL) + line(`M${ER - 6} ${EY} H${ER + 6}`), mouth: line('M93 103 Q100 99 109 101'), brows: line('M80 76 Q87 70 94 74') + line('M107 78 H119') },
  firm: { eyes: eye(EL) + eye(ER), mouth: line('M92 102 H108'), brows: line('M80 74 L93 78') + line('M120 74 L107 78') },
  proud: { eyes: line(`M${EL - 6} ${EY + 2} Q${EL} ${EY - 6} ${EL + 6} ${EY + 2}`) + line(`M${ER - 6} ${EY + 2} Q${ER} ${EY - 6} ${ER + 6} ${EY + 2}`),
    mouth: openMouth('M90 98 Q100 110 110 98 Z'), brows: line('M80 73 Q87 69 93 72') + line('M107 72 Q113 69 120 73') },
};
function face(name, o) {
  const f = FACE[name] || FACE.basic;
  const cheeks = o.simple || o.mono ? '' : `<ellipse cx="71" cy="98" rx="8" ry="5" fill="${C.vest}" opacity=".4"/><ellipse cx="129" cy="98" rx="8" ry="5" fill="${C.vest}" opacity=".4"/>`;
  return cheeks + (f.brows || '') + `<g class="m-eyes">${f.eyes}</g>` + f.mouth;
}

/* ---------- 몸 (조끼·다리·안전화·팔·손·삽) ---------- */
// 팔: 바깥(남색, 굵게) 위에 소매색을 6px씩 좁게 겹쳐 그려 같은 윤곽선 굵기를 유지
const arm = (pts, o) => { const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
  return `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${16 + OUT * 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${o.mono ? C.bg : C.ink2}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`; };
// 장갑 낀 둥근 손 (홈선 3개 = 손가락 4개)
const hand = (x, y, o, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})"><circle cx="${x}" cy="${y}" r="12" fill="${o.mono ? C.bg : C.soft}" stroke="${C.ink}" stroke-width="${OUT}"/>${o.simple ? '' : [-4, 0, 4].map((d) => `<path d="M${x + d} ${y - 9} V${y - 3}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`).join('')}</g>`;
// 엄지척: 주먹 + 위로 선 엄지
const thumbUp = (x, y, o) => `<rect x="${x - 6}" y="${y - 30}" width="12" height="22" rx="6" fill="${o.mono ? C.bg : C.soft}" stroke="${C.ink}" stroke-width="${OUT}"/><rect x="${x - 13}" y="${y - 12}" width="26" height="22" rx="9" fill="${o.mono ? C.bg : C.soft}" stroke="${C.ink}" stroke-width="${OUT}"/>${o.simple ? '' : [-1, 5].map((d) => `<path d="M${x - 13} ${y + d} H${x - 5}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`).join('')}`;
// 손바닥 내밀기 (멈춰요): 손가락이 보이는 큰 손바닥
const palm = (x, y, o) => `<path d="M${x - 14} ${y + 16} V${y - 8} a4.5 4.5 0 0 1 9 0 V${y - 16} a4.5 4.5 0 0 1 9 0 V${y - 13} a4.5 4.5 0 0 1 9 0 V${y - 4} a4.5 4.5 0 0 1 9 0 V${y + 10} C${x + 22} ${y + 22} ${x + 14} ${y + 28} ${x + 2} ${y + 28} H${x - 4} C${x - 10} ${y + 28} ${x - 14} ${y + 24} ${x - 14} ${y + 16} Z" fill="${o.mono ? C.bg : C.soft}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`;
// 작은 삽 (자루·손잡이·날)
const shovel = (x, yTop, yBot, o) => `<path d="M${x - 9} ${yTop} H${x + 9}" stroke="${C.ink}" stroke-width="${8 + OUT}" stroke-linecap="round"/><path d="M${x - 9} ${yTop} H${x + 9}" stroke="${o.mono ? C.bg : C.brandDark}" stroke-width="8" stroke-linecap="round"/>`
  + `<path d="M${x} ${yTop} V${yBot - 26}" stroke="${C.ink}" stroke-width="${7 + OUT}" stroke-linecap="round"/><path d="M${x} ${yTop} V${yBot - 26}" stroke="${o.mono ? C.bg : C.brandDark}" stroke-width="7" stroke-linecap="round"/>`
  + `<path d="M${x - 13} ${yBot - 28} H${x + 13} V${yBot - 14} C${x + 13} ${yBot - 6} ${x + 7} ${yBot - 1} ${x} ${yBot + 2} C${x - 7} ${yBot - 1} ${x - 13} ${yBot - 6} ${x - 13} ${yBot - 14} Z" fill="${o.mono ? C.bg : C.steel}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`;

const TORSO = 'M72 112 H128 C138 112 143 118 144 126 L150 178 C151 188 145 194 136 194 H64 C55 194 49 188 50 178 L56 126 C57 118 62 112 72 112 Z';
function body(pose, o, id) {
  let g = '';
  // 다리·안전화 (앞코 둥근 진한색 안전화)
  g += `<rect x="70" y="186" width="24" height="34" rx="8" fill="${o.mono ? C.bg : C.ink2}" stroke="${C.ink}" stroke-width="${OUT}"/><rect x="106" y="186" width="24" height="34" rx="8" fill="${o.mono ? C.bg : C.ink2}" stroke="${C.ink}" stroke-width="${OUT}"/>`;
  g += `<path d="M64 232 V224 C64 218 70 214 78 214 H94 V232 Z" fill="${o.mono ? C.bg : C.ink}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/><path d="M136 232 V224 C136 218 130 214 122 214 H106 V232 Z" fill="${o.mono ? C.bg : C.ink}" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`;
  // 뒤쪽 팔·삽 (몸 뒤에 그릴 것)
  const L = { // 왼쪽(화면 왼쪽) 팔 끝 좌표
    stand: [[58, 126], [44, 168]], wave: [[58, 126], [44, 168]], thumb: [[58, 126], [44, 168]], stop: [[58, 126], [44, 168]], proud: [[58, 126], [40, 150]] };
  const R = {
    stand: [[142, 126], [156, 168]], wave: [[142, 124], [164, 100], [172, 72]], thumb: [[142, 126], [160, 150], [168, 140]], stop: [[142, 124], [166, 128], [176, 120]], proud: [[142, 126], [156, 168]] };
  const hasShovel = pose === 'stand' || pose === 'proud' || pose === 'wave';
  // 삽은 왼손에: 서기·인사 = 작게 옆에, 뿌듯 = 크게 세워 들기
  if (hasShovel) g += pose === 'proud' ? shovel(34, 92, 232, o) : shovel(36, 140, 230, o);
  // 몸통: 주황 조끼 + 흰 반사띠 2줄(회색 테두리)
  g += `<clipPath id="tc${id}"><path d="${TORSO}"/></clipPath>`;
  g += `<path d="${TORSO}" fill="${o.mono ? C.bg : C.vest}"/>`;
  if (!o.simple && !o.mono) g += `<g clip-path="url(#tc${id})"><rect x="40" y="146" width="120" height="9" fill="${C.bg}" stroke="${C.edge}" stroke-width="2"/><rect x="40" y="164" width="120" height="9" fill="${C.bg}" stroke="${C.edge}" stroke-width="2"/></g>`;
  if (!o.simple) g += `<path d="M100 114 V192" stroke="${C.ink}" stroke-width="${IN}" stroke-linecap="round"/>`; // 조끼 여밈
  g += `<path d="${TORSO}" fill="none" stroke="${C.ink}" stroke-width="${OUT}" stroke-linejoin="round"/>`;
  // 팔·손
  g += arm(L[pose], o);
  const le = L[pose].at(-1), re = R[pose].at(-1);
  g += hand(le[0], le[1] + 2, o);
  if (hasShovel) g += `<path d="M${le[0] - 10} ${le[1] + 2} H${le[0] + 8}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`; // 쥔 손
  g += arm(R[pose], o);
  if (pose === 'thumb') g += thumbUp(re[0], re[1], o);
  else if (pose === 'stop') g += palm(re[0] + 6, re[1] - 4, o);
  else if (pose === 'wave') g += hand(re[0], re[1] - 4, o, 10) + (o.simple ? '' : `<path d="M182 52 q6 6 4 14 M190 46 q8 10 4 22" fill="none" stroke="${C.ink}" stroke-width="${IN}" stroke-linecap="round"/>`);
  else g += hand(re[0], re[1] + 2, o);
  return g;
}

export function renderMascot({ pose = 'stand', face: fc = 'basic', size = 96, mono = false, simple, head: headOnly = false, cls = '', label } = {}) {
  const o = { mono, simple: simple ?? (size <= 56 && !headOnly) };
  const id = ++uid;
  // 머리만 (작은 크기): 안전모~턱만 잘라 크게 — 볼은 남긴다
  if (headOnly) return `<svg class="mascot head ${cls}" viewBox="32 6 136 114" width="${size}" height="${Math.round(size * 114 / 136)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label || '첫삽이'}"><g class="m-head">${head(o)}<g class="m-face">${face(fc, o)}</g></g></svg>`;
  const h = Math.round(size * 1.2);
  return `<svg class="mascot ${cls}" viewBox="0 0 200 240" width="${size}" height="${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label || '첫삽이'}">`
    + `<g class="m-body">${body(pose, o, id)}</g><g class="m-head">${head(o)}<g class="m-face">${face(fc, o)}</g></g></svg>`;
}
// 파일로 나눌 때: 몸(머리 윤곽 포함) / 얼굴(표정만)
export const bodyLayer = (pose, o = {}) => body(pose, { simple: false, ...o }, pose) + head(o);
export const faceLayer = (name, o = {}) => face(name, o);
