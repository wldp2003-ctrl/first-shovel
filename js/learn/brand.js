// 첫 삽 v12.1 — 로고 · 안내 캐릭터 첫삽이(mascot.js) · 건물 진도 (직접 그린 SVG, 글자 없음)
import { renderMascot } from './mascot.js';
const NAVY = 'var(--ink)', NAVY7 = 'var(--ink)', DIRT = 'var(--art-dirt)', DIRT2 = 'var(--art-wood-dark)', STEEL = 'var(--art-concrete)', WOOD = 'var(--art-tan)', HELMET = 'var(--caution)', GREEN = 'var(--safe)';

// 로고(v12.1): 주황 삽이 땅(남색 선)을 한 번 떠서 흙 한 덩이를 든 모습. 윤곽선은 남색
// onBrand: 앱 아이콘용 — 주황 바탕 위에 흰 삽
export function logoMark({ size = 96, onBrand = false } = {}) {
  const blade = onBrand ? 'var(--bg)' : 'var(--brand)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">${onBrand ? '<rect width="96" height="96" fill="var(--brand)"/>' : ''}
  <g class="lg-ground"><path d="M12 78 Q48 70 84 78" fill="none" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/></g>
  <g class="lg-shovel" transform="rotate(-38 48 48)">
    <path d="M38 9 H58" stroke="var(--ink)" stroke-width="11" stroke-linecap="round"/><path d="M38 9 H58" stroke="${blade}" stroke-width="4" stroke-linecap="round"/>
    <path d="M48 9 V50" stroke="var(--ink)" stroke-width="11" stroke-linecap="round"/><path d="M48 9 V50" stroke="${blade}" stroke-width="4" stroke-linecap="round"/>
    <path d="M36 48 H60 V60 C60 69 55 75 48 79 C41 75 36 69 36 60 Z" fill="${blade}" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round"/>
    <path class="lg-clod" d="M40 50 C42 43 47 40 51 42 C55 39 59 44 56 49 Z" fill="var(--art-dirt)" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round"/>
  </g></svg>`;
}

// 안내 캐릭터 → v12.1 "첫삽이" (js/learn/mascot.js). 예전 호출 sapi({ size, mood })를 그대로 쓰게 이어 준다
// mood: hi(기본) | cheer(기쁨·완료) | think(생각·빈 화면) | worry(오답) | firm(멈춰요) | proud(완료·확인서)
// 56px 이하는 머리만 크게 (전신은 얼굴이 16px 정도라 표정이 안 보임)
export function sapi({ size = 72, mood = 'hi', cls = '' } = {}) {
  const M = { hi: ['stand', 'basic'], cheer: [size >= 80 ? 'proud' : 'thumb', size >= 80 ? 'proud' : 'joy'], think: ['stand', 'think'], worry: ['stand', 'worry'], firm: ['stop', 'firm'], proud: ['proud', 'proud'], wave: ['wave', 'joy'] };
  const [pose, face] = M[mood] || M.hi;
  return renderMascot({ pose, face, size, head: size <= 56, cls });
}

// 건물 진도: 6층. done 층만큼 지어지고, rising 번째 층은 올라오는 애니메이션, 다 지으면 초록 준공 깃발
export function building({ done = 0, total = 6, rising = -1 } = {}) {
  const W = 220, H = 150, fw = 84, fh = 15, x0 = (W - fw) / 2, base = 128;
  let floors = '';
  for (let i = 0; i < total; i++) {
    const y = base - (i + 1) * fh;
    if (i < done) {
      const cls = i === rising ? ' class="bd-rise"' : '';
      let win = ''; for (let k = 0; k < 4; k++) win += `<rect x="${x0 + 8 + k * 19}" y="${y + 4}" width="11" height="7" rx="1.5" fill="var(--art-wall)"/>`;
      floors += `<g${cls}><rect x="${x0}" y="${y}" width="${fw}" height="${fh}" fill="var(--art-sky)" stroke="${NAVY7}" stroke-width="1.6"/>${win}</g>`;
    } else floors += `<rect x="${x0}" y="${y}" width="${fw}" height="${fh}" fill="none" stroke="var(--art-concrete)" stroke-width="1.3" stroke-dasharray="4 4"/>`;
  }
  const topY = base - Math.max(done, 0) * fh;
  const flag = done >= total ? `<g class="bd-flag"><path d="M${W / 2} ${topY} v-24" stroke="${NAVY}" stroke-width="2.4"/><path d="M${W / 2} ${topY - 24} h20 l-5 6 l5 6 h-20z" fill="${GREEN}"/></g>` : '';
  const crane = done < total ? `<g opacity=".9"><path d="M${x0 + fw + 22} ${base} V${base - 112}" stroke="${NAVY7}" stroke-width="3"/><path d="M${x0 + fw + 22} ${base - 110} H${x0 - 6}" stroke="${NAVY7}" stroke-width="3"/><path d="M${x0 + fw + 22} ${base - 110} h16" stroke="${NAVY7}" stroke-width="3"/><path d="M${x0 + 20} ${base - 110} V${Math.min(topY - 14, base - 30)}" stroke="var(--ink-2)" stroke-width="1.3"/><rect x="${x0 + 12}" y="${Math.min(topY - 14, base - 30)}" width="16" height="6" rx="1.5" fill="${WOOD}"/></g>` : '';
  return `<svg class="bd" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">
  <path d="M0 ${base} H${W}" stroke="${DIRT}" stroke-width="3"/><rect x="0" y="${base + 1.5}" width="${W}" height="${H - base}" fill="var(--line)"/>
  <path d="M${W / 2 - 74} ${base + 8} q4 -6 10 0" stroke="${DIRT2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${crane}${floors}${flag}</svg>`;
}
