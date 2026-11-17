// 첫 삽 기초 교육 — 직접 그린 SVG 그림 (외부 사진·저작물 없음)
// 모든 그림은 160×110 칸. 레슨 데이터(data/lessons.json)에서 이름으로 부른다.
const INK = 'var(--art-dark)', SKY = 'var(--art-sky)', GROUND = 'var(--art-ground)', YEL = 'var(--art-helmet)', ORG = 'var(--brand)', RED = 'var(--danger)', GRN = 'var(--safe)', BLUE = 'var(--art-shirt)', GRAY = 'var(--art-steel)', CON = 'var(--art-concrete)';
const svg = (body, bg = SKY) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="160" height="110" rx="10" fill="${bg}"/>${body}</svg>`;
const ground = (y = 96) => `<rect x="0" y="${y}" width="160" height="${110 - y}" fill="${GROUND}"/>`;
const txt = (x, y, s, size = 9, c = INK, w = 700) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" fill="${c}" text-anchor="middle" font-family="system-ui,sans-serif">${s}</text>`;
const arrow = (x1, y1, x2, y2, c = INK) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x2} ${y2} l-6 -4 v8z" fill="${c}" transform="rotate(${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI} ${x2} ${y2})"/>`;
const xmark = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${RED}"/><path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="var(--bg)" stroke-width="2.4" stroke-linecap="round"/>`;
const check = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${GRN}"/><path d="M${x - 4} ${y}l3 3.5 5.5 -6.5" stroke="var(--bg)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const warn = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -11 L11 8 H-11Z" fill="${YEL}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><rect x="-1.2" y="-4" width="2.4" height="7" fill="${INK}"/><circle cx="0" cy="5.5" r="1.3" fill="${INK}"/></g>`;

// 사람: (x, y) = 발 위치. 높이 약 44
export function person(x, y, o = {}) {
  const shirt = o.shirt || BLUE, s = o.scale || 1;
  const hc = o.helmet === undefined ? YEL : o.helmet;
  let g = '';
  g += `<rect x="-5" y="-15" width="4.2" height="15" rx="2" fill="var(--art-dark)"/><rect x="0.8" y="-15" width="4.2" height="15" rx="2" fill="var(--art-dark)"/>`;
  g += o.shoes === 'sneaker' ? `<rect x="-6.5" y="-2.5" width="6" height="3" rx="1.5" fill="var(--bg)" stroke="${INK}" stroke-width=".8"/><rect x="0.5" y="-2.5" width="6" height="3" rx="1.5" fill="var(--bg)" stroke="${INK}" stroke-width=".8"/>`
    : `<rect x="-6.5" y="-3" width="6.5" height="3.5" rx="1.2" fill="${o.shoes === 'safety' ? 'var(--art-dirt-dark)' : INK}"/><rect x="0.2" y="-3" width="6.5" height="3.5" rx="1.2" fill="${o.shoes === 'safety' ? 'var(--art-dirt-dark)' : INK}"/>`;
  g += `<rect x="-6.5" y="-33" width="13" height="19" rx="4" fill="${shirt}"/>`;
  if (o.vest) g += `<rect x="-6.5" y="-32" width="13" height="16" rx="3" fill="${ORG}"/><rect x="-6.5" y="-24" width="13" height="2.2" fill="var(--line)"/>`;
  if (o.harness) g += `<path d="M-5 -33 L4 -16 M5 -33 L-4 -16 M-6 -18 H6" stroke="${ORG}" stroke-width="2.2" fill="none"/><circle cx="0" cy="-30" r="1.6" fill="${INK}"/>`;
  const armL = o.armsUp ? 'M-6 -31 L-12 -42' : o.point ? 'M-6 -31 L-13 -22' : 'M-6 -31 L-10 -19';
  const armR = o.armsUp ? 'M6 -31 L12 -42' : o.point ? 'M6 -31 L16 -36' : o.hold ? 'M6 -31 L13 -26' : 'M6 -31 L10 -19';
  g += `<path d="${armL} ${armR}" stroke="var(--skin)" stroke-width="3.6" stroke-linecap="round" fill="none"/>`;
  g += `<circle cx="0" cy="-39" r="6.2" fill="var(--skin)"/><circle cx="-2" cy="-40" r=".9" fill="${INK}"/><circle cx="2" cy="-40" r=".9" fill="${INK}"/>`;
  if (hc === 'cap') g += `<path d="M-6.5 -41 a6.5 5.5 0 0 1 13 0z" fill="${BLUE}"/><rect x="2" y="-42" width="8" height="2" rx="1" fill="${BLUE}"/>`;
  else if (hc) {
    g += `<path d="M-7 -41 a7 6.8 0 0 1 14 0z" fill="${hc}" stroke="${INK}" stroke-width=".8"/><rect x="-8.5" y="-42" width="17" height="2.4" rx="1.2" fill="${hc}" stroke="${INK}" stroke-width=".6"/>`;
    if (o.strap !== false) g += `<path d="M-5.5 -40 Q0 -30 5.5 -40" stroke="${INK}" stroke-width="1.2" fill="none"/>`;
    else g += `<path d="M-6 -40 Q-8 -33 -6 -30 M6 -40 Q8 -33 6 -30" stroke="${INK}" stroke-width="1.1" fill="none"/>`;
  }
  return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${s})">${g}</g>`;
}

const building = (x, y, w, h, floors, o = {}) => {
  let g = `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${o.fill || 'var(--art-wall)'}" stroke="${INK}" stroke-width="1.5"/>`;
  const fh = h / floors;
  for (let i = 0; i < floors; i++) for (let k = 0; k < 3; k++) g += `<rect x="${x + 5 + k * (w - 10) / 3}" y="${y - h + i * fh + fh * 0.25}" width="${(w - 10) / 3 - 4}" height="${fh * 0.45}" fill="var(--art-glass)"/>`;
  return g;
};
const scaffoldAt = (x, y, w, h, levels = 3) => {
  let g = '';
  for (let i = 0; i <= 2; i++) g += `<line x1="${x + i * w / 2}" y1="${y}" x2="${x + i * w / 2}" y2="${y - h}" stroke="${GRAY}" stroke-width="2.2"/>`;
  for (let i = 1; i <= levels; i++) { const yy = y - i * h / levels; g += `<rect x="${x - 2}" y="${yy}" width="${w + 4}" height="3.2" fill="var(--art-wood)"/><line x1="${x}" y1="${yy - 9}" x2="${x + w}" y2="${yy - 9}" stroke="${YEL}" stroke-width="2"/>`; }
  return g;
};

export const ART = {
  /* ---------- 레슨 1: 현장은 이렇게 돌아가요 ---------- */
  kinds: () => svg(ground() + building(12, 96, 50, 66, 5) + txt(37, 22, '건축', 11)
    + `<path d="M84 74 Q118 40 152 74" stroke="${INK}" stroke-width="3" fill="none"/><rect x="80" y="70" width="76" height="6" fill="var(--art-steel)"/><rect x="92" y="76" width="6" height="20" fill="var(--art-steel)"/><rect x="138" y="76" width="6" height="20" fill="var(--art-steel)"/><rect x="112" y="76" width="6" height="20" fill="var(--art-steel)"/>` + txt(118, 40, '토목', 11)),
  day: () => {
    // 아이콘도 직접 그림: 해(출근) · 팔 든 사람(체조) · 말풍선(TBM) · 망치(작업) · 빗자루(정리)
    const ic = [
      (x) => `<circle cx="${x}" cy="52" r="4.5" fill="${ORG}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="${x}" y1="45" x2="${x}" y2="42.5" stroke="${ORG}" stroke-width="1.6" stroke-linecap="round" transform="rotate(${a} ${x} 52)"/>`).join('')}`,
      (x) => `<circle cx="${x}" cy="45.5" r="2.6" fill="${INK}"/><path d="M${x} 48.5 v6 M${x} 54.5 l-3 5 M${x} 54.5 l3 5 M${x - 6} 44 l6 6 l6 -6" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      (x) => `<rect x="${x - 7}" y="45" width="14" height="10" rx="3" fill="var(--bg)" stroke="${INK}" stroke-width="1.6"/><path d="M${x - 3} 55 l-2 4 l5 -4" fill="var(--bg)" stroke="${INK}" stroke-width="1.4"/><circle cx="${x - 3}" cy="50" r="1" fill="${INK}"/><circle cx="${x}" cy="50" r="1" fill="${INK}"/><circle cx="${x + 3}" cy="50" r="1" fill="${INK}"/>`,
      (x) => `<rect x="${x - 1.2}" y="47" width="2.4" height="12" rx="1" fill="var(--art-dirt)"/><rect x="${x - 6}" y="44" width="12" height="4.5" rx="1" fill="${GRAY}" stroke="${INK}" stroke-width="1"/>`,
      (x) => `<line x1="${x + 4}" y1="43" x2="${x - 1}" y2="54" stroke="var(--art-dirt)" stroke-width="2.2" stroke-linecap="round"/><path d="M${x - 5} 53 l8 3 l-3 6 l-9 -3z" fill="${YEL}" stroke="${INK}" stroke-width="1"/>`,
    ];
    let g = `<line x1="16" y1="52" x2="144" y2="52" stroke="${GRAY}" stroke-width="3"/>`;
    ['출근', '체조', 'TBM', '작업', '정리'].forEach((t, i) => { const x = 16 + i * 32; g += `<circle cx="${x}" cy="52" r="13" fill="${i === 2 ? YEL : 'var(--bg)'}" stroke="${INK}" stroke-width="2"/>` + ic[i](x) + txt(x, 80, t, 10) + txt(x, 30, i + 1, 9, GRAY); });
    return svg(g);
  },
  process: () => {
    const stage = (x, k) => {
      let g = `<rect x="${x}" y="84" width="30" height="6" fill="${CON}" stroke="${INK}" stroke-width="1.2"/>`;
      if (k >= 1) g += `<rect x="${x + 2}" y="54" width="4" height="30" fill="${CON}"/><rect x="${x + 24}" y="54" width="4" height="30" fill="${CON}"/><rect x="${x}" y="52" width="30" height="4" fill="${CON}"/>`;
      if (k >= 2) g += `<rect x="${x + 2}" y="56" width="26" height="28" fill="var(--skin)" stroke="${INK}" stroke-width="1"/>`;
      if (k >= 3) g += `<rect x="${x + 7}" y="62" width="7" height="8" fill="var(--art-glass)"/><rect x="${x + 17}" y="62" width="7" height="8" fill="var(--art-glass)"/><path d="M${x - 2} 52 L${x + 15} 40 L${x + 32} 52Z" fill="${RED}"/>`;
      return g;
    };
    let g = ground(90);
    ['기초', '골조', '외장', '마감'].forEach((t, k) => { const x = 6 + k * 39; g += stage(x, k) + txt(x + 15, 104, t, 10); if (k < 3) g += arrow(x + 31, 30, x + 39, 30, GRAY); });
    return svg(g);
  },
  people: () => svg(ground() + person(32, 92, { helmet: 'var(--bg)', point: true }) + person(80, 92, { helmet: BLUE, vest: true }) + person(126, 92, { helmet: YEL, vest: true })
    + txt(32, 22, '소장·관리감독자', 8.5) + txt(80, 22, '반장', 9) + txt(126, 22, '나(근로자)', 9)
    + `<path d="M44 40 h14 l-4 -3 m4 3 l-4 3" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M92 40 h14 l-4 -3 m4 3 l-4 3" stroke="${INK}" stroke-width="1.6" fill="none"/>`),
  safetymgr: () => svg(ground() + person(62, 92, { helmet: 'var(--bg)', vest: true, hold: true }) + `<rect x="70" y="58" width="16" height="20" rx="2" fill="var(--bg)" stroke="${INK}" stroke-width="1.6"/><path d="M73 64 l2 2 4 -4 M73 71 l2 2 4 -4" stroke="${GRN}" stroke-width="1.6" fill="none"/>`
    + warn(122, 70, 1.4) + txt(62, 24, '안전관리자', 10)),
  // 작업 전 안전점검회의(TBM): 둘러선 사람들 + 위험 표시 말풍선
  tbm: () => svg(ground() + person(38, 94, { helmet: 'var(--bg)', point: true }) + person(80, 96, { vest: true }) + person(122, 94, { vest: true })
    + `<rect x="52" y="10" width="58" height="30" rx="8" fill="var(--bg)" stroke="${INK}" stroke-width="1.5"/><path d="M60 40 l-6 9 l13 -9z" fill="var(--bg)" stroke="${INK}" stroke-width="1.5"/>` + warn(62, 26, 0.75)
    + txt(90, 30, '오늘 위험', 8.5) + txt(80, 106, 'TBM', 9, BLUE)),

  /* ---------- 레슨 2: 용어·장비 ---------- */
  scaffold: () => svg(ground() + building(92, 96, 56, 76, 4) + scaffoldAt(44, 96, 40, 72, 3) + person(64, 72, { scale: 0.7 })),
  platform: () => svg(ground() + `<rect x="20" y="58" width="120" height="8" fill="var(--art-wood)" stroke="${INK}" stroke-width="1.5"/>${[30, 55, 80, 105, 130].map((x) => `<line x1="${x}" y1="58" x2="${x}" y2="66" stroke="${INK}" stroke-width=".8"/>`).join('')}<line x1="26" y1="66" x2="26" y2="96" stroke="${GRAY}" stroke-width="3"/><line x1="134" y1="66" x2="134" y2="96" stroke="${GRAY}" stroke-width="3"/>` + person(80, 58, { scale: 0.75 })),
  rail: () => svg(ground() + `<rect x="10" y="70" width="140" height="8" fill="${CON}" stroke="${INK}" stroke-width="1.2"/><line x1="18" y1="70" x2="18" y2="40" stroke="${YEL}" stroke-width="3"/><line x1="80" y1="70" x2="80" y2="40" stroke="${YEL}" stroke-width="3"/><line x1="142" y1="70" x2="142" y2="40" stroke="${YEL}" stroke-width="3"/><line x1="14" y1="42" x2="146" y2="42" stroke="${YEL}" stroke-width="3.4"/><line x1="14" y1="56" x2="146" y2="56" stroke="${YEL}" stroke-width="3"/><rect x="14" y="64" width="132" height="6" fill="${ORG}"/>`
    + txt(110, 36, '상부 난간대', 7.5) + txt(110, 52, '중간 난간대', 7.5) + txt(46, 88, '발끝막이판', 7.5)),
  opening: () => svg(`<rect x="0" y="40" width="160" height="70" fill="${CON}"/><path d="M40 60 h50 l10 20 h-50z" fill="var(--art-dark)"/>` + warn(126, 60, 1.3) + person(40, 52, { scale: 0.75 })),
  openingCovered: () => svg(`<rect x="0" y="40" width="160" height="70" fill="${CON}"/><path d="M40 60 h50 l10 20 h-50z" fill="var(--art-wood)" stroke="${INK}" stroke-width="1.5"/><text x="70" y="75" font-size="8" font-weight="800" text-anchor="middle" fill="${RED}">개구부 주의</text>` + check(130, 58)),
  formwork: () => svg(ground() + `<rect x="30" y="40" width="100" height="10" fill="var(--art-wood)" stroke="${INK}" stroke-width="1.5"/><rect x="40" y="30" width="80" height="10" fill="${CON}" opacity=".8"/>${[42, 66, 90, 114].map((x) => `<rect x="${x}" y="50" width="4" height="46" fill="${GRAY}" stroke="${INK}" stroke-width=".8"/>`).join('')}` + txt(80, 24, '거푸집 위 콘크리트', 8.5) + txt(140, 76, '동바리', 9, ORG)),
  shore: () => ART.formwork(),
  pour: () => svg(ground() + `<rect x="20" y="72" width="120" height="10" fill="var(--art-wood)" stroke="${INK}" stroke-width="1.4"/><path d="M110 18 Q120 40 100 60" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M98 62 q-14 6 -30 10 h40z" fill="${CON}"/>` + person(56, 72, { scale: 0.75 })),
  lifting: () => svg(ground() + `<line x1="80" y1="0" x2="80" y2="40" stroke="${INK}" stroke-width="2"/><path d="M76 40 h8 v5 q-4 6 -8 0z" fill="${INK}"/><line x1="80" y1="45" x2="60" y2="60" stroke="${INK}" stroke-width="1.4"/><line x1="80" y1="45" x2="100" y2="60" stroke="${INK}" stroke-width="1.4"/><rect x="52" y="60" width="56" height="12" fill="var(--art-wood)" stroke="${INK}" stroke-width="1.4"/>` + arrow(130, 80, 130, 40, ORG)),
  signal: () => svg(ground() + person(60, 92, { vest: true, armsUp: true }) + `<rect x="44" y="44" width="3" height="12" fill="${RED}" transform="rotate(-30 46 50)"/>` + `<rect x="98" y="62" width="44" height="22" rx="4" fill="${YEL}" stroke="${INK}" stroke-width="1.6"/><circle cx="108" cy="88" r="6" fill="${INK}"/><circle cx="132" cy="88" r="6" fill="${INK}"/>`),
  edge: () => svg(`<rect x="0" y="50" width="96" height="60" fill="${CON}"/><rect x="96" y="50" width="64" height="60" fill="var(--art-wall)"/><line x1="96" y1="50" x2="96" y2="110" stroke="${RED}" stroke-width="3" stroke-dasharray="5 4"/>` + person(70, 50, { scale: 0.8 }) + txt(122, 40, '단부', 11, RED)),

  towercrane: () => svg(ground() + `<rect x="40" y="18" width="8" height="78" fill="${YEL}" stroke="${INK}" stroke-width="1.2"/><rect x="14" y="14" width="136" height="6" fill="${YEL}" stroke="${INK}" stroke-width="1.2"/><rect x="14" y="20" width="16" height="10" fill="${GRAY}"/><line x1="118" y1="20" x2="118" y2="58" stroke="${INK}" stroke-width="1.4"/><rect x="104" y="58" width="28" height="9" fill="var(--art-wood)" stroke="${INK}"/>` + `<path d="M104 70 L94 96 H142 L132 70Z" fill="${RED}" opacity=".18"/>`),
  pumptruck: () => svg(ground() + `<rect x="20" y="70" width="80" height="18" rx="3" fill="${ORG}" stroke="${INK}" stroke-width="1.4"/><rect x="96" y="66" width="24" height="22" rx="3" fill="${ORG}" stroke="${INK}" stroke-width="1.4"/><rect x="102" y="70" width="12" height="8" fill="var(--art-glass)"/>${[34, 58, 108].map((x) => `<circle cx="${x}" cy="90" r="6" fill="${INK}"/>`).join('')}<path d="M40 70 L70 30 L120 22 L148 50" stroke="${GRAY}" stroke-width="5" fill="none" stroke-linejoin="round"/><line x1="148" y1="50" x2="148" y2="72" stroke="${INK}" stroke-width="3"/>`),
  excavator: () => svg(ground() + `<rect x="24" y="80" width="64" height="10" rx="5" fill="${INK}"/><rect x="34" y="56" width="48" height="24" rx="3" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/><rect x="38" y="44" width="20" height="16" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/><rect x="41" y="47" width="13" height="9" fill="var(--art-glass)"/><path d="M80 60 L118 34 L140 66" stroke="${YEL}" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M134 64 l14 0 l-4 14 l-12 -4z" fill="${INK}"/>` + `<path d="M58 68 m-46 0 a46 30 0 1 0 92 0" stroke="${RED}" stroke-width="1.6" stroke-dasharray="4 3" fill="none"/>`),
  forklift: () => svg(ground() + `<rect x="40" y="62" width="58" height="24" rx="4" fill="${ORG}" stroke="${INK}" stroke-width="1.4"/><rect x="58" y="40" width="30" height="24" fill="none" stroke="${INK}" stroke-width="2.4"/><rect x="30" y="30" width="5" height="60" fill="${GRAY}"/><rect x="14" y="80" width="24" height="4" fill="${INK}"/><rect x="12" y="64" width="22" height="16" fill="var(--art-wood)" stroke="${INK}"/><circle cx="52" cy="90" r="7" fill="${INK}"/><circle cx="88" cy="90" r="7" fill="${INK}"/>`
    + arrow(104, 76, 132, 76, RED) + person(146, 94, { vest: true, scale: 0.8 })),
  hoist: () => svg(ground() + building(84, 96, 60, 80, 5) + `<rect x="64" y="8" width="6" height="88" fill="${GRAY}" stroke="${INK}" stroke-width=".8"/><rect x="44" y="44" width="22" height="28" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/><rect x="48" y="48" width="14" height="10" fill="var(--art-glass)"/>` + txt(55, 82, '리프트', 8)),
  awp: () => svg(ground() + `<rect x="30" y="82" width="70" height="10" rx="3" fill="${ORG}" stroke="${INK}" stroke-width="1.2"/><circle cx="42" cy="94" r="5" fill="${INK}"/><circle cx="88" cy="94" r="5" fill="${INK}"/><path d="M50 82 L90 52 L60 40" stroke="${GRAY}" stroke-width="5" fill="none"/><rect x="44" y="26" width="34" height="14" fill="none" stroke="${YEL}" stroke-width="3"/>` + person(61, 40, { scale: 0.6, harness: true })),

  /* ---------- 레슨 3: 보호구 ---------- */
  helmetOk: () => svg(person(80, 104, { scale: 2.1 }) + check(132, 24, 11)),
  helmetLoose: () => svg(person(80, 104, { scale: 2.1, strap: false }) + xmark(132, 24, 11)),
  helmetCap: () => svg(person(80, 104, { scale: 2.1, helmet: 'cap' }) + xmark(132, 24, 11)),
  harness: () => svg(scaffoldAt(30, 110, 60, 96, 2) + `<line x1="10" y1="12" x2="150" y2="12" stroke="${INK}" stroke-width="2"/><path d="M68 24 Q74 18 76 12" stroke="${ORG}" stroke-width="2.2" fill="none"/><circle cx="76" cy="12" r="3" fill="none" stroke="${INK}" stroke-width="1.8"/>` + person(62, 62, { harness: true }) + txt(118, 24, '안전대 부착설비', 8) + txt(118, 70, '2m 이상', 11, RED)),
  shoes: () => svg(ground() + `<path d="M30 86 v-22 h28 v14 q28 2 34 10 v6 h-62z" fill="var(--art-dirt-dark)" stroke="${INK}" stroke-width="1.6"/><path d="M72 80 q14 1 20 8" stroke="var(--art-tan)" stroke-width="3" fill="none"/>` + `<rect x="104" y="50" width="30" height="10" fill="${GRAY}" transform="rotate(20 119 55)"/>` + arrow(120, 30, 100, 62, RED)),
  faceshield: () => svg(ground() + person(70, 92, { hold: true }) + `<rect x="60" y="45" width="20" height="14" rx="3" fill="var(--ink-2)" opacity=".9"/>${[[96, 60], [104, 52], [110, 66], [100, 72], [116, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${ORG}"/>`).join('')}<rect x="82" y="64" width="16" height="4" fill="${GRAY}"/>`),
  lastline: () => svg(`<rect x="0" y="60" width="160" height="50" fill="${CON}"/>` + `<line x1="14" y1="60" x2="14" y2="30" stroke="${YEL}" stroke-width="3"/><line x1="146" y1="60" x2="146" y2="30" stroke="${YEL}" stroke-width="3"/><line x1="10" y1="32" x2="150" y2="32" stroke="${YEL}" stroke-width="3.4"/><line x1="10" y1="46" x2="150" y2="46" stroke="${YEL}" stroke-width="3"/>`
    + txt(80, 22, '① 난간·덮개(시설)', 9) + person(80, 92, { harness: true, scale: 0.8 }) + txt(126, 82, '② 보호구', 9)),

  /* ---------- 레슨 4: 사고 유형 ---------- */
  fall: () => svg(`<rect x="0" y="34" width="70" height="76" fill="${CON}"/><line x1="70" y1="34" x2="70" y2="110" stroke="${RED}" stroke-width="2" stroke-dasharray="4 3"/>` + person(98, 78, { rot: 150, helmet: YEL }) + arrow(118, 46, 118, 94, RED) + xmark(30, 22)),
  struck: () => svg(ground() + `<line x1="80" y1="0" x2="80" y2="22" stroke="${INK}" stroke-width="2"/><rect x="62" y="22" width="36" height="9" fill="var(--art-wood)" stroke="${INK}"/><rect x="88" y="44" width="12" height="5" fill="${GRAY}" transform="rotate(30 94 46)"/>` + arrow(100, 36, 98, 62, RED) + person(90, 96, {})),
  machine: () => svg(ground() + `<rect x="16" y="80" width="54" height="10" rx="5" fill="${INK}"/><rect x="22" y="56" width="44" height="24" rx="3" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/><rect x="24" y="44" width="18" height="14" fill="${YEL}" stroke="${INK}" stroke-width="1.4"/>` + arrow(70, 66, 98, 66, RED) + person(118, 92, { vest: true }) + `<path d="M76 46 q8 -10 18 0" stroke="${RED}" stroke-width="2" fill="none"/>`),
  collapse: () => svg(ground() + `<path d="M24 40 L136 50 L136 58 L24 48Z" fill="var(--art-wood)" stroke="${INK}" stroke-width="1.4"/>${[36, 64].map((x) => `<rect x="${x}" y="50" width="4" height="46" fill="${GRAY}"/>`).join('')}<path d="M96 56 q8 18 -2 40" stroke="${GRAY}" stroke-width="4" fill="none"/><path d="M118 58 q-10 20 4 38" stroke="${GRAY}" stroke-width="4" fill="none"/>` + warn(108, 30, 1.2)),
  electric: () => svg(ground() + `<path d="M0 84 Q40 70 70 86 T160 80" stroke="${INK}" stroke-width="4" fill="none"/><path d="M66 84 q4 -4 8 0" stroke="${ORG}" stroke-width="5" fill="none"/><path d="M70 50 l-8 14 h8 l-6 14" stroke="${YEL}" stroke-width="3.4" fill="none" stroke-linejoin="round"/>` + warn(124, 44, 1.4)),

  /* ---------- 레슨 5: 불·질식·다쳤을 때 ---------- */
  spark: () => svg(ground() + person(46, 92, { hold: true }) + `<rect x="36" y="45" width="20" height="14" rx="3" fill="var(--ink-2)"/>${[[72, 70], [84, 76], [96, 82], [90, 66], [106, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${ORG}"/>`).join('')}<rect x="112" y="76" width="34" height="20" fill="var(--bg-soft)" stroke="${INK}" stroke-width="1.2"/>` + txt(129, 106, '단열재', 8) + `<path d="M120 76 q4 -12 8 -4 q4 -10 8 0" fill="${ORG}"/>`),
  extinguisher: () => svg(ground() + `<rect x="66" y="40" width="28" height="56" rx="10" fill="${RED}" stroke="${INK}" stroke-width="1.6"/><rect x="72" y="30" width="16" height="12" fill="${INK}"/><path d="M88 34 q22 0 20 20" stroke="${INK}" stroke-width="3" fill="none"/><rect x="72" y="56" width="16" height="14" fill="var(--bg)"/>` + txt(80, 66, '소화기', 6.5, RED)),
  evacuate: () => svg(`<rect width="160" height="44" fill="var(--art-steel)" opacity=".55"/>` + ground() + `<path d="M110 96 h12 v-12 h12 v-12 h12 v-12" stroke="${INK}" stroke-width="3" fill="none"/>` + person(70, 96, { rot: 25, scale: 0.9 }) + arrow(86, 80, 112, 80, GRN) + `<rect x="8" y="58" width="30" height="16" rx="2" fill="${GRN}"/><text x="23" y="69" font-size="8" fill="var(--bg)" text-anchor="middle" font-weight="800">비상구</text>`),
  manhole: () => svg(ground(60) + `<ellipse cx="80" cy="64" rx="30" ry="8" fill="var(--art-dark)"/><rect x="50" y="64" width="60" height="46" fill="var(--art-dark)"/>` + person(80, 104, { scale: 0.7, rot: 70 }) + txt(80, 40, 'O₂ 부족?', 11, RED) + warn(132, 30, 1.2)),
  // 폭염: 해 + 온도계 + 그늘
  heat: () => svg(ground() + `<circle cx="34" cy="28" r="13" fill="${ORG}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="34" y1="9" x2="34" y2="4" stroke="${ORG}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${a} 34 28)"/>`).join('')}`
    + `<rect x="64" y="14" width="10" height="52" rx="5" fill="var(--bg)" stroke="${INK}" stroke-width="1.6"/><rect x="66.5" y="30" width="5" height="36" fill="${RED}"/><circle cx="69" cy="70" r="8" fill="${RED}" stroke="${INK}" stroke-width="1.6"/>` + txt(69, 92, '33도', 10, RED)
    + `<path d="M96 46 h56 l-6 -14 h-44z" fill="${GRN}"/><rect x="122" y="46" width="4" height="50" fill="${GRAY}"/>` + person(110, 96, { scale: 0.75 }) + txt(124, 26, '그늘·휴식', 9)),
  injury: () => svg(ground() + person(52, 96, { rot: 90, scale: 0.9 }) + person(108, 92, { point: true }) + `<rect x="120" y="40" width="30" height="20" rx="6" fill="var(--bg)" stroke="${INK}" stroke-width="1.4"/>` + txt(135, 54, '119', 10, RED)),

  /* ---------- 레슨 6: 멈추고 알리기 ---------- */
  stop: () => svg(ground() + person(60, 92, { armsUp: true }) + `<circle cx="116" cy="50" r="24" fill="${RED}"/><path d="M104 52 v-10 q0 -3 3 -3 q3 0 3 3 v-4 q0 -3 3 -3 q3 0 3 3 v2 q0 -3 3 -3 q3 0 3 3 v14 q0 10 -10 10 q-10 0 -11 -8z" fill="var(--bg)"/>`),
  report: () => svg(ground() + person(48, 92, { point: true }) + person(112, 92, { helmet: 'var(--bg)' }) + `<rect x="58" y="18" width="62" height="24" rx="8" fill="var(--bg)" stroke="${INK}" stroke-width="1.4"/><path d="M66 42 l-4 8 l10 -8z" fill="var(--bg)" stroke="${INK}" stroke-width="1.4"/>` + txt(89, 34, '위험해요!', 10, RED)),
  protect: () => svg(`<path d="M80 14 L120 28 V56 Q120 86 80 100 Q40 86 40 56 V28Z" fill="${BLUE}" stroke="${INK}" stroke-width="2"/>` + `<path d="M64 56 l12 12 l22 -24" stroke="var(--bg)" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  duty: () => svg(ground() + person(54, 92, { harness: true, vest: true }) + `<rect x="92" y="24" width="52" height="62" rx="4" fill="var(--bg)" stroke="${INK}" stroke-width="1.6"/>${[38, 54, 70].map((y, i) => check(104, y, 6) + `<rect x="114" y="${y - 2}" width="24" height="4" fill="${GRAY}"/>`).join('')}`),
  riskassess: () => svg(`<rect x="56" y="10" width="48" height="90" rx="8" fill="${INK}"/><rect x="60" y="18" width="40" height="70" rx="3" fill="var(--bg)"/>` + warn(80, 46, 1.4) + `<rect x="66" y="66" width="28" height="10" rx="3" fill="${BLUE}"/>` + txt(80, 74, '신고', 7, 'var(--bg)') + person(28, 104, { scale: 0.7 }) + person(132, 104, { scale: 0.7, helmet: 'var(--bg)' })),
};

// 보호구 입혀보기용 인물 (선택에 따라 바뀜)
export function dressFigure({ helmet = null, harness = false, shoes = null } = {}) {
  const h = helmet === 'ok' ? YEL : helmet === 'loose' ? YEL : helmet === 'cap' ? 'cap' : null;
  return svg(scaffoldAt(96, 110, 50, 96, 2) + person(60, 104, { scale: 2, helmet: h, strap: helmet !== 'loose', harness, shoes: shoes || 'none' }) + txt(121, 14, '3층 비계 작업', 8));
}

// 이름으로 그림 가져오기. 없는 이름이면 빈 그림
export const art = (id) => (ART[id] ? ART[id]() : svg(''));
