// 복셀 건물 모델 — 실제 형태를 단순화해 코드로 생성
// 블록: [x, y, z, color, phase]  phase 0 기초 · 1 골조 · 2 외장 · 3 지붕·마감

class M {
  constructor() { this.map = new Map(); }
  add(x, y, z, c, p = 1) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (y < 1) return;
    this.map.set(x + ',' + y + ',' + z, [x, y, z, c, p]);
  }
  del(x, y, z) { this.map.delete(Math.round(x) + ',' + Math.round(y) + ',' + Math.round(z)); }
  has(x, y, z) { return this.map.has(x + ',' + y + ',' + z); }
  box(x0, x1, y0, y1, z0, z1, c, p) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.add(x, y, z, c, p);
  }
  shell(x0, x1, y0, y1, z0, z1, c, p) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      if (x === x0 || x === x1 || z === z0 || z === z1) this.add(x, y, z, c, p);
  }
  clear(x0, x1, y0, y1, z0, z1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.del(x, y, z);
  }
  cyl(cx, cz, r, y0, y1, c, p, hollow = false) {
    const R = Math.ceil(r);
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const d = Math.sqrt(x * x + z * z);
      if (d > r + 0.35) continue;
      if (hollow && d < r - 0.85) continue;
      for (let y = y0; y <= y1; y++) this.add(cx + x, y, cz + z, c, p);
    }
  }
  dome(cx, cy, cz, r, c, p, squash = 1, onion = false) {
    const H = r * squash * (onion ? 1.5 : 1);
    let y = 0;
    for (; y <= H; y++) {
      const t = y / H;
      const rr = onion
        ? r * (t < 0.35 ? 1 + 0.2 * Math.sin(t / 0.35 * Math.PI / 2) : 1.2 * Math.cos((t - 0.35) / 0.65 * Math.PI / 2))
        : r * Math.sqrt(Math.max(0, 1 - t * t));
      if (rr < 0.5) { this.add(cx, cy + y, cz, c, p); continue; }
      const RR = Math.ceil(rr);
      for (let x = -RR; x <= RR; x++) for (let z = -RR; z <= RR; z++)
        if (x * x + z * z <= rr * rr + 0.4) this.add(cx + x, cy + y, cz + z, c, p);
    }
  }
  pyr(cx, cz, half, y0, c, p, step = 1, hollow = false) {
    let h = half, y = y0;
    while (h >= 0) {
      for (let s = 0; s < step; s++) {
        for (let x = -h; x <= h; x++) for (let z = -h; z <= h; z++)
          if (!hollow || Math.abs(x) === h || Math.abs(z) === h) this.add(cx + x, y, cz + z, c, p);
        y++;
      }
      h--;
    }
    return y;
  }
  gable(x0, x1, y0, z0, z1, c, p, alongX = true, eaves = 1) {
    // 박공지붕
    if (alongX) {
      let a = z0 - eaves, b = z1 + eaves, y = y0;
      while (a <= b) {
        for (let x = x0 - eaves; x <= x1 + eaves; x++) { this.add(x, y, a, c, p); this.add(x, y, b, c, p); }
        a++; b--; y++;
      }
    } else {
      let a = x0 - eaves, b = x1 + eaves, y = y0;
      while (a <= b) {
        for (let z = z0 - eaves; z <= z1 + eaves; z++) { this.add(a, y, z, c, p); this.add(b, y, z, c, p); }
        a++; b--; y++;
      }
    }
  }
  windowsX(x0, x1, z, y0, y1, c, gap = 2, every = 3, p = 2) {
    for (let y = y0; y <= y1; y += every) for (let x = x0; x <= x1; x += gap) this.add(x, y, z, c, p);
  }
  windowsZ(z0, z1, x, y0, y1, c, gap = 2, every = 3, p = 2) {
    for (let y = y0; y <= y1; y += every) for (let z = z0; z <= z1; z += gap) this.add(x, y, z, c, p);
  }
  text(str, x0, y0, z, c, p = 3, dirX = 1, face = 'z') {
    // 3x5 픽셀 숫자
    const F = { '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'] };
    let off = 0;
    for (const ch of str) {
      const g = F[ch]; if (!g) { off += 4; continue; }
      for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '1') {
        const yy = y0 + (4 - r);
        if (face === 'z') this.add(x0 + (off + k) * dirX, yy, z, c, p);
        else this.add(z, yy, x0 + (off + k) * dirX, c, p);
      }
      off += 4;
    }
  }
  list() { return [...this.map.values()]; }
}

const C = {
  conc: 0xb8b8b0, conc2: 0x9a9a94, white: 0xf3f0e6, cream: 0xf2e2bf, brick: 0xb5523b, red: 0xc8463c,
  wood: 0x9c6a3c, dwood: 0x6b4423, glass: 0x7fc6e6, glass2: 0x5aa6cf, roof: 0x4a4f5a, tile: 0x3b4150,
  sand: 0xd9b979, sand2: 0xc9a764, stone: 0xcfc4a8, gold: 0xf2c230, green: 0x5aa58c, copper: 0x6fb39b,
  iron: 0x8a5a3c, navy: 0x2f4f7f, blue: 0x5a8fd8, lblue: 0xa9d4f0, steel: 0xbcc6cf, dark: 0x3a3a3a,
  sandstone: 0xc0704a, marble: 0xf7f5f0, black: 0x2a2a2a, orange: 0xe58a3a, pink: 0xd98c7a,
};

const G = {
  doghouse(m) {
    m.shell(-2, 2, 1, 3, -2, 1, C.wood, 1);
    m.clear(-1, 0, 1, 2, 1, 1); // 문
    m.gable(-2, 2, 4, -2, 1, C.red, 3, true, 1);
    m.add(0, 3, 1, C.dwood, 2);
    m.add(3, 1, 2, 0x8b5a2b, 3); // 밥그릇
  },
  house(m) {
    m.box(-5, 5, 1, 1, -4, 4, C.conc, 1);
    m.shell(-5, 5, 2, 5, -4, 4, C.cream, 1);
    for (const [x, z] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) m.box(x, x, 2, 5, z, z, C.wood, 1);
    m.clear(-1, 0, 2, 4, 4, 4); m.box(-1, 0, 2, 4, 4, 4, C.dwood, 2); m.del(0, 4, 4);
    m.windowsX(-4, -3, 4, 3, 4, C.glass, 1, 1); m.windowsX(2, 4, 4, 3, 4, C.glass, 1, 1);
    m.windowsX(-3, 3, -4, 3, 4, C.glass, 2, 1);
    m.windowsZ(-2, 2, -5, 3, 4, C.glass, 2, 1); m.windowsZ(-2, 2, 5, 3, 4, C.glass, 2, 1);
    m.gable(-5, 5, 6, -4, 4, C.red, 3, true, 1);
    m.box(3, 3, 7, 9, -1, -1, C.brick, 3); // 굴뚝
  },
  villa(m) {
    // 필로티: 1층 기둥만
    for (const x of [-5, -1, 3, 6]) for (const z of [-4, 0, 4]) m.box(x, x, 1, 3, z, z, C.conc, 1);
    for (let f = 0; f < 4; f++) {
      const y = 4 + f * 3;
      m.box(-5, 6, y, y, -4, 4, C.conc2, 1);
      m.shell(-5, 6, y + 1, y + 2, -4, 4, f % 2 ? C.white : C.cream, 1);
      m.windowsX(-4, 5, 4, y + 1, y + 2, C.glass, 2, 1); m.windowsX(-4, 5, -4, y + 1, y + 2, C.glass, 3, 1);
      m.windowsZ(-2, 2, 6, y + 1, y + 1, C.glass, 2, 1);
    }
    m.box(-5, 6, 16, 16, -4, 4, C.conc2, 3);
    m.shell(-5, 6, 17, 17, -4, 4, C.white, 3);
    m.box(4, 5, 17, 18, -3, -2, C.lblue, 3);
    m.box(-4, -3, 1, 1, -3, 3, 0x555555, 2); m.box(1, 2, 1, 1, -3, 3, 0x555555, 2); // 주차 칸
  },
  apt(m) {
    const H = 15;
    for (let f = 0; f < H; f++) {
      const y = 1 + f * 2;
      m.box(-6, 6, y, y, -3, 3, C.conc2, 1);
      m.shell(-6, 6, y + 1, y + 1, -3, 3, C.white, 1);
      for (let x = -5; x <= 5; x += 2) m.add(x, y + 1, 3, C.glass, 2);
      for (let x = -5; x <= 5; x += 3) m.add(x, y + 1, -3, C.glass, 2);
      m.add(0, y + 1, 4, C.lblue, 2); m.add(-3, y + 1, 4, C.lblue, 2); m.add(3, y + 1, 4, C.lblue, 2); // 발코니
    }
    const top = 1 + H * 2;
    m.box(-6, 6, top, top, -3, 3, C.conc2, 3);
    m.shell(-6, 6, top + 1, top + 1, -3, 3, C.white, 3);
    m.box(-2, 2, top + 1, top + 3, -1, 1, 0x7aa2c8, 3);
    // 옆벽 "101"
    m.text('101', 2, top - 8, 6, 0x2f6fbf, 3, -1, 'x');
    m.text('101', -2, top - 8, -6, 0x2f6fbf, 3, 1, 'x');
    m.box(-1, 1, 1, 2, 3, 3, C.dwood, 2);
  },
  hanok(m) {
    m.box(-7, 7, 1, 2, -5, 5, C.stone, 1); // 기단
    for (const x of [-6, -3, 0, 3, 6]) for (const z of [-4, 4]) m.box(x, x, 3, 6, z, z, C.dwood, 1);
    for (const z of [-1, 1]) for (const x of [-6, 6]) m.box(x, x, 3, 6, z, z, C.dwood, 1);
    // 창호
    for (let x = -5; x <= 5; x++) for (let y = 3; y <= 6; y++) {
      if (x % 3 === 0) continue;
      m.add(x, y, 4, (y === 3 || y === 6) ? C.wood : 0xf5ecd6, 2);
      m.add(x, y, -4, (y === 3) ? C.wood : C.white, 2);
    }
    for (let z = -3; z <= 3; z++) for (let y = 3; y <= 6; y++) { m.add(-6, y, z, z % 2 ? C.white : C.wood, 2); m.add(6, y, z, z % 2 ? C.white : C.wood, 2); }
    m.box(-7, 7, 7, 7, -5, 5, C.wood, 1); // 보
    // 기와지붕 (처마 곡선)
    for (let i = 0; i <= 5; i++) {
      const y = 8 + i;
      const ex = 9 - i, ez = 7 - i;
      for (let x = -ex; x <= ex; x++) for (const z of [-ez, ez]) m.add(x, y + (Math.abs(x) > ex - 2 && i < 2 ? 1 : 0), z, C.tile, 3);
      for (let z = -ez; z <= ez; z++) for (const x of [-ex, ex]) m.add(x, y + (Math.abs(z) > ez - 2 && i < 2 ? 1 : 0), z, C.tile, 3);
    }
    for (let x = -4; x <= 4; x++) m.add(x, 14, 0, C.white, 3); // 용마루
    for (let x = -4; x <= 4; x++) for (let z = -2; z <= 2; z++) m.add(x, 13, z, C.tile, 3);
  },
  lotte(m) {
    const H = 62;
    for (let y = 1; y <= H; y++) {
      const t = y / H;
      const r = 6.2 * (1 - t * 0.78);
      const R = Math.ceil(r);
      for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
        // 둥근 모서리 사각형
        const ax = Math.abs(x), az = Math.abs(z);
        if (ax > r || az > r) continue;
        if (ax + az > r * 1.55) continue;
        const edge = ax > r - 1 || az > r - 1 || ax + az > r * 1.55 - 1.2;
        if (!edge && y % 6) continue;
        m.add(x, y, z, edge ? (y % 2 ? 0xc4d6e2 : 0xa9c3d6) : C.conc, edge ? 2 : 1);
      }
      m.add(0, y, 0, C.conc2, 1); // 코어
    }
    // 꼭대기 갈라진 모양
    for (let y = H + 1; y <= H + 6; y++) { m.add(-1, y, 0, 0xdde8ef, 3); m.add(1, y, 0, 0xdde8ef, 3); m.add(0, y, -1, 0xdde8ef, 3); }
    m.box(-7, 7, 1, 2, -7, 7, 0xd2d6da, 2); // 포디움
  },
  pyramid(m) {
    for (let i = 0; i <= 13; i++) {
      const h = 13 - i;
      for (let x = -h; x <= h; x++) for (let z = -h; z <= h; z++) {
        const edge = Math.abs(x) === h || Math.abs(z) === h;
        m.add(x, i + 1, z, edge ? ((x + z + i) % 3 ? C.sand : C.sand2) : C.sand2, edge ? 2 : 1);
      }
    }
    m.add(0, 15, 0, C.gold, 3);
    m.clear(-1, 1, 1, 2, 13, 13);
  },
  sphinx(m) {
    m.box(-4, 4, 1, 4, -9, 6, C.sand, 1); // 몸
    m.box(-4, -2, 1, 2, 7, 11, C.sand, 2); m.box(2, 4, 1, 2, 7, 11, C.sand, 2); // 앞발
    m.box(-3, 3, 5, 6, 2, 7, C.sand, 1); // 어깨
    m.box(-2, 2, 7, 11, 4, 8, C.sand2, 2); // 머리
    // 네메스 두건 줄무늬
    for (let y = 6; y <= 11; y++) { m.add(-3, y, 5, y % 2 ? 0x3a6fb0 : C.gold, 3); m.add(3, y, 5, y % 2 ? 0x3a6fb0 : C.gold, 3); }
    for (let x = -2; x <= 2; x++) m.add(x, 12, 5, x % 2 ? 0x3a6fb0 : C.gold, 3);
    m.add(-1, 9, 9, C.dark, 3); m.add(1, 9, 9, C.dark, 3); m.add(0, 8, 9, C.sand2, 3);
    m.box(-1, 1, 4, 4, -9, -12, C.sand, 2); // 꼬리
    m.box(-6, 6, 1, 1, -12, 12, 0xcdb27a, 1);
  },
  pisa(m) {
    const lean = 0.09;
    for (let y = 1; y <= 34; y++) {
      const ox = (y - 1) * lean;
      const floor = (y - 2) % 4 === 0;
      const top = y > 30;
      const r = top ? 2.4 : 3.4;
      const R = Math.ceil(r);
      for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
        const d = Math.hypot(x, z);
        if (d > r + 0.35 || d < r - 1.1) continue;
        const arch = !floor && (Math.atan2(z, x) * 4 / Math.PI + 8) % 1 < 0.45 && y > 2;
        m.add(x + ox, y, z, arch ? 0xd8d4c8 : C.marble, floor ? 1 : 2);
      }
      if (floor) m.cyl(Math.round(ox), 0, r - 1, y, y, 0xe8e4da, 1);
    }
    m.cyl(3, 0, 1.2, 35, 36, 0xd8d4c8, 3);
  },
  colosseum(m) {
    const A = 13, B = 10;
    for (let x = -A - 1; x <= A + 1; x++) for (let z = -B - 1; z <= B + 1; z++) {
      const e = (x * x) / (A * A) + (z * z) / (B * B);
      const e2 = (x * x) / ((A - 3) * (A - 3)) + (z * z) / ((B - 3) * (B - 3));
      if (e > 1.05 || e2 < 1) continue;
      const outer = e > 0.82;
      const ang = Math.atan2(z / B, x / A);
      const broken = ang > 0.2 && ang < 1.6; // 무너진 부분
      const maxY = outer ? (broken ? 9 : 16) : 8 - Math.round((1 - e) * 10);
      for (let y = 1; y <= maxY; y++) {
        const arch = outer && y % 4 !== 1 && (Math.round(ang * 12) % 2 === 0) && y < 13;
        if (arch) continue;
        m.add(x, y, z, outer ? (y > 12 ? 0xc9b48a : 0xd6c296) : 0xbfae86, outer ? 2 : 1);
      }
    }
    m.box(-8, 8, 1, 1, -5, 5, 0xd8c48f, 1); // 경기장 바닥
  },
  arc(m) {
    m.box(-7, 7, 1, 16, -3, 3, C.stone, 1);
    m.clear(-3, 3, 1, 10, -3, 3); // 큰 아치
    m.clear(-7, 7, 1, 6, -1, 1); // 옆 아치
    for (let x = -2; x <= 2; x++) m.add(x, 11, 3, 0xbfb398, 2);
    for (let x = -7; x <= 7; x++) { m.add(x, 14, 4, 0xbfb398, 3); m.add(x, 14, -4, 0xbfb398, 3); }
    m.box(-7, 7, 17, 18, -3, 3, 0xd8ceb4, 3);
    m.box(-6, -4, 4, 8, 4, 4, 0xa89c80, 2); m.box(4, 6, 4, 8, 4, 4, 0xa89c80, 2); // 부조
    m.add(0, 1, -5, 0xff6a2a, 3); // 무명용사의 불꽃
  },
  eiffel(m) {
    const H = 56;
    for (let y = 1; y <= H; y++) {
      let spread;
      if (y < 20) spread = 11 - y * 0.42;
      else if (y < 36) spread = 2.6 - (y - 20) * 0.06;
      else spread = 1.6 - (y - 36) * 0.06;
      spread = Math.max(0, spread);
      const legs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [sx, sz] of legs) {
        const lx = Math.round(sx * spread), lz = Math.round(sz * spread);
        m.add(lx, y, lz, C.iron, 1);
        if (y < 20) { m.add(lx - sx, y, lz, C.iron, 1); m.add(lx, y, lz - sz, C.iron, 1); }
        if (y % 3 === 0) m.add(lx - sx, y, lz - sz, 0x7a4a30, 2);
      }
      // 아치와 전망대
      if (y === 7 || y === 20 || y === 36) {
        const s = Math.round(spread) + 1;
        m.shell(-s, s, y, y, -s, s, 0x6b3f28, y === 7 ? 1 : 3);
      }
      if (y > 2 && y < 6) { const a = Math.round(spread * (0.4 + (y - 3) * 0.2)); for (let x = -a; x <= a; x++) { m.add(x, y + 2, Math.round(spread), 0x7a4a30, 2); m.add(x, y + 2, -Math.round(spread), 0x7a4a30, 2); } }
    }
    for (let y = H + 1; y <= H + 4; y++) m.add(0, y, 0, 0xdddddd, 3);
  },
  bigben(m) {
    m.box(-3, 3, 1, 26, -3, 3, 0xd4b07a, 1);
    for (let y = 2; y <= 22; y += 2) for (let k = -2; k <= 2; k += 2) { m.add(k, y, 3, 0xb08d5a, 2); m.add(k, y, -3, 0xb08d5a, 2); m.add(3, y, k, 0xb08d5a, 2); m.add(-3, y, k, 0xb08d5a, 2); }
    // 시계판
    for (const f of [[0, 4, 'z'], [0, -4, 'z'], [4, 0, 'x'], [-4, 0, 'x']]) {
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
        if (Math.abs(a) + Math.abs(b) > 3) continue;
        const col = (a === 0 && b >= 0) || (b === 0 && a > 0 && a < 2) ? C.black : 0xf8f3dc;
        if (f[2] === 'z') m.add(a, 24 + b, f[1], col, 3); else m.add(f[0], 24 + b, a, col, 3);
      }
    }
    m.box(-3, 3, 27, 28, -3, 3, 0xc39a5e, 3);
    m.pyr(0, 0, 3, 29, 0x3f5f5a, 3, 2);
    for (let y = 37; y <= 40; y++) m.add(0, y, 0, C.gold, 3);
  },
  towerbridge(m) {
    for (const cx of [-8, 8]) {
      m.box(cx - 3, cx + 3, 1, 3, -3, 3, 0x8c8c86, 1); // 교각
      m.box(cx - 2, cx + 2, 4, 20, -2, 2, 0xd6cfba, 1);
      m.windowsX(cx - 1, cx + 1, 2, 6, 18, 0x5a7ca8, 2, 3);
      m.pyr(cx, 0, 2, 21, 0x5f6f8f, 3, 2);
      for (const dx of [-2, 2]) for (const dz of [-2, 2]) for (let y = 21; y <= 24; y++) m.add(cx + dx, y, dz, 0xd6cfba, 3);
    }
    m.box(-5, 5, 6, 6, -1, 1, C.blue, 2); // 도개 도로
    m.box(-5, 5, 17, 18, -1, 1, 0x5a8fd8, 2); // 상부 보도
    for (let x = -5; x <= 5; x += 2) { m.add(x, 16, 1, 0x3f6fb8, 2); m.add(x, 16, -1, 0x3f6fb8, 2); }
    // 현수 체인
    for (let i = 0; i <= 8; i++) { const y = Math.round(6 + i * 1.3); m.add(-11 - i, Math.max(4, 17 - i * 1.4), 0, C.blue, 2); m.add(11 + i, Math.max(4, 17 - i * 1.4), 0, C.blue, 2); }
    m.box(-20, -11, 5, 5, -1, 1, 0x7a8a9a, 2); m.box(11, 20, 5, 5, -1, 1, 0x7a8a9a, 2);
  },
  indiagate(m) {
    m.box(-7, 7, 1, 20, -3, 3, C.sandstone, 1);
    m.clear(-3, 3, 1, 13, -3, 3);
    for (let x = -3; x <= 3; x++) { const d = Math.abs(x); if (d <= 2) m.add(x, 14, 0, C.sandstone, 1); }
    m.box(-8, 8, 17, 17, -4, 4, 0xd8906a, 2);
    m.box(-5, 5, 21, 22, -2, 2, 0xcf8160, 3);
    m.cyl(0, 0, 1.6, 23, 23, 0xd8906a, 3);
    m.add(0, 24, 0, 0xd8906a, 3);
    m.windowsX(-6, -4, 3, 4, 14, 0xa65838, 1, 5); m.windowsX(4, 6, 3, 4, 14, 0xa65838, 1, 5);
  },
  taj(m) {
    m.box(-13, 13, 1, 2, -13, 13, C.marble, 1); // 기단
    m.box(-7, 7, 3, 12, -7, 7, C.marble, 1);
    for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) m.box(a - (a > 0 ? 1 : -1), a, 3, 12, b - (b > 0 ? 1 : -1), b, 0xeeeae2, 2);
    // 이완(아치 입구)
    for (const s of [1, -1]) { m.clear(-2, 2, 3, 10, 7 * s, 7 * s); m.box(-2, 2, 3, 10, 6 * s, 6 * s, 0xe4ddd0, 2); m.clear(-2, 2, 3, 10, s * 7, s * 7);
      m.clear(7 * s, 7 * s, 3, 10, -2, 2); m.box(6 * s, 6 * s, 3, 10, -2, 2, 0xe4ddd0, 2); }
    m.cyl(0, 0, 4, 13, 14, C.marble, 3);
    m.dome(0, 15, 0, 5, C.marble, 3, 1.1, true);
    for (let y = 22; y <= 24; y++) m.add(0, y, 0, C.gold, 3);
    for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { m.cyl(a, b, 1.3, 13, 14, C.marble, 3); m.dome(a, 15, b, 1.4, C.marble, 3); }
    for (const [a, b] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) { m.cyl(a, b, 0.9, 3, 18, 0xf4f1ea, 2); m.box(a - 1, a + 1, 19, 19, b - 1, b + 1, C.marble, 3); m.add(a, 20, b, C.marble, 3); }
    m.box(-1, 1, 1, 1, 14, 22, 0x6fb6e0, 2); // 연못
  },
  burjarab(m) {
    const H = 44;
    for (let y = 1; y <= H; y++) {
      const t = y / H;
      const w = Math.round(7 * Math.sin(Math.PI * (0.18 + t * 0.82)) + 1); // 돛 곡선
      const back = -6;
      const front = Math.round(back + 2 + 14 * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - t * 0.35));
      for (let z = back; z <= front; z++) {
        const k = (z - back) / Math.max(1, front - back);
        const ww = Math.max(1, Math.round(w * Math.sqrt(1 - k * k * 0.85)));
        for (let x = -ww; x <= ww; x++) {
          const edge = Math.abs(x) === ww || z === front;
          if (!edge && y % 5) continue;
          m.add(x, y, z, z === front ? 0xf5f8fa : (edge ? 0xe8eef3 : 0xbfc8d0), edge ? 2 : 1);
        }
      }
      m.add(0, y, back - 1, 0xb0b8c0, 1); // 뒤 기둥
      m.add(0, y, back - 2, y % 3 ? 0x9aa4ad : 0xffffff, 2);
    }
    for (let y = H + 1; y <= H + 7; y++) m.add(0, y, -7, 0xdedede, 3);
    m.cyl(5, -3, 2.2, 34, 34, 0xd0d6da, 3); // 헬리패드
    m.box(-10, 10, 1, 1, -10, 10, 0x58b8e0, 1); // 인공섬 주변 물
    m.box(-6, 6, 1, 1, -8, 8, 0xe8d8a8, 1);
  },
  khalifa(m) {
    const H = 78;
    const wings = [[0, 1], [0.866, -0.5], [-0.866, -0.5]];
    for (let y = 1; y <= H; y++) {
      const t = y / H;
      for (let w = 0; w < 3; w++) {
        // 날개마다 다른 높이에서 계단식 후퇴
        const drop = [0.62, 0.72, 0.82][w];
        const len = Math.max(0, 9 * (1 - t / drop));
        const [dx, dz] = wings[w];
        for (let s = 0; s <= len; s += 0.5) {
          const x = dx * s, z = dz * s;
          const wide = s < len - 1 ? 1.4 : 1;
          for (let a = -wide; a <= wide; a += 0.7) m.add(x - dz * a, y, z + dx * a, (y % 3 ? 0xb9cde0 : 0x96b0c8), 2);
        }
      }
      const cr = Math.max(0.6, 2.4 * (1 - t));
      m.cyl(0, 0, cr, y, y, y % 2 ? 0xc9d8e5 : 0xaabfd2, 1);
    }
    for (let y = H + 1; y <= H + 10; y++) m.add(0, y, 0, 0xe0e6ea, 3);
  },
  liberty(m) {
    // 받침대
    m.box(-6, 6, 1, 3, -6, 6, 0xb5a48a, 1);
    m.box(-4, 4, 4, 13, -4, 4, 0xcbbd9f, 1);
    m.box(-5, 5, 13, 14, -5, 5, 0xb5a48a, 2);
    const g = C.copper, g2 = 0x5c9a86;
    // 옷자락
    for (let y = 15; y <= 26; y++) { const r = 3 - (y - 15) * 0.12; m.cyl(0, 0, r, y, y, y % 2 ? g : g2, 2); }
    m.box(-2, 2, 27, 29, -1, 1, g, 2); // 어깨
    m.box(-1, 1, 30, 32, -1, 1, g, 3); // 머리
    for (const [x, z] of [[0, -2], [-2, 0], [2, 0], [-1, -2], [1, -2], [0, 2]]) m.add(x, 33, z, g2, 3); // 왕관
    m.box(-1, 1, 33, 33, -1, 1, g, 3);
    // 오른팔과 횃불
    for (let y = 28; y <= 36; y++) m.add(3, y, 0, g, 3);
    m.box(2, 4, 37, 37, -1, 1, g2, 3);
    m.add(3, 38, 0, C.gold, 3); m.add(3, 39, 0, 0xffb02a, 3);
    // 왼팔 서판
    m.box(-4, -3, 23, 27, 0, 1, g2, 3);
  },
  empire(m) {
    const tiers = [[7, 1, 6], [6, 7, 30], [5, 31, 42], [4, 43, 50], [3, 51, 54], [2, 55, 58]];
    for (const [r, y0, y1] of tiers) {
      for (let y = y0; y <= y1; y++) {
        for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
          const edge = Math.abs(x) === r || Math.abs(z) === r;
          if (!edge && y % 4) continue;
          const win = edge && (x + z) % 2 === 0 && y % 2 === 0;
          m.add(x, y, z, edge ? (win ? 0x6a8aa8 : 0xd4cfc0) : 0xb0aa98, edge ? 2 : 1);
        }
      }
    }
    m.cyl(0, 0, 1.4, 59, 63, 0xc8d0d8, 3);
    for (let y = 64; y <= 70; y++) m.add(0, y, 0, 0xe0e0e0, 3);
    m.box(-8, 8, 1, 1, -8, 8, 0x9a9488, 1);
  },
  alhambra(m) {
    const red = 0xc0623e, red2 = 0xa94f30;
    m.shell(-14, 14, 1, 6, -10, 10, red, 1);
    for (let x = -14; x <= 14; x += 2) { m.add(x, 7, 10, red2, 3); m.add(x, 7, -10, red2, 3); }
    for (let z = -10; z <= 10; z += 2) { m.add(14, 7, z, red2, 3); m.add(-14, 7, z, red2, 3); }
    // 탑들
    for (const [x, z, h] of [[-14, -10, 12], [14, -10, 10], [-14, 10, 10], [14, 10, 11], [0, -10, 14]]) {
      m.box(x - 2, x + 2, 1, h, z - 2, z + 2, red, 1);
      for (let k = -2; k <= 2; k += 2) { m.add(x + k, h + 1, z - 2, red2, 3); m.add(x + k, h + 1, z + 2, red2, 3); }
    }
    // 사자의 중정
    m.box(-6, 6, 1, 1, -4, 4, 0xe8dcc4, 1);
    for (let x = -6; x <= 6; x += 2) for (const z of [-4, 4]) m.box(x, x, 2, 4, z, z, 0xf2ead8, 2);
    m.box(-6, 6, 5, 5, -4, 4, 0xb76040, 3); m.clear(-5, 5, 5, 5, -3, 3);
    m.box(-4, 4, 1, 1, 6, 8, 0x5fb4dc, 2); // 연못
    m.add(0, 2, 0, 0xdddddd, 3); m.add(0, 3, 0, 0x7fc6e6, 3);
  },
  sagrada(m) {
    const stone = 0xc7b48c, stone2 = 0xb39c70;
    m.box(-12, 12, 1, 10, -6, 6, stone, 1); // 본당
    m.gable(-12, 12, 11, -6, 6, stone2, 1, true, 0);
    const spire = (x, z, h, r, top) => {
      for (let y = 1; y <= h; y++) {
        const rr = r * (1 - (y / h) * 0.65);
        m.cyl(x, z, rr, y, y, y % 3 ? stone : stone2, y > h * 0.8 ? 3 : 2);
      }
      for (let y = h + 1; y <= h + 2; y++) m.add(x, y, z, top, 3);
    };
    // 탄생의 파사드 4개 탑
    for (const x of [-9, -5, 5, 9]) spire(x, -7, 30 + (Math.abs(x) < 6 ? 4 : 0), 1.8, 0xd94e3c);
    for (const x of [-9, -5, 5, 9]) spire(x, 7, 28 + (Math.abs(x) < 6 ? 4 : 0), 1.8, 0xf2c230);
    // 중앙 예수 그리스도 탑과 성모 탑
    spire(0, 0, 52, 3.2, 0xffffff);
    spire(-9, 0, 40, 2.2, 0x5a8fd8);
    spire(9, 0, 38, 2, 0x3fae5a);
    for (let x = -10; x <= 10; x += 2) m.add(x, 6, -7, 0x8fbf6a, 2); // 장식
  },
};

const cache = new Map();
export function buildModel(id) {
  if (cache.has(id)) return cache.get(id);
  const m = new M();
  G[id](m);
  let blocks = m.list();
  // 기초 슬래브(y=0)
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, maxY = 0;
  for (const b of blocks) { x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[0]); z0 = Math.min(z0, b[2]); z1 = Math.max(z1, b[2]); maxY = Math.max(maxY, b[1]); }
  const found = [];
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) found.push([x, 0, z, (x + z) % 2 ? 0x8f8f8a : 0x9d9d97, 0]);
  // 맨 위 12%는 지붕·마감
  for (const b of blocks) if (b[4] === 1 && b[1] > maxY * 0.88) b[4] = 3;
  blocks.sort((a, b) => (a[4] - b[4]) || (a[1] - b[1]) || (a[0] - b[0]) || (a[2] - b[2]));
  // 외장은 아래부터 골조 뒤에, 지붕은 마지막
  const all = found.concat(blocks);
  const counts = [0, 0, 0, 0];
  for (const b of all) counts[b[4]]++;
  const res = { blocks: all, counts, size: { x0, x1, z0, z1, h: maxY } };
  cache.set(id, res);
  return res;
}
