// 첫 삽 v18 — 안전 구조물 코드 모델 (단위 m, y 위). 위험한 모습 / 안전한 모습은 옵션 하나만 바꿔 만든다.
// P 는 조립 도구 (scene3d 의 K, site3d 의 P 모두 같은 모양): box(w,h,d,재질,x,y,z,ry) · cyl(r,h,재질,x,y,z) · rod([x,y,z],[x,y,z],r,재질) · group(fn,x,y,z,ry)
// 재질 키는 js/learn/materials.js 세트만 (steel, plywood, paint:yellow ...). 치수와 근거: docs/모델_치수.md ("확인 필요" 값은 교육 문장에 쓰지 않음)
const RAIL = 'paint:yellow', PIPE = 'steel', DECK = 'steel';

// 안전난간: a→b (바닥 높이 y). o = { top, mid, toe } 하나씩 끄고 켬. 기둥 간격 ≤ post
export function guardrail(P, a, b, o = {}, y = 0) {
  const { top = true, mid = true, toe = true, post = 1.8, h = 1.05 } = o;
  const [x0, z0] = a, [x1, z1] = b, len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / post)), ry = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i <= n; i++) P.box(0.05, h + 0.02, 0.05, RAIL, x0 + ((x1 - x0) * i) / n, y, z0 + ((z1 - z0) * i) / n);
  if (top) P.rod([x0, y + h, z0], [x1, y + h, z1], 0.022, RAIL);
  if (mid) P.rod([x0, y + h * 0.52, z0], [x1, y + h * 0.52, z1], 0.02, RAIL);
  if (toe) P.box(len, 0.15, 0.025, RAIL, (x0 + x1) / 2, y, (z0 + z1) / 2, ry);
}

// 개구부 (바닥 윗면 y 에 뚫린 w×d 구멍). o.cover = 덮개(구멍보다 크게), coverMat = 표시 무늬 재질(노랑·검정 줄)
export function opening(P, x, z, w, d, o = {}, y = 0) {
  const { cover = false, coverMat = 'plywood', depth = 0.3 } = o;
  if (!cover) { // 덮개 없음: 바닥(슬래브)에 실제로 뚫린 구멍을 장면이 비워 두고, 여기서는 가장자리 면만 그림
    for (const [dx, dz, ww, dd] of [[0, -d / 2, w, 0.03], [0, d / 2, w, 0.03], [-w / 2, 0, 0.03, d], [w / 2, 0, 0.03, d]]) P.box(ww, depth, dd, 'concrete:--art-concrete-dark', x + dx, y - depth, z + dz);
    return;
  }
  P.box(w + 0.3, 0.03, d + 0.3, coverMat, x, y, z); // 덮개: 각 변 0.15m 더 크게 (확인 필요)
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box(0.05, 0.02, 0.05, 'steel', x + dx * (w / 2 + 0.08), y + 0.03, z + dz * (d / 2 + 0.08)); // 고정 못
}

// 시스템 비계: x0 부터 칸(bay) n 개, 안쪽 줄 z0 → 바깥 줄 z0+depth. lifts = 발판 높이 목록
//  o = { bayW, depth, lifts, guardrail:{top,mid,toe}, skip:[[칸,단]] 발판 뺄 곳, brace, ladder:칸 }
export function systemScaffold(P, x0, z0, o = {}) {
  const { n = 4, bayW = 1.8, depth = 1.2, lifts = [1.8, 3.6, 5.4], guard = {}, skip = [], brace = true, ladder = -1 } = o;
  const top = lifts[lifts.length - 1] + 1.1, zs = [z0, z0 + depth];
  for (let i = 0; i <= n; i++) for (const z of zs) {
    const x = x0 + i * bayW;
    P.box(0.16, 0.012, 0.16, PIPE, x, 0, z); P.cyl(0.018, 0.25, PIPE, x, 0.01, z); // 받침 철물 + 잭
    P.cyl(0.024, top - 0.2, PIPE, x, 0.2, z, 8); // 수직재
    for (const y of [0.45, ...lifts, ...lifts.map((v) => v + 0.5), ...lifts.map((v) => v + 1.0)]) P.cyl(0.055, 0.018, PIPE, x, y - 0.009, z, 10); // 로제트(연결 원판)
  }
  for (const y of [0.45, ...lifts]) {
    for (const z of zs) P.rod([x0, y, z], [x0 + n * bayW, y, z], 0.022, PIPE); // 수평재 (길이 방향)
    for (let i = 0; i <= n; i++) P.rod([x0 + i * bayW, y, zs[0]], [x0 + i * bayW, y, zs[1]], 0.022, PIPE); // 수평재 (폭 방향)
  }
  lifts.forEach((y, k) => {
    for (let i = 0; i < n; i++) if (!skip.some(([a, b]) => a === i && b === k)) deck(P, x0, z0, i, y, bayW, depth);
    guardrail(P, [x0, zs[1] + 0.03], [x0 + n * bayW, zs[1] + 0.03], { post: bayW, ...guard }, y); // 바깥쪽 안전난간
    if (brace) for (let i = k % 2; i < n; i += 2) P.rod([x0 + i * bayW, (k ? lifts[k - 1] : 0.45), zs[1] - 0.04], [x0 + (i + 1) * bayW, y, zs[1] - 0.04], 0.02, PIPE); // 가새
  });
  if (ladder >= 0) { const lx = x0 + ladder * bayW + bayW * 0.5; for (const dx of [-0.2, 0.2]) P.rod([lx + dx, 0, zs[0] + 0.12], [lx + dx, lifts[lifts.length - 1], zs[0] + 0.12], 0.018, 'paint:yellow'); for (let y = 0.3; y < lifts[lifts.length - 1]; y += 0.3) P.rod([lx - 0.2, y, zs[0] + 0.12], [lx + 0.2, y, zs[0] + 0.12], 0.014, 'paint:yellow'); }
}
// 발판 한 칸 (강재 발판 2장, 빈틈 없이). 위험 장면에서 "발판 있음/없음" 하나만 바꿀 때 따로 부름
export function deck(P, x0, z0, i, y, bayW = 1.8, depth = 1.2) {
  const pw = (depth - 0.04) / 2;
  for (let k = 0; k < 2; k++) {
    const cz = z0 + 0.02 + pw / 2 + k * pw;
    P.box(bayW - 0.04, 0.045, pw - 0.01, DECK, x0 + i * bayW + bayW / 2, y, cz);
    for (const e of [-1, 1]) P.box(bayW - 0.04, 0.03, 0.012, PIPE, x0 + i * bayW + bayW / 2, y - 0.03, cz + e * (pw / 2 - 0.01)); // 발판 테두리
  }
}

// 이동식 비계 (가로 w × 깊이 d, 발판 높이 h). o = { locked } 바퀴 잠금(브레이크 + 고임목), outrigger 아웃트리거
export function mobileTower(P, x, z, o = {}) {
  const { w = 1.5, d = 1.3, h = 3.6, locked = true, outrigger = true } = o;
  P.group(() => {
    const cs = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]];
    for (const [cx, cz] of cs) {
      P.cyl(0.13, 0.06, 'rubber', cx, 0.0, cz, 16); P.box(0.08, 0.16, 0.1, PIPE, cx, 0.06, cz); // 바퀴 + 받침
      P.box(0.1, 0.03, 0.07, locked ? 'paint:red' : 'steel', cx + 0.08, locked ? 0.06 : 0.16, cz); // 브레이크 발판 (잠금 = 내려간 빨강)
      if (locked) for (const s of [-1, 1]) P.box(0.1, 0.07, 0.1, 'paint:yellow', cx, 0, cz + s * 0.17); // 고임목
      P.cyl(0.024, h + 1.1 - 0.22, PIPE, cx, 0.22, cz, 8);
      if (outrigger) P.rod([cx, 0.9, cz], [cx * 1.9, 0.03, cz * 1.9], 0.022, PIPE);
    }
    for (let y = 0.45; y <= h + 0.01; y += h / 3) { for (const zz of [-d / 2, d / 2]) P.rod([-w / 2, y, zz], [w / 2, y, zz], 0.02, PIPE); for (const xx of [-w / 2, w / 2]) P.rod([xx, y, -d / 2], [xx, y, d / 2], 0.02, PIPE); }
    for (let y = 0.75; y < h - 0.1; y += 0.3) P.rod([-w / 2, y, -d / 2], [-w / 2, y, d / 2], 0.012, PIPE); // 끝 틀 = 사다리 가로대
    P.box(w, 0.05, d, 'plywood', 0, h, 0);
    guardrail(P, [-w / 2, -d / 2], [w / 2, -d / 2], { post: w }, h); guardrail(P, [-w / 2, d / 2], [w / 2, d / 2], { post: w }, h);
    guardrail(P, [-w / 2, -d / 2], [-w / 2, d / 2], { post: d }, h); guardrail(P, [w / 2, -d / 2], [w / 2, d / 2], { post: d }, h);
  }, x, 0, z);
}

// 파이프 서포트 동바리 한 개 (높이 h). o.bent 휨 / o.spliced 이어 세움(2단)
export function pipeSupport(P, x, z, h = 3.2, o = {}) {
  const { bent = false, spliced = false } = o;
  P.box(0.15, 0.012, 0.15, PIPE, x, 0, z); // 받침판
  if (spliced) { // 짧은 두 개를 각재로 이어 세움
    const a = h * 0.44;
    P.cyl(0.03, a, PIPE, x, 0.01, z, 10); P.box(0.15, 0.012, 0.15, PIPE, x, a, z);
    P.box(0.12, 0.22, 0.12, 'plywood', x, a + 0.012, z);
    P.box(0.15, 0.012, 0.15, PIPE, x, a + 0.23, z); P.cyl(0.03, h - a - 0.36, PIPE, x, a + 0.24, z, 10); P.cyl(0.024, 0.12, PIPE, x, h - 0.12, z, 10);
  } else if (bent) {
    const m = [x + 0.32, h * 0.5, z];
    P.rod([x, 0.01, z], m, 0.03, PIPE); P.rod(m, [x, h - 0.08, z], 0.024, PIPE);
    P.cyl(0.042, 0.06, PIPE, m[0], m[1] - 0.03, z, 12); // 핀 고리
  } else {
    P.cyl(0.03, h * 0.58, PIPE, x, 0.01, z, 10); // 바깥 관
    P.cyl(0.042, 0.06, PIPE, x, h * 0.56, z, 12); // 핀 고리
    P.rod([x - 0.06, h * 0.585, z], [x + 0.06, h * 0.585, z], 0.008, PIPE); // 핀
    P.cyl(0.024, h * 0.42 - 0.08, PIPE, x, h * 0.58, z, 10); // 안쪽 관
  }
  P.box(0.14, 0.012, 0.14, PIPE, x, h - 0.08, z); P.box(0.1, 0.07, 0.012, PIPE, x, h - 0.07, z - 0.05); P.box(0.1, 0.07, 0.012, PIPE, x, h - 0.07, z + 0.05); // U헤드
}
// 동바리 + 멍에·장선 + 거푸집 합판 (nx × nz 개, 간격 sx·sz, 높이 h). skip = 따로 그릴 자리 [[i,j]]
export function shoring(P, x0, z0, o = {}) {
  const { nx = 6, nz = 2, sx = 2, sz = 4, h = 3.2, skip = [], over = 0.6 } = o;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (!skip.some(([a, b]) => a === i && b === j)) pipeSupport(P, x0 + i * sx, z0 + j * sz, h);
  const W = (nx - 1) * sx + over * 2, D = (nz - 1) * sz + over * 2, cx = x0 + ((nx - 1) * sx) / 2, cz = z0 + ((nz - 1) * sz) / 2;
  for (let j = 0; j < nz; j++) P.box(W, 0.1, 0.1, PIPE, cx, h - 0.07 + 0.07, z0 + j * sz); // 멍에 (강재)
  for (let x = cx - W / 2 + 0.15; x < cx + W / 2; x += 0.45) P.box(0.06, 0.08, D, 'plywood', x, h + 0.1, cz); // 장선
  P.box(W, 0.025, D, 'plywood', cx, h + 0.18, cz); // 거푸집 합판
  return h + 0.205; // 거푸집 윗면 높이
}
