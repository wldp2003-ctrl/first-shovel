// 첫 삽 v17 — 현장 소품 모음 (직접 모델링, 외부 에셋 없음). 지도(site3d)와 위험 장면(scene3d)이 같은 소품을 쓴다
// P 는 조립 도구: box(w,h,d,c,x,y,z,ry) · cyl(r,h,c,x,y,z) · cone(r,h,c,x,y,z) · rod([x,y,z],[x,y,z],r,c) · group(fn,x,y,z,ry)
//   y 는 물체 바닥 높이, 색은 css/tokens.css 토큰 이름(--art-* 등)만. 글자·로고 없음.
// 각 소품은 P 와 위치를 받아 그린다. 단위 m.

// 사람 (작은 인형: 지도용). 보호구가 또렷이 — 노랑 안전모, 주황 조끼 + 흰 반사띠, 안전대(선택)
export function doll(P, x, z, o = {}, y = 0) {
  P.group(() => {
    const hip = o.sit ? 0.45 : 0.85;
    if (!o.sit) { P.box(0.16, hip, 0.2, '--art-dark', -0.11, 0, 0); P.box(0.16, hip, 0.2, '--art-dark', 0.11, 0, 0); }
    else P.box(0.4, 0.2, 0.5, '--art-dark', 0, 0.25, 0.15);
    P.box(0.44, 0.6, 0.28, '--art-shirt', 0, hip, 0);
    if (o.vest !== false) { P.box(0.46, 0.46, 0.3, '--vest', 0, hip + 0.06, 0); P.box(0.47, 0.06, 0.31, '--bg', 0, hip + 0.2, 0); P.box(0.47, 0.06, 0.31, '--bg', 0, hip + 0.34, 0); }
    if (o.harness) { P.box(0.08, 0.6, 0.33, '--brand', -0.12, hip, 0); P.box(0.08, 0.6, 0.33, '--brand', 0.12, hip, 0); }
    const arm = o.arm || 0; // 0 차렷, 1 한 팔 듦
    P.box(0.12, 0.55, 0.14, '--art-shirt', -0.29, hip + 0.04, 0);
    if (arm) P.box(0.12, 0.55, 0.14, '--art-shirt', 0.29, hip + 0.6, 0); else P.box(0.12, 0.55, 0.14, '--art-shirt', 0.29, hip + 0.04, 0);
    P.box(0.26, 0.26, 0.26, '--skin', 0, hip + 0.6, 0);
    if (o.helmet !== false) { P.box(0.34, 0.14, 0.34, o.helmet === 'white' ? '--bg' : '--brand', 0, hip + 0.84, 0); P.box(0.4, 0.03, 0.4, o.helmet === 'white' ? '--bg' : '--brand', 0, hip + 0.82, 0.03); }
    else P.box(0.28, 0.08, 0.28, '--art-dark', 0, hip + 0.86, 0);
  }, x, y, z, o.ry || 0);
}

// 컨테이너 사무실 (6 × 2.4, 높이 2.6)
export function container(P, x, z, ry = 0) {
  P.group(() => {
    P.box(6, 2.5, 2.4, '--art-wall', 0, 0.1, 0);
    P.box(6.1, 0.12, 2.5, '--art-concrete-dark', 0, 2.6, 0);
    for (const k of [-2.9, 2.9]) P.box(0.12, 2.6, 2.5, '--art-concrete-dark', k, 0.05, 0);
    P.box(1.4, 0.9, 0.05, '--art-glass', -1.6, 1.2, 1.22); P.box(1.4, 0.9, 0.05, '--art-glass', 1.8, 1.2, 1.22);
    P.box(0.9, 2.0, 0.05, '--art-steel', 0.2, 0.1, 1.22);
    P.box(6, 0.1, 2.4, '--asphalt-2', 0, 0, 0);
  }, x, 0, z, ry);
}
// 안전펜스 (가림막) 한 줄: 기둥 + 판 + 아래 노랑·검정 띠 무늬
export function fence(P, x0, z0, x1, z1, h = 1.8) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2)), ry = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, w = len / n;
    P.group(() => { P.box(w - 0.06, h - 0.3, 0.08, '--art-wall', 0, 0.3, 0); P.box(w - 0.06, 0.3, 0.09, i % 2 ? '--brand' : '--asphalt', 0, 0, 0); P.box(0.1, h + 0.1, 0.12, '--art-steel', -w / 2, 0, 0); }, x, 0, z, ry);
  }
}
export function cone(P, x, z) { P.box(0.42, 0.05, 0.42, '--asphalt', x, 0, z); P.cone(0.17, 0.7, '--vest', x, 0.05, z); P.cyl(0.11, 0.1, '--bg', x, 0.33, z); }
// A형 바리케이드 (노랑·검정)
export function barrier(P, x, z, ry = 0) { P.group(() => { P.box(1.6, 0.22, 0.06, '--brand', 0, 0.75, 0); P.box(1.6, 0.22, 0.06, '--asphalt', 0, 0.5, 0); for (const k of [-0.75, 0.75]) P.box(0.08, 1.0, 0.5, '--art-steel', k, 0, 0); }, x, 0, z, ry); }
// 표지판: kind 'mandatory'(파랑 원)·'caution'(노랑)·'danger'(빨강) — 색과 모양만, 글자 없음
export function sign(P, x, z, kind = 'mandatory', ry = 0) {
  P.group(() => {
    P.box(0.08, 1.6, 0.08, '--art-steel', 0, 0, 0);
    P.box(0.9, 0.9, 0.05, '--bg', 0, 1.2, 0.05);
    if (kind === 'mandatory') P.group(() => P.cyl(0.32, 0.04, '--mandatory', 0, 0, 0), 0, 1.65, 0.08, 0, Math.PI / 2);
    else P.box(0.6, 0.55, 0.04, kind === 'caution' ? '--caution' : '--danger', 0, 1.37, 0.09);
  }, x, 0, z, ry);
}
// TBM 게시판 (위험성평가표 자리)
export function board(P, x, z, ry = 0) { P.group(() => { for (const k of [-1, 1]) P.box(0.1, 2.2, 0.1, '--art-steel', k, 0, 0); P.box(2.3, 1.2, 0.08, '--bg', 0, 1.0, 0); P.box(2.3, 0.18, 0.1, '--mandatory', 0, 2.05, 0); for (let r = 0; r < 4; r++) P.box(1.9, 0.05, 0.09, '--line', 0, 1.25 + r * 0.22, 0.01); }, x, 0, z, ry); }
// 철근 묶음 (받침목 위)
export function rebar(P, x, z, ry = 0, len = 4) { P.group(() => { for (const k of [-1.4, 0, 1.4]) P.box(0.12, 0.12, 0.9, '--art-wood-dark', k * len / 4, 0, 0); for (let i = 0; i < 12; i++) P.rod([-len / 2, 0.16 + (i % 3) * 0.06, -0.3 + Math.floor(i / 3) * 0.15], [len / 2, 0.16 + (i % 3) * 0.06, -0.3 + Math.floor(i / 3) * 0.15], 0.03, '--art-rebar'); }, x, 0, z, ry); }
// 각재 더미
export function lumber(P, x, z, ry = 0) { P.group(() => { for (let r = 0; r < 4; r++) for (let c = 0; c < 5 - r % 2; c++) P.box(3, 0.1, 0.1, r % 2 ? '--art-wood-dark' : '--art-wood', 0, r * 0.11, -0.3 + c * 0.14 + (r % 2) * 0.07); }, x, 0, z, ry); }
// 합판 더미
export function plywood(P, x, z, ry = 0, n = 6) { P.group(() => { P.box(2.4, 0.12, 1.2, '--art-wood-dark', 0, 0, 0); for (let i = 0; i < n; i++) P.box(2.4, 0.05, 1.2, i % 2 ? '--art-wood' : '--art-tan', 0, 0.12 + i * 0.05, 0); }, x, 0, z, ry); }
// 파이프 더미 (비계 강관)
export function pipes(P, x, z, ry = 0) { P.group(() => { for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) P.rod([-1.8, 0.06 + r * 0.1, -0.2 + c * 0.11 + r * 0.055], [1.8, 0.06 + r * 0.1, -0.2 + c * 0.11 + r * 0.055], 0.05, '--art-steel'); }, x, 0, z, ry); }
// 팔레트 (+ 시멘트 포대)
export function pallet(P, x, z, ry = 0, bags = true) { P.group(() => { P.box(1.2, 0.14, 1.0, '--art-wood', 0, 0, 0); if (bags) for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) P.box(0.56, 0.16, 0.9, '--art-wall', -0.29 + c * 0.58, 0.14 + r * 0.17, 0); }, x, 0, z, ry); }
export function drum(P, x, z, c = '--mandatory') { P.cyl(0.3, 0.9, c, x, 0, z); P.cyl(0.31, 0.04, '--art-steel', x, 0.3, z); P.cyl(0.31, 0.04, '--art-steel', x, 0.6, z); }
export function extinguisher(P, x, z) { P.cyl(0.11, 0.5, '--danger', x, 0, z); P.box(0.1, 0.1, 0.1, '--asphalt', x, 0.5, z); }
// 물통 (식수대)
export function water(P, x, z) { P.box(0.5, 0.8, 0.5, '--bg', x, 0, z); P.cyl(0.2, 0.45, '--art-glass', x, 0.8, z); }
// 그늘막 (초록 천막)
export function shade(P, x, z, w = 3, d = 3) { for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(0.08, 2.3, 0.08, '--art-steel', x + dx * w / 2, 0, z + dz * d / 2); P.box(w + 0.3, 0.08, d + 0.3, '--safe', x, 2.3, z); }
// 간이 화장실
export function toilet(P, x, z, ry = 0) { P.group(() => { P.box(1.1, 2.2, 1.1, '--mandatory', 0, 0, 0); P.box(1.2, 0.1, 1.2, '--bg', 0, 2.2, 0); P.box(0.7, 1.7, 0.03, '--mandatory-dark', 0, 0.2, 0.56); }, x, 0, z, ry); }
// 외바퀴 수레
export function barrow(P, x, z, ry = 0) { P.group(() => { P.box(0.7, 0.3, 0.9, '--mandatory', 0, 0.35, 0); P.cyl(0.18, 0.08, '--asphalt', 0, 0.02, 0.6); P.rod([-0.3, 0.4, -0.4], [-0.35, 0.6, -1.1], 0.03, '--art-steel'); P.rod([0.3, 0.4, -0.4], [0.35, 0.6, -1.1], 0.03, '--art-steel'); }, x, 0, z, ry); }
// 용접기 (발전기형)
export function welder(P, x, z, ry = 0) { P.group(() => { P.box(0.8, 0.6, 0.5, '--danger-dark', 0, 0, 0); P.box(0.82, 0.08, 0.52, '--asphalt', 0, 0.6, 0); }, x, 0, z, ry); }
// 맨홀 (테두리 + 뚜껑)
export function manhole(P, x, z, open = true) { P.cyl(0.55, 0.06, '--art-steel', x, 0, z); P.cyl(0.45, 0.07, open ? '--art-dark' : '--art-concrete-dark', x, 0, z); if (open) P.cyl(0.5, 0.05, '--art-steel', x + 1.0, 0, z + 0.6); }
// 송풍기 + 덕트 (밀폐공간 환기)
export function blower(P, x, z, tx, tz) { P.box(0.6, 0.6, 0.6, '--art-steel', x, 0, z); P.cyl(0.22, 0.05, '--asphalt', x, 0.6, z); P.rod([x, 0.3, z], [tx, 0.2, tz], 0.1, '--art-dark'); }
// 삼각대 (밀폐공간 구조용)
export function tripod(P, x, z, h = 2) { P.rod([x, h, z], [x - 0.8, 0, z - 0.5], 0.04, '--art-steel'); P.rod([x, h, z], [x + 0.8, 0, z - 0.5], 0.04, '--art-steel'); P.rod([x, h, z], [x, 0, z + 0.9], 0.04, '--art-steel'); }

// 굴착기 (y 회전) — 지도·장면 공용 크기 (길이 약 6m)
export function excavator(P, x, z, ry = 0, swing = 0) {
  P.group(() => {
    for (const s of [-1, 1]) { P.box(4, 0.8, 0.8, '--asphalt', 0, 0, s * 1.1); P.box(3.6, 0.12, 0.84, '--art-dark', 0, 0.8, s * 1.1); }
    P.group(() => {
      P.box(3.2, 1.3, 2.4, '--art-helmet', 0.2, 0.9, 0); P.box(1.2, 0.5, 2.3, '--asphalt-2', 1.6, 0.9, 0);
      P.box(1.2, 1.2, 1.1, '--art-helmet', -0.8, 2.2, 0.6); P.box(1.0, 0.8, 1.12, '--art-glass', -0.9, 2.45, 0.6);
      P.rod([-1.0, 1.9, -0.4], [-3.4, 4.2, -0.4], 0.22, '--art-helmet'); P.rod([-3.4, 4.2, -0.4], [-4.8, 1.4, -0.4], 0.18, '--art-helmet');
      P.box(0.9, 0.7, 1.0, '--asphalt', -4.9, 0.7, -0.4);
    }, 0, 0, 0, swing);
  }, x, 0, z, ry);
}
// 덤프트럭 (길이 약 7m)
export function dump(P, x, z, ry = 0) {
  P.group(() => {
    for (const dx of [-2.2, -1.0, 2.2]) for (const s of [-1, 1]) P.group(() => P.cyl(0.55, 0.4, '--asphalt', 0, -0.2, 0), dx, 0.55, s * 1.1, 0, Math.PI / 2);
    P.box(7, 0.4, 2.2, '--art-dark', 0, 0.7, 0);
    P.box(4.6, 1.8, 2.4, '--vest', -1.0, 1.1, 0); P.box(4.6, 0.15, 2.45, '--danger-dark', -1.0, 2.9, 0);
    P.box(1.8, 2.0, 2.3, '--vest', 2.5, 1.1, 0); P.box(0.1, 0.9, 2.0, '--art-glass', 3.42, 2.0, 0);
  }, x, 0, z, ry);
}
// 롤러 (다짐 장비)
export function roller(P, x, z, ry = 0) { P.group(() => { P.group(() => P.cyl(0.8, 2.0, '--art-steel', 0, -1.0, 0), 1.6, 0.8, 0, 0, Math.PI / 2); P.box(2.8, 1.2, 1.8, '--art-helmet', -0.6, 0.4, 0); P.box(1.2, 1.4, 1.4, '--art-dark', -0.8, 1.6, 0); P.box(1.0, 0.9, 1.42, '--art-glass', -0.8, 1.9, 0); }, x, 0, z, ry); }
// 지게차
export function forklift(P, x, z, ry = 0) { P.group(() => { P.box(2.0, 1.0, 1.3, '--vest', 0, 0.3, 0); P.box(1.0, 1.2, 1.2, '--art-dark', -0.3, 1.3, 0); P.box(0.1, 2.6, 0.1, '--art-steel', 1.1, 0, -0.4); P.box(0.1, 2.6, 0.1, '--art-steel', 1.1, 0, 0.4); P.box(1.0, 0.06, 0.12, '--art-steel', 1.6, 0.25, -0.35); P.box(1.0, 0.06, 0.12, '--art-steel', 1.6, 0.25, 0.35); for (const dx of [-0.7, 0.7]) for (const s of [-1, 1]) P.group(() => P.cyl(0.32, 0.25, '--asphalt', 0, -0.12, 0), dx, 0.32, s * 0.65, 0, Math.PI / 2); }, x, 0, z, ry); }
// 타워크레인 (높이 h, 지브 길이 L, 짐 위치 hookX)
export function towerCrane(P, x, z, ry = 0, h = 16, L = 12, hookX = 8, hookY = 7) {
  P.group(() => {
    P.box(2.4, 0.6, 2.4, '--art-concrete-dark', 0, 0, 0);
    for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) P.box(0.14, h, 0.14, '--art-helmet', dx, 0.6, dz);
    for (let y = 1.2; y < h; y += 1.4) { P.box(1.0, 0.08, 0.08, '--art-helmet', 0, y, -0.45); P.box(1.0, 0.08, 0.08, '--art-helmet', 0, y, 0.45); P.box(0.08, 0.08, 1.0, '--art-helmet', -0.45, y + 0.7, 0); P.box(0.08, 0.08, 1.0, '--art-helmet', 0.45, y + 0.7, 0); }
    P.box(1.4, 1.2, 1.4, '--art-helmet', 0.2, h + 0.6, 0); P.box(0.6, 0.6, 1.0, '--art-glass', 0.8, h + 0.4, 0);
    P.box(L, 0.5, 0.6, '--art-helmet', L / 2 - 1, h + 1.8, 0); P.box(4, 0.5, 0.6, '--art-helmet', -3, h + 1.8, 0); P.box(1.6, 1.2, 1.2, '--art-concrete-dark', -4.4, h + 1.1, 0);
    P.box(0.3, 2.4, 0.3, '--art-helmet', 0, h + 2.3, 0);
    P.rod([hookX, h + 1.8, 0], [hookX, hookY + 0.6, 0], 0.03, '--asphalt'); P.box(0.3, 0.3, 0.3, '--asphalt', hookX, hookY + 0.3, 0);
  }, x, 0, z, ry);
}
// 건설용 리프트 (마스트 + 운반구, 문 열림 여부)
export function hoist(P, x, z, h = 10, carY = 3.2, open = false, ry = 0) { P.group(() => { P.box(0.8, h, 0.8, '--art-helmet', 0, 0, 0); P.box(1.8, 2.0, 1.8, '--art-steel', 1.3, carY, 0); P.box(0.06, 1.8, 1.5, open ? '--art-dark' : '--art-helmet', 2.22, carY + 0.1, 0); }, x, 0, z, ry); }
// 펌프카 (붐 3단)
export function pumpTruck(P, x, z, ry = 0, boom = [[0, 2.4, 0], [1.5, 7, 0], [6, 8, 0], [9, 5, 0]]) {
  P.group(() => {
    for (const dx of [-2.4, -1.2, 2.4]) for (const s of [-1, 1]) P.group(() => P.cyl(0.5, 0.36, '--asphalt', 0, -0.18, 0), dx, 0.5, s * 1.05, 0, Math.PI / 2);
    P.box(7.4, 0.4, 2.1, '--art-dark', 0, 0.6, 0); P.box(5.0, 1.4, 2.2, '--vest', -1.0, 1.0, 0); P.box(1.8, 1.9, 2.2, '--vest', 2.7, 1.0, 0); P.box(0.1, 0.8, 1.9, '--art-glass', 3.62, 1.9, 0);
    for (const [a, b] of [[-2.8, -1.8], [1.6, 1.8]]) { P.rod([a, 0.8, 1.1], [b, 0, 2.2], 0.08, '--art-steel'); P.rod([a, 0.8, -1.1], [b, 0, -2.2], 0.08, '--art-steel'); }
    for (let i = 0; i < boom.length - 1; i++) P.rod(boom[i], boom[i + 1], 0.2 - i * 0.03, '--art-steel');
    P.rod(boom[boom.length - 1], [boom[boom.length - 1][0], 1.2, boom[boom.length - 1][2]], 0.1, '--asphalt');
  }, x, 0, z, ry);
}
// 레미콘 (믹서 트럭)
export function mixer(P, x, z, ry = 0) {
  P.group(() => {
    for (const dx of [-2.2, -1.0, 2.2]) for (const s of [-1, 1]) P.group(() => P.cyl(0.5, 0.36, '--asphalt', 0, -0.18, 0), dx, 0.5, s * 1.05, 0, Math.PI / 2);
    P.box(7, 0.4, 2.1, '--art-dark', 0, 0.6, 0); P.box(1.8, 1.9, 2.2, '--bg', 2.5, 1.0, 0); P.box(0.1, 0.8, 1.9, '--art-glass', 3.42, 1.9, 0);
    P.rod([-3.2, 2.6, 0], [1.2, 2.0, 0], 1.1, '--bg'); P.rod([-3.4, 2.65, 0], [-2.4, 2.5, 0], 1.15, '--vest');
  }, x, 0, z, ry);
}
// 비계 한 칸 묶음: 폭 w, 단 수 n, 단 높이 1.8 — 발판 + 안전난간(2줄) + 발끝막이판
export function scaffold(P, x, z, w = 6, n = 3, ry = 0, o = {}) {
  P.group(() => {
    const H = n * 1.8 + 1.1, cols = Math.max(2, Math.round(w / 1.8) + 1);
    for (let i = 0; i < cols; i++) { const dx = -w / 2 + (w * i) / (cols - 1); P.box(0.08, H, 0.08, '--art-steel', dx, 0, 0); P.box(0.08, H, 0.08, '--art-steel', dx, 0, 1.0); }
    for (let k = 1; k <= n; k++) { const y = k * 1.8;
      if (!(o.gap && k === n)) P.box(w, 0.06, 1.0, '--art-wood', 0, y, 0.5); else { P.box(w * 0.4, 0.06, 1.0, '--art-wood', -w * 0.3, y, 0.5); P.box(w * 0.4, 0.06, 1.0, '--art-wood', w * 0.3, y, 0.5); }
      if (!(o.norail && k === n)) { P.box(w, 0.06, 0.06, '--art-helmet', 0, y + 0.55, 1.0); P.box(w, 0.06, 0.06, '--art-helmet', 0, y + 1.0, 1.0); P.box(w, 0.15, 0.03, '--art-helmet', 0, y + 0.06, 1.02); }
      P.rod([-w / 2, y - 1.8, 1.0], [w / 2, y, 1.0], 0.025, '--art-steel'); }
  }, x, 0, z, ry);
}
// 동바리 + 거푸집 판 (w × d, 높이 h)
export function shoring(P, x, z, w = 5, d = 4, h = 3, bent = false) {
  for (let i = 0; i <= 3; i++) for (let j = 0; j <= 2; j++) { const px = x - w / 2 + (w * i) / 3, pz = z - d / 2 + (d * j) / 2; if (bent && i === 1 && j === 1) { P.rod([px, 0, pz], [px + 0.4, h / 2, pz], 0.05, '--art-steel'); P.rod([px + 0.4, h / 2, pz], [px, h, pz], 0.05, '--art-steel'); } else P.cyl(0.05, h, '--art-steel', px, 0, pz); }
  P.box(w + 0.6, 0.12, d + 0.6, '--art-wood-dark', x, h, z); P.box(w + 0.6, 0.1, d + 0.6, '--art-wood', x, h + 0.12, z);
}
// 골조 (기둥 4개 + 슬래브), 슬래브 윗면 높이 = h
export function frame(P, x, z, w = 8, d = 7, h = 3.4) { for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) P.box(0.5, h - 0.3, 0.5, '--art-concrete-dark', x + dx * (w / 2 - 0.4), 0, z + dz * (d / 2 - 0.4)); P.box(w, 0.3, d, '--art-concrete', x, h - 0.3, z); }
// 짓고 있는 건물 덩어리 (창 무늬는 장면 쪽에서)
export function building(P, x, z, w = 8, d = 6, h = 10, ry = 0) { P.group(() => { P.box(w, h, d, '--art-wall', 0, 0, 0); for (let y = 1.2; y < h - 0.5; y += 2.4) for (let k = 0; k < Math.floor(w / 1.6); k++) P.box(0.9, 1.0, 0.05, '--art-glass', -w / 2 + 0.8 + k * 1.6, y, d / 2 + 0.01); P.box(w + 0.2, 0.25, d + 0.2, '--art-concrete-dark', 0, h, 0); }, x, 0, z, ry); }
