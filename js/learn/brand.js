// 첫 삽 v12 — 로고 · 안내 캐릭터 "삽이" · 건물 진도 (직접 그린 SVG, 글자 없음)
const NAVY = '#16264a', NAVY7 = '#1f3360', DIRT = '#8a5a34', DIRT2 = '#a8744a', STEEL = '#c9d1dc', WOOD = '#d9a36b', HELMET = '#f2c230', GREEN = '#12805c';

// 로고: 삽이 땅을 한 번 떠서 흙 한 덩이를 든 모습 (글자 없이 알아볼 수 있게)
export function logoMark({ size = 96, bg = null } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">${bg ? `<rect width="96" height="96" rx="22" fill="${bg}"/>` : ''}
  <g class="lg-ground"><path d="M14 74 Q48 66 82 74 L82 80 L14 80Z" fill="${DIRT}"/></g>
  <g class="lg-shovel" transform="rotate(-38 48 48)">
    <rect x="45.5" y="10" width="5" height="40" rx="2.5" fill="${WOOD}"/>
    <path d="M40 8 h16 a3 3 0 0 1 0 6 h-16 a3 3 0 0 1 0-6z" fill="${WOOD}"/>
    <path d="M38 50 h20 v10 c0 8-4.5 14-10 17 c-5.5-3-10-9-10-17z" fill="${STEEL}"/>
    <path d="M40.5 53 h15 v6 c0 4-3 7.5-7.5 10 c-4.5-2.5-7.5-6-7.5-10z" fill="${DIRT2}" class="lg-clod"/>
  </g></svg>`;
}

// 안내 캐릭터 "삽이": 안전모를 쓴 작은 삽. mood: 'hi' | 'cheer' | 'think'
export function sapi({ size = 72, mood = 'hi' } = {}) {
  const mouth = mood === 'cheer' ? '<path d="M40 50 q8 8 16 0" fill="#3b2a1d"/>' : mood === 'think' ? '<path d="M42 52 h12" stroke="#3b2a1d" stroke-width="2.5" stroke-linecap="round"/>' : '<path d="M41 50 q7 6 14 0" fill="none" stroke="#3b2a1d" stroke-width="2.5" stroke-linecap="round"/>';
  const arm = mood === 'cheer' ? '<path d="M28 52 l-10 -12" stroke="' + WOOD + '" stroke-width="4" stroke-linecap="round"/><path d="M68 52 l10 -12" stroke="' + WOOD + '" stroke-width="4" stroke-linecap="round"/>'
    : '<path d="M28 54 l-9 6" stroke="' + WOOD + '" stroke-width="4" stroke-linecap="round"/><path d="M68 52 l9 -9" stroke="' + WOOD + '" stroke-width="4" stroke-linecap="round"/>';
  return `<svg class="sapi" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">
  <rect x="45" y="70" width="6" height="20" rx="3" fill="${WOOD}"/>
  ${arm}
  <path d="M26 30 h44 v26 c0 12-10 20-22 24 c-12-4-22-12-22-24z" fill="${STEEL}" stroke="#9aa6b6" stroke-width="2"/>
  <circle cx="40" cy="44" r="3.4" fill="#1f2937"/><circle cx="56" cy="44" r="3.4" fill="#1f2937"/>
  <circle cx="34" cy="51" r="3" fill="#f3b3a5" opacity=".7"/><circle cx="62" cy="51" r="3" fill="#f3b3a5" opacity=".7"/>
  ${mouth}
  <path d="M24 31 a24 18 0 0 1 48 0z" fill="${HELMET}"/><rect x="20" y="29" width="56" height="5" rx="2.5" fill="${HELMET}"/><rect x="45" y="13" width="6" height="12" rx="3" fill="#e0ad1a"/>
  <path d="M30 34 q18 10 36 0" fill="none" stroke="#7a5a12" stroke-width="1.6"/>
  </svg>`;
}

// 건물 진도: 6층. done 층만큼 지어지고, rising 번째 층은 올라오는 애니메이션, 다 지으면 초록 준공 깃발
export function building({ done = 0, total = 6, rising = -1 } = {}) {
  const W = 220, H = 150, fw = 84, fh = 15, x0 = (W - fw) / 2, base = 128;
  let floors = '';
  for (let i = 0; i < total; i++) {
    const y = base - (i + 1) * fh;
    if (i < done) {
      const cls = i === rising ? ' class="bd-rise"' : '';
      let win = ''; for (let k = 0; k < 4; k++) win += `<rect x="${x0 + 8 + k * 19}" y="${y + 4}" width="11" height="7" rx="1.5" fill="#cfe0f5"/>`;
      floors += `<g${cls}><rect x="${x0}" y="${y}" width="${fw}" height="${fh}" fill="#e9edf5" stroke="${NAVY7}" stroke-width="1.6"/>${win}</g>`;
    } else floors += `<rect x="${x0}" y="${y}" width="${fw}" height="${fh}" fill="none" stroke="#b8c0cc" stroke-width="1.3" stroke-dasharray="4 4"/>`;
  }
  const topY = base - Math.max(done, 0) * fh;
  const flag = done >= total ? `<g class="bd-flag"><path d="M${W / 2} ${topY} v-24" stroke="${NAVY}" stroke-width="2.4"/><path d="M${W / 2} ${topY - 24} h20 l-5 6 l5 6 h-20z" fill="${GREEN}"/></g>` : '';
  const crane = done < total ? `<g opacity=".9"><path d="M${x0 + fw + 22} ${base} V${base - 112}" stroke="${NAVY7}" stroke-width="3"/><path d="M${x0 + fw + 22} ${base - 110} H${x0 - 6}" stroke="${NAVY7}" stroke-width="3"/><path d="M${x0 + fw + 22} ${base - 110} h16" stroke="${NAVY7}" stroke-width="3"/><path d="M${x0 + 20} ${base - 110} V${Math.min(topY - 14, base - 30)}" stroke="#6b7280" stroke-width="1.3"/><rect x="${x0 + 12}" y="${Math.min(topY - 14, base - 30)}" width="16" height="6" rx="1.5" fill="${WOOD}"/></g>` : '';
  return `<svg class="bd" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">
  <path d="M0 ${base} H${W}" stroke="${DIRT}" stroke-width="3"/><rect x="0" y="${base + 1.5}" width="${W}" height="${H - base}" fill="#efe6db"/>
  <path d="M${W / 2 - 74} ${base + 8} q4 -6 10 0" stroke="${DIRT2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${crane}${floors}${flag}</svg>`;
}
