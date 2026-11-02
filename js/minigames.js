// 부업 미니게임: 레미콘 받아들이기 검사(정식·쉬운 버전) · 건축 용어 퀴즈 + 갈등·대화
import { h, openModal, hiCanvas, shuffle, sleep } from './ui.js';
import { sfx } from './audio.js';
import { QUIZ, QUIZ_LEVELS } from './data.js';
import { FIELD_LESSON, FIELD_UI } from './data2.js';

const r5 = (v) => Math.round(v / 5) * 5;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ================= 레미콘 받아들이기 검사 ================= */
const SPECS = [
  { s: 150, tol: 25, w: 5 }, { s: 120, tol: 25, w: 2 }, { s: 180, tol: 25, w: 2 }, { s: 65, tol: 15, w: 1 }, { s: 50, tol: 15, w: 1 }, { s: 25, tol: 10, w: 1 },
];
function makeTruck() {
  let tot = SPECS.reduce((a, b) => a + b.w, 0), x = Math.random() * tot, sp = SPECS[0];
  for (const s of SPECS) { if ((x -= s.w) < 0) { sp = s; break; } }
  const t = {
    spec: `25-24-${sp.s}`, target: sp.s, tol: sp.tol,
    slump: r5(sp.s + rnd(-0.6, 0.6) * sp.tol), air: +rnd(3.4, 5.6).toFixed(1),
    cl: [0, 0, 0].map(() => +rnd(0.1, 0.24).toFixed(2)), water: Math.round(rnd(166, 182)), bad: null,
  };
  if (Math.random() < 0.45) {
    const item = ['slump', 'air', 'cl', 'water'][Math.floor(Math.random() * 4)];
    t.bad = item;
    if (item === 'slump') t.slump = Math.max(10, r5(sp.s + (Math.random() < 0.5 ? -1 : 1) * (sp.tol + rnd(5, 25))));
    if (item === 'air') t.air = +(Math.random() < 0.5 ? rnd(6.3, 7.6) : rnd(1.8, 2.8)).toFixed(1);
    if (item === 'cl') t.cl = [0, 0, 0].map(() => +rnd(0.32, 0.46).toFixed(2));
    if (item === 'water') t.water = Math.round(rnd(188, 201));
  }
  t.clAvg = +(t.cl.reduce((a, b) => a + b, 0) / 3).toFixed(2);
  t.ok = {
    slump: Math.abs(t.slump - t.target) <= t.tol,
    air: Math.abs(t.air - 4.5) <= 1.5 + 1e-9,
    cl: t.clAvg <= 0.30,
    water: t.water <= 185,
  };
  t.pass = t.ok.slump && t.ok.air && t.ok.cl && t.ok.water;
  return t;
}

function drawPlate(ctx, x, y, w) {
  ctx.fillStyle = '#9aa3ab'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = '#c9d0d6'; ctx.fillRect(x, y, w, 3);
}
function drawCone(ctx, cx, baseY, H, fillFrac = 0, lift = 0) {
  // 슬럼프 콘: 윗지름 100, 밑지름 200, 높이 300mm (철판, 손잡이·발판)
  const bt = H * 0.33, bb = H * 0.66;
  const y0 = baseY - lift;
  if (fillFrac > 0) {
    ctx.fillStyle = '#8f8a80';
    const fy = baseY - H * fillFrac, wf = bb - (bb - bt) * fillFrac;
    ctx.beginPath(); ctx.moveTo(cx - bb / 2, baseY); ctx.lineTo(cx - wf / 2, fy); ctx.lineTo(cx + wf / 2, fy); ctx.lineTo(cx + bb / 2, baseY); ctx.fill();
    ctx.fillStyle = '#7a756c'; for (let i = 0; i < 18; i++) ctx.fillRect(cx - wf / 2 + ((i * 37) % Math.max(1, wf - 4)), fy + ((i * 23) % Math.max(1, (baseY - fy) - 3)), 3, 3);
  }
  const g = ctx.createLinearGradient(cx - bb / 2, 0, cx + bb / 2, 0);
  g.addColorStop(0, '#9fa8b0'); g.addColorStop(0.45, '#e6ebef'); g.addColorStop(1, '#8a939b');
  ctx.globalAlpha = fillFrac > 0 && lift === 0 ? 0.55 : 1;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - bb / 2, y0); ctx.lineTo(cx - bt / 2, y0 - H); ctx.lineTo(cx + bt / 2, y0 - H); ctx.lineTo(cx + bb / 2, y0); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#5d666e'; ctx.lineWidth = 2; ctx.stroke();
  // 발판·손잡이
  ctx.fillStyle = '#5d666e';
  ctx.fillRect(cx - bb / 2 - 12, y0 - 6, 14, 5); ctx.fillRect(cx + bb / 2 - 2, y0 - 6, 14, 5);
  ctx.strokeStyle = '#5d666e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx - (bt + bb) / 4 - 8, y0 - H * 0.62, 7, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + (bt + bb) / 4 + 8, y0 - H * 0.62, 7, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
}
function drawRod(ctx, x, y, len) {
  // 다짐봉: 지름 16mm 강봉, 끝은 반구형
  ctx.fillStyle = '#b8c0c6'; ctx.fillRect(x - 3, y - len, 6, len);
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#e4e8eb'; ctx.fillRect(x - 1, y - len, 2, len);
}
function drawSlumped(ctx, cx, baseY, H, slumpPx, collapse = false) {
  const bb = H * 0.66, bt = H * 0.33;
  const top = baseY - (H - slumpPx);
  const spread = bb + slumpPx * 0.9;
  ctx.fillStyle = '#8f8a80';
  ctx.beginPath();
  if (collapse) {
    ctx.moveTo(cx - spread / 2 - 20, baseY); ctx.quadraticCurveTo(cx - 20, top + 30, cx + bt / 3, top + 10); ctx.lineTo(cx + spread / 2, baseY);
  } else {
    ctx.moveTo(cx - spread / 2, baseY);
    ctx.quadraticCurveTo(cx - spread / 2 + 6, top + (baseY - top) * 0.25, cx - bt * 0.75, top);
    ctx.quadraticCurveTo(cx, top - 4, cx + bt * 0.75, top);
    ctx.quadraticCurveTo(cx + spread / 2 - 6, top + (baseY - top) * 0.25, cx + spread / 2, baseY);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a756c'; for (let i = 0; i < 24; i++) ctx.fillRect(cx - spread / 3 + ((i * 41) % (spread * 0.66)), top + 6 + ((i * 29) % Math.max(4, baseY - top - 10)), 3, 3);
}
function drawAirMeter(ctx, W, needle, redLine, mode, air) {
  // 워싱턴형 에어미터: 원통 용기 + 클램프 뚜껑 + 압력계 + 손펌프
  const cx = W / 2;
  ctx.fillStyle = '#7c8a96'; ctx.fillRect(cx - 70, 170, 140, 70);
  ctx.fillStyle = '#a9b6c0'; ctx.fillRect(cx - 70, 170, 140, 8);
  ctx.fillStyle = '#5a6670'; ctx.fillRect(cx - 80, 160, 160, 14);
  ctx.fillStyle = '#d14b3c'; for (const x of [-74, 62]) ctx.fillRect(cx + x, 160, 12, 30); // 클램프
  ctx.fillStyle = '#5a6670'; ctx.fillRect(cx - 6, 128, 12, 32);
  ctx.fillStyle = '#444'; ctx.fillRect(cx + 40, 120, 8, 40); ctx.fillRect(cx + 34, 116, 20, 6); // 펌프
  ctx.fillStyle = '#e3e3e3'; ctx.beginPath(); ctx.arc(cx + 70, 150, 6, 0, 7); ctx.fill(); // 밸브
  // 압력계
  const gx = cx, gy = 80, R = 58;
  ctx.fillStyle = '#2f3a44'; ctx.beginPath(); ctx.arc(gx, gy, R + 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbfaf3'; ctx.beginPath(); ctx.arc(gx, gy, R, 0, Math.PI * 2); ctx.fill();
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  const ang = (v) => a0 + (a1 - a0) * v; // v 0..1
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.fillStyle = '#333'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i <= 10; i++) {
    const a = ang(i / 10);
    ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (R - 3), gy + Math.sin(a) * (R - 3)); ctx.lineTo(gx + Math.cos(a) * (R - 10), gy + Math.sin(a) * (R - 10)); ctx.stroke();
    if (mode === 'air') ctx.fillText(String(i), gx + Math.cos(a) * (R - 19), gy + Math.sin(a) * (R - 19) + 3);
  }
  for (let i = 0; i <= 50; i++) { const a = ang(i / 50); ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (R - 3), gy + Math.sin(a) * (R - 3)); ctx.lineTo(gx + Math.cos(a) * (R - 6), gy + Math.sin(a) * (R - 6)); ctx.stroke(); }
  if (mode === 'press') {
    ctx.strokeStyle = '#e02020'; ctx.lineWidth = 4;
    const a = ang(redLine);
    ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (R - 2), gy + Math.sin(a) * (R - 2)); ctx.lineTo(gx + Math.cos(a) * (R - 16), gy + Math.sin(a) * (R - 16)); ctx.stroke();
    ctx.fillStyle = '#e02020'; ctx.fillText('초기압력', gx, gy + 30);
  } else { ctx.fillStyle = '#333'; ctx.fillText('공기량 %', gx, gy + 30); }
  const a = ang(needle);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (R - 8), gy + Math.sin(a) * (R - 8)); ctx.stroke();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(gx, gy, 5, 0, 7); ctx.fill();
}
function drawSaltMeter(ctx, x, y, reading, label) {
  // 염분측정기: 손바닥만 한 디지털 본체 + 탐침
  ctx.fillStyle = '#2d6fb5'; ctx.beginPath(); ctx.roundRect(x, y, 90, 130, 12); ctx.fill();
  ctx.fillStyle = '#bfe3c4'; ctx.fillRect(x + 10, y + 14, 70, 36);
  ctx.fillStyle = '#123'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText(reading, x + 45, y + 40);
  ctx.font = '9px sans-serif'; ctx.fillText('kg/m³', x + 45, y + 48);
  ctx.fillStyle = '#ddd'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 22 + i * 23, y + 75, 8, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText(label, x + 45, y + 110);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 45, y + 130); ctx.quadraticCurveTo(x + 45, y + 160, x + 75, y + 165); ctx.stroke();
  ctx.fillStyle = '#888'; ctx.fillRect(x + 72, y + 160, 26, 8);
}
function drawWaterMeter(ctx, x, y, reading) {
  // 단위수량 측정기: 본체 + 시료 용기
  ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.roundRect(x, y, 110, 90, 10); ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1f2a33'; ctx.fillRect(x + 10, y + 10, 90, 34);
  ctx.fillStyle = '#7dff9a'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText(reading, x + 55, y + 34);
  ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.fillText('단위수량 kg/m³', x + 55, y + 62);
  ctx.fillStyle = '#e58a3a'; ctx.fillRect(x + 20, y + 70, 70, 12);
  ctx.fillStyle = '#9aa3ab'; ctx.fillRect(x + 25, y + 92, 60, 30); ctx.fillStyle = '#8f8a80'; ctx.fillRect(x + 28, y + 98, 54, 22);
}

export function runRemicon({ stageMult = 1, onFinish }) {
  const t = makeTruck();
  const proc = { layers: [], lift: false, measure: false, airStop: false, airRead: false, clRead: false, retry: 0 };
  let measured = null, airPicked = null, clPicked = null;
  const m = openModal({ title: '🚛 레미콘 받아들이기 검사', body: '', cls: 'mg', closable: true });
  sfx('horn');
  const W = 300, H = 280;
  const header = () => h('div', { class: 'delivery' },
    h('div', {}, h('b', {}, '납품서 '), `규격 ${t.spec}`),
    h('div', { class: 'tiny' }, `굵은골재 최대치수 25mm · 호칭강도 24MPa · 슬럼프 ${t.target}±${t.tol}mm · 공기량 4.5±1.5% · 염화물 ≤0.30kg/m³ · 단위수량 ≤185kg/m³`));

  // 1) 슬럼프
  function slumpFill() {
    const { c, ctx } = hiCanvas(W, H);
    let layer = 0, needle = 0, dir = 1, run = true, rodY = 0;
    const result = h('div', { class: 'fb' }, '바늘이 가운데 "25회" 칸에 왔을 때 다지기! (3층)');
    const btn = h('button', { class: 'btn primary big' }, '다지기!');
    const frame = () => {
      if (!run) return;
      needle += dir * 0.022; if (needle > 1) { needle = 1; dir = -1; } if (needle < 0) { needle = 0; dir = 1; }
      rodY = Math.max(0, rodY - 3);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H);
      drawPlate(ctx, 40, 220, 220);
      drawCone(ctx, 150, 220, 150, layer / 3 * 0.98);
      drawRod(ctx, 150 + Math.sin(needle * 9) * 18, 220 - (layer / 3) * 150 + 10 - rodY, 120);
      // 게이지
      ctx.fillStyle = '#ffd1c4'; ctx.fillRect(20, 246, 260, 18);
      ctx.fillStyle = '#c7f0c2'; ctx.fillRect(20 + 260 * 0.38, 246, 260 * 0.24, 18);
      ctx.fillStyle = '#333'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('부족', 55, 259); ctx.fillText('25회', 150, 259); ctx.fillText('과다', 245, 259);
      ctx.fillStyle = '#111'; ctx.fillRect(20 + 260 * needle - 2, 242, 4, 26);
      ctx.fillStyle = '#333'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(`${Math.min(layer + 1, 3)}층 / 3층`, 150, 18);
      requestAnimationFrame(frame);
    };
    btn.onclick = () => {
      const ok = needle >= 0.38 && needle <= 0.62;
      proc.layers.push(ok); sfx('tamp'); rodY = 20; layer++;
      result.textContent = ok ? `${layer}층 다짐 적정 (25회) 👍` : (needle < 0.38 ? `${layer}층 다짐 부족 — 공극이 남아요` : `${layer}층 다짐 과다 — 재료가 분리돼요`);
      result.className = 'fb ' + (ok ? 'good' : 'bad');
      if (layer >= 3) { btn.disabled = true; setTimeout(() => { run = false; slumpLift(); }, 700); }
    };
    m.setBody(h('div', { class: 'col' }, header(), h('div', { class: 'step' }, '1단계 · 슬럼프 시험 (KS F 2402) — 채우고 다지기'), c, btn, result));
    frame();
  }
  function slumpLift() {
    const { c, ctx } = hiCanvas(W, H);
    let lift = 0, start = 0, dragging = false, lastY = 0, done = false, collapse = false, slumpPx = 0;
    const info = h('div', { class: 'fb' }, '콘을 손가락으로 잡고 위로 천천히 끌어 올리세요. (2~3초)');
    const timerEl = h('div', { class: 'timer' }, '0.0초');
    const target = t.slump / 300 * 150;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H);
      drawPlate(ctx, 30, 230, 240);
      if (lift < 150 && !done) drawCone(ctx, 150, 230, 150, 0.98, 0);
      if (done || lift > 0) {
        if (lift > 0 && !done) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 230 - lift + 2); ctx.restore(); }
        drawSlumped(ctx, 150, 230, 150, done ? slumpPx : Math.min(target, lift * target / 150) * 0.3, collapse);
        drawCone(ctx, 150, 230, 150, 0, lift);
      }
      ctx.fillStyle = '#c33'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      if (!dragging && !done) ctx.fillText('⬆ 위로 드래그', 150, 40);
    };
    draw();
    const yOf = (e) => { const r = c.getBoundingClientRect(); return (e.clientY - r.top) * (H / r.height); };
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => { if (done) return; dragging = true; start = performance.now(); lastY = yOf(e); c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!dragging || done) return;
      const y = yOf(e); lift = Math.max(0, Math.min(170, lift + (lastY - y))); lastY = y;
      timerEl.textContent = ((performance.now() - start) / 1000).toFixed(1) + '초';
      draw();
      if (lift >= 165) finish();
    });
    c.addEventListener('pointerup', () => { if (dragging && !done && lift < 165) { dragging = false; info.textContent = '끝까지 들어 올려야 해요. 다시 처음부터 천천히!'; lift = 0; draw(); } });
    const finish = () => {
      dragging = false; const sec = (performance.now() - start) / 1000;
      timerEl.textContent = sec.toFixed(1) + '초';
      if (sec < 1.9) {
        collapse = true; done = true; slumpPx = target; draw(); sfx('bad'); proc.retry++;
        info.className = 'fb bad'; info.textContent = `${sec.toFixed(1)}초 — 너무 빨라요! 한쪽이 무너졌어요(전단 붕괴). 시료를 다시 채워 처음부터!`;
        info.append(h('button', { class: 'btn', onclick: () => slumpLift() }, '다시 하기'));
        return;
      }
      proc.lift = sec <= 3.6;
      done = true;
      let k = 0; const it = setInterval(() => { k += 0.08; slumpPx = target * Math.min(1, k); draw(); if (k >= 1) { clearInterval(it); setTimeout(slumpMeasure, 400); } }, 30);
      info.className = 'fb ' + (proc.lift ? 'good' : ''); info.textContent = proc.lift ? `${sec.toFixed(1)}초 — 적정 속도로 들어 올렸어요!` : `${sec.toFixed(1)}초 — 조금 느렸어요 (기준 2~3초)`;
      sfx('drop');
    };
    m.setBody(h('div', { class: 'col' }, header(), h('div', { class: 'step' }, '1단계 · 슬럼프 시험 — 콘 들어 올리기'), c, timerEl, info));
  }
  function slumpMeasure() {
    const { c, ctx } = hiCanvas(W, H);
    const base = 230, Hc = 150, target = t.slump / 300 * Hc;
    let py = base - Hc + 30; // 측정자 위치(px)
    const reading = () => Math.max(0, r5((py - (base - Hc)) / Hc * 300));
    const out = h('div', { class: 'reading' });
    const draw = () => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H);
      drawPlate(ctx, 20, base, 260);
      drawSlumped(ctx, 110, base, Hc, target);
      drawCone(ctx, 225, base, Hc, 0, 0); // 옆에 뒤집지 않고 세워 둔 콘(높이 기준)
      // 콘 위에 걸친 다짐봉(기준선)
      ctx.fillStyle = '#b8c0c6'; ctx.fillRect(60, base - Hc - 5, 200, 5);
      // 측정자(자)
      ctx.fillStyle = '#ffd400'; ctx.fillRect(100, base - Hc, 18, py - (base - Hc));
      ctx.fillStyle = '#333'; ctx.font = '8px sans-serif';
      for (let mm = 0; mm <= 300; mm += 10) { const y = base - Hc + mm / 300 * Hc; if (y > py) break; ctx.fillRect(100, y, mm % 50 ? 4 : 9, 1); }
      ctx.fillStyle = '#d32'; ctx.fillRect(88, py - 1, 42, 3);
      ctx.fillStyle = '#d32'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('◀ 끌어서 맞추기', 134, py + 4);
      out.textContent = `측정값: ${reading()} mm`;
    };
    draw();
    c.style.touchAction = 'none';
    let drag = false;
    const yOf = (e) => { const r = c.getBoundingClientRect(); return (e.clientY - r.top) * (H / r.height); };
    c.addEventListener('pointerdown', (e) => { drag = true; c.setPointerCapture(e.pointerId); py = Math.max(base - Hc, Math.min(base - 5, yOf(e))); draw(); });
    c.addEventListener('pointermove', (e) => { if (!drag) return; py = Math.max(base - Hc, Math.min(base - 5, yOf(e))); draw(); });
    c.addEventListener('pointerup', () => { drag = false; });
    const btn = h('button', { class: 'btn primary big', onclick: () => {
      measured = reading(); proc.measure = Math.abs(measured - t.slump) <= 5; sfx('tap'); airStage();
    } }, '이 값으로 기록 (5mm 단위)');
    m.setBody(h('div', { class: 'col' }, header(), h('div', { class: 'step' }, '1단계 · 슬럼프 측정 — 측정자를 콘크리트 윗면 중앙에 맞추세요'), c, out, btn));
  }

  // 2) 공기량
  function airStage() {
    const { c, ctx } = hiCanvas(W, 250);
    const red = 0.62; let needle = 0, dir = 1, run = true, mode = 'press';
    const info = h('div', { class: 'fb' }, '펌프로 압력을 넣는 중… 바늘이 빨간 초기압력선에 왔을 때 멈춤!');
    const btn = h('button', { class: 'btn primary big' }, '멈춤!');
    const frame = () => {
      if (!run) return;
      if (mode === 'press') { needle += dir * 0.016; if (needle > 0.95) dir = -1; if (needle < 0.1) dir = 1; }
      ctx.clearRect(0, 0, W, 250); ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, 250);
      drawAirMeter(ctx, W, needle, red, mode, t.air);
      requestAnimationFrame(frame);
    };
    frame();
    btn.onclick = () => {
      const ok = Math.abs(needle - red) <= 0.05;
      if (!ok) { sfx('bad'); proc.retry++; info.className = 'fb bad'; info.textContent = '초기압력선에서 벗어났어요. 다시 맞춰 보세요!'; return; }
      proc.airStop = proc.retry < 3; sfx('good'); btn.remove();
      info.className = 'fb good'; info.textContent = '작동 밸브를 엽니다… 쉬익!';
      mode = 'air';
      const from = needle, to = t.air / 10;
      let k = 0; const it = setInterval(() => { k += 0.05; needle = from + (to - from) * Math.min(1, k) + Math.sin(k * 20) * 0.02 * (1 - Math.min(1, k)); if (k >= 1.2) { clearInterval(it); needle = to; askAir(); } }, 30);
    };
    const askAir = () => {
      const opts = shuffle([t.air, +(t.air + 0.8).toFixed(1), +(t.air - 0.7).toFixed(1), +(t.air + 1.6).toFixed(1)].filter((v) => v > 0));
      info.className = 'fb'; info.textContent = '바늘이 가리키는 공기량은?';
      info.append(h('div', { class: 'grid2' }, opts.map((v) => h('button', { class: 'btn', onclick: () => { airPicked = v; proc.airRead = v === t.air; run = false; sfx('tap'); clStage(); } }, `${v.toFixed(1)}%`))));
    };
    m.setBody(h('div', { class: 'col' }, header(), h('div', { class: 'step' }, '2단계 · 공기량 시험 (KS F 2421 압력법, 워싱턴형 에어미터)'), c, btn, info));
  }

  // 3) 염화물·단위수량
  function clStage() {
    const { c, ctx } = hiCanvas(W, 230);
    const shown = ['---', '---', '---']; let water = '---';
    const draw = () => {
      ctx.clearRect(0, 0, W, 230); ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, 230);
      drawSaltMeter(ctx, 18, 20, shown.filter((s) => s !== '---').slice(-1)[0] || '---', '염분측정기');
      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
      shown.forEach((s, i) => ctx.fillText(`${i + 1}회 측정: ${s}`, 125, 168 + i * 18));
      drawWaterMeter(ctx, 175, 20, water);
    };
    draw();
    const info = h('div', { class: 'fb' }, '자동 측정 중…');
    m.setBody(h('div', { class: 'col' }, header(), h('div', { class: 'step' }, '3단계 · 염화물(3회 측정) · 단위수량'), c, info));
    (async () => {
      for (let i = 0; i < 3; i++) { await sleep(450); shown[i] = t.cl[i].toFixed(2); sfx('tap'); draw(); }
      await sleep(350); water = String(t.water); sfx('tap'); draw();
      const opts = shuffle([t.clAvg, +(t.clAvg + 0.04).toFixed(2), +(Math.max(0.01, t.clAvg - 0.03)).toFixed(2), +(t.clAvg + 0.09).toFixed(2)]);
      info.textContent = `염화물 3회 측정값의 평균은? (단위수량 ${t.water}kg/m³)`;
      info.append(h('div', { class: 'grid2' }, opts.map((v) => h('button', { class: 'btn', onclick: () => { clPicked = v; proc.clRead = v === t.clAvg; sfx('tap'); judge(); } }, `${v.toFixed(2)} kg/m³`))));
    })();
  }

  // 4) 판정
  function judge() {
    const choice = (k) => () => report(k);
    m.setBody(h('div', { class: 'col' }, header(),
      h('div', { class: 'step' }, '4단계 · 판정'),
      h('table', { class: 'tbl' },
        h('tr', {}, h('th', {}, '항목'), h('th', {}, '측정'), h('th', {}, '기준')),
        h('tr', {}, h('td', {}, '슬럼프'), h('td', {}, `${measured} mm`), h('td', {}, `${t.target}±${t.tol}`)),
        h('tr', {}, h('td', {}, '공기량'), h('td', {}, `${airPicked?.toFixed(1)} %`), h('td', {}, '4.5±1.5')),
        h('tr', {}, h('td', {}, '염화물'), h('td', {}, `${clPicked?.toFixed(2)}`), h('td', {}, '≤ 0.30')),
        h('tr', {}, h('td', {}, '단위수량'), h('td', {}, `${t.water}`), h('td', {}, '≤ 185'))),
      h('div', { class: 'col gap6' },
        h('button', { class: 'btn big good', onclick: choice('pass') }, '✅ 합격 · 타설'),
        h('button', { class: 'btn big bad', onclick: choice('reject') }, '↩️ 불합격 · 반송'),
        h('button', { class: 'btn big', onclick: choice('water') }, '💧 물을 타서 슬럼프 맞추기'))));
  }
  function report(k) {
    const correct = (k === 'pass' && t.pass) || (k === 'reject' && !t.pass);
    const pts = proc.layers.filter(Boolean).length + (proc.lift ? 2 : 0) + (proc.measure ? 2 : 0) + (proc.airStop ? 1 : 0) + (proc.airRead ? 1 : 0) + (proc.clRead ? 1 : 0);
    const reward = Math.round(((correct ? 6 : 1) + pts * 0.6) * stageMult);
    sfx(correct ? 'fanfare' : 'bad');
    const mark = (ok) => h('td', { class: ok ? 'ok' : 'ng' }, ok ? '적합' : '부적합');
    const why = k === 'water' ? '레미콘에 물을 타는 "가수"는 금지예요! 물-시멘트비가 커져 강도·내구성이 떨어집니다.'
      : correct ? (t.pass ? '모든 항목이 기준 안이라 타설해도 좋아요.' : '기준을 벗어난 항목이 있어 반송이 정답이에요.')
      : (t.pass ? '모든 항목이 기준 안이었어요. 멀쩡한 레미콘을 반송하면 공기와 비용이 손해예요.' : '부적합 항목이 있었어요! 그대로 타설하면 구조물 품질에 문제가 생겨요.');
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'report' },
        h('div', { class: 'report-title' }, '시험 성적표'),
        h('div', { class: 'tiny' }, `규격 ${t.spec} · 지예건설 현장 품질관리`),
        h('table', { class: 'tbl' },
          h('tr', {}, h('th', {}, '항목'), h('th', {}, '실제'), h('th', {}, '기준'), h('th', {}, '판정')),
          h('tr', {}, h('td', {}, '슬럼프'), h('td', {}, `${t.slump}mm`), h('td', {}, `${t.target}±${t.tol}`), mark(t.ok.slump)),
          h('tr', {}, h('td', {}, '공기량'), h('td', {}, `${t.air}%`), h('td', {}, '4.5±1.5'), mark(t.ok.air)),
          h('tr', {}, h('td', {}, '염화물'), h('td', {}, `${t.clAvg.toFixed(2)}`), h('td', {}, '≤0.30'), mark(t.ok.cl)),
          h('tr', {}, h('td', {}, '단위수량'), h('td', {}, `${t.water}`), h('td', {}, '≤185'), mark(t.ok.water))),
        h('div', { class: 'report-judge ' + (correct ? 'good' : 'bad') }, `내 판정: ${k === 'pass' ? '합격·타설' : k === 'reject' ? '불합격·반송' : '가수(물 타기)'} → ${correct ? '정답!' : '오답'}`),
        h('div', { class: 'tiny' }, why),
        h('div', { class: 'tiny' }, `절차 점수 ${pts}/10 — 다짐 ${proc.layers.filter(Boolean).length}/3 · 콘 들기 ${proc.lift ? '○' : '×'} · 측정 ${proc.measure ? '○' : '×'}(실제 ${t.slump}, 기록 ${measured}) · 압력 맞춤 ${proc.airStop ? '○' : '×'} · 공기량 읽기 ${proc.airRead ? '○' : '×'} · 염화물 평균 ${proc.clRead ? '○' : '×'}`),
        h('div', { class: 'tiny muted' }, '기준: KS F 4009(레디믹스트 콘크리트), KCS 14 20 10. 실제 현장은 최신 개정 원문을 확인하세요.')),
      h('div', { class: 'lesson' }, h('b', {}, '💡 배운 점'), h('div', {}, '받아들이기 검사는 타설 전에 해요. 기준을 벗어나면 물을 타지 말고 반송!')),
      h('div', { class: 'reward' }, `보상 +${reward}만원`),
      h('button', { class: 'btn primary big', onclick: () => { m.close(); } }, '확인')));
    m.el.dataset.done = '1';
    onFinish?.({ reward, correct, rejected: k === 'reject' && !t.pass, choice: k });
  }
  slumpFill();
  return m;
}

/* ================= 현장 첫 출근: 레미콘 검사 (쉬운 버전) ================= */
export function runRemiconLite({ stageMult = 1, lang = 'ko', onFinish }) {
  const kinds = [{ k: 'wet', s: r5(rnd(215, 240)) }, { k: 'ok', s: r5(rnd(135, 165)) }, { k: 'stiff', s: r5(rnd(60, 90)) }];
  const truck = Math.random() < 0.45 ? kinds[1] : kinds[Math.random() < 0.5 ? 0 : 2];
  const m = openModal({ title: '🚛 레미콘 검사 (쉬운 버전)', body: '', cls: 'mg', closable: true });
  sfx('horn');
  const W = 300, H = 250, Hc = 150;
  let pts = 0;
  const head = h('div', { class: 'delivery' }, h('b', {}, '납품서 '), '25-24-150 · 슬럼프 기준 150 ± 25mm');
  function lift() {
    const { c, ctx } = hiCanvas(W, H);
    let l = 0, start = 0, drag = false, lastY = 0, done = false;
    const info = h('div', { class: 'fb' }, '콘을 손가락으로 잡고 위로 천천히(2~3초) 끌어 올려요.');
    const draw = (sp = 0, collapse = false) => {
      ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H); drawPlate(ctx, 30, 220, 240);
      if (l > 0 || done) drawSlumped(ctx, 150, 220, Hc, sp, collapse);
      drawCone(ctx, 150, 220, Hc, l > 0 || done ? 0 : 0.98, l);
      if (!drag && !done) { ctx.fillStyle = '#c33'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⬆ 위로 드래그', 150, 30); }
    };
    draw();
    const yOf = (e) => { const r = c.getBoundingClientRect(); return (e.clientY - r.top) * (H / r.height); };
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => { if (done) return; drag = true; start = performance.now(); lastY = yOf(e); c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (!drag || done) return; const y = yOf(e); l = Math.max(0, Math.min(170, l + (lastY - y))); lastY = y; draw(truck.s / 300 * Hc * Math.min(1, l / 150) * 0.3); if (l >= 165) fin(); });
    c.addEventListener('pointerup', () => { if (drag && !done && l < 165) { drag = false; l = 0; info.textContent = '끝까지 들어 올려야 해요. 다시!'; draw(); } });
    const fin = () => {
      drag = false; const sec = (performance.now() - start) / 1000;
      if (sec < 1.6) { done = true; draw(truck.s / 300 * Hc, true); sfx('bad'); info.className = 'fb bad'; info.textContent = `${sec.toFixed(1)}초 — 너무 빨라서 한쪽이 무너졌어요. 천천히 다시!`; info.append(h('button', { class: 'btn', onclick: lift }, '다시 하기')); return; }
      done = true; if (sec <= 4) pts++;
      sfx('drop'); let k = 0; const it = setInterval(() => { k += 0.1; draw(truck.s / 300 * Hc * Math.min(1, k)); if (k >= 1) { clearInterval(it); setTimeout(measure, 300); } }, 30);
      info.className = 'fb good'; info.textContent = `${sec.toFixed(1)}초 — 좋아요!`;
    };
    m.setBody(h('div', { class: 'col' }, head, h('div', { class: 'step' }, '1 · 슬럼프 콘 들어 올리기'), c, info));
  }
  function measure() {
    const { c, ctx } = hiCanvas(W, H);
    ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H); drawPlate(ctx, 20, 220, 260);
    drawSlumped(ctx, 110, 220, Hc, truck.s / 300 * Hc); drawCone(ctx, 225, 220, Hc, 0, 0);
    ctx.fillStyle = '#b8c0c6'; ctx.fillRect(60, 220 - Hc - 5, 200, 5);
    ctx.fillStyle = '#ffd400'; ctx.fillRect(100, 220 - Hc, 16, truck.s / 300 * Hc);
    ctx.fillStyle = '#d32'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(`${truck.s} mm`, 120, 220 - Hc + truck.s / 300 * Hc);
    m.setBody(h('div', { class: 'col' }, head, h('div', { class: 'step' }, '2 · 측정 — 콘 높이에서 내려앉은 만큼'), c,
      h('div', { class: 'reading' }, `슬럼프 ${truck.s} mm`), h('button', { class: 'btn primary big', onclick: pickPic }, '그림 고르기')));
  }
  function pic(k) {
    const { c, ctx } = hiCanvas(96, 80);
    ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, 96, 80); drawPlate(ctx, 4, 66, 88);
    const s = k === 'wet' ? 50 : k === 'ok' ? 26 : 10;
    ctx.save(); ctx.translate(48, 0); ctx.scale(0.45, 0.45); drawSlumped(ctx, 0, 146, 110, s * 2.2, false); ctx.restore();
    return c;
  }
  function pickPic() {
    const names = { wet: '너무 묽음', ok: '딱 좋음', stiff: '너무 됨' };
    const fb = h('div', { class: 'fb' }, '방금 잰 콘크리트와 같은 그림은?');
    const btns = shuffle(['wet', 'ok', 'stiff']).map((k) => h('button', { class: 'btn pic', onclick: (e) => {
      btns.forEach((b) => (b.disabled = true));
      const ok = k === truck.k; if (ok) pts++;
      sfx(ok ? 'good' : 'bad'); e.currentTarget.classList.add(ok ? 'right' : 'wrong');
      fb.className = 'fb ' + (ok ? 'good' : 'bad');
      fb.textContent = `${truck.s}mm는 "${names[truck.k]}"이에요. 기준 125~175mm.`;
      fb.append(h('button', { class: 'btn primary', onclick: decide }, '어떻게 할까요?'));
    } }, pic(k), h('div', {}, names[k])));
    m.setBody(h('div', { class: 'col' }, head, h('div', { class: 'step' }, '3 · 그림 고르기'), h('div', { class: 'grid3' }, btns), fb));
  }
  function decide() {
    const end = (choice) => {
      const pass = truck.k === 'ok';
      const correct = (choice === 'pass' && pass) || (choice === 'reject' && !pass);
      if (correct) pts += 2;
      const reward = Math.round(((correct ? 5 : 1) + pts) * stageMult);
      const why = choice === 'water' ? '레미콘에 물을 타면 절대 안 돼요! 강도가 떨어져요.' : correct ? (pass ? '기준 안이라 타설해요.' : '기준을 벗어나 반송이 정답!') : (pass ? '기준 안이었어요. 타설해도 돼요.' : '기준 밖이었어요. 반송해야 해요.');
      liteResult(m, { big: correct ? '✅ 정답!' : '❌ 오답', reward, lessonId: 'remiconLite', lang, good: correct, extra: h('div', { class: 'fb ' + (correct ? 'good' : 'bad') }, why) });
      onFinish?.({ reward, correct, rejected: choice === 'reject' && !pass, choice });
    };
    m.setBody(h('div', { class: 'col' }, head, h('div', { class: 'step' }, `4 · 판정 (슬럼프 ${truck.s}mm)`),
      h('button', { class: 'btn big good', onclick: () => end('pass') }, '✅ 합격 · 타설'),
      h('button', { class: 'btn big bad', onclick: () => end('reject') }, '↩️ 반송'),
      h('button', { class: 'btn big', onclick: () => end('water') }, '💧 물을 타서 맞추기')));
  }
  lift();
  return m;
}
function liteResult(m, { big, reward, lessonId, lang, good, extra }) {
  const L = FIELD_LESSON[lessonId];
  sfx(good ? 'fanfare' : 'coin');
  m.setBody(h('div', { class: 'col' }, h('div', { class: 'big-score' }, big), extra,
    h('div', { class: 'lesson' }, h('b', {}, `💡 ${FIELD_UI[lang]?.learned || '배운 점'}`), h('div', {}, L[lang] || L.ko), lang !== 'ko' ? h('div', { class: 'tl-ko' }, L.ko) : null),
    h('div', { class: 'reward' }, `보상 +${reward}만원`), h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')));
  m.el.dataset.done = '1';
}

/* ================= 건축 용어 퀴즈 ================= */
export function quizLevelFor(track, bIdx) {
  if (track !== 'student') return 0;
  if (bIdx >= 10) return 2; // 프랑스부터 실전
  if (bIdx >= 6) return 1; // 이집트부터 입문
  return 0;
}
export function runQuiz({ level = 0, stageMult = 1, onAnswer, onFinish, count = 5 }) {
  const m = openModal({ title: `📝 건축 용어 퀴즈 · ${QUIZ_LEVELS[level]}`, body: '', cls: 'mg' });
  // 현재 단계 3문제 + 아래 단계 섞기
  const cur = shuffle(QUIZ.filter((q) => q.lv === level));
  const low = shuffle(QUIZ.filter((q) => q.lv < level));
  const picks = shuffle(level === 0 ? cur.slice(0, count) : cur.slice(0, 4).concat(low.slice(0, count - 4))).slice(0, count);
  let i = 0, right = 0;
  const show = () => {
    if (i >= picks.length) return end();
    const q = picks[i];
    const order = shuffle(q.o.map((_, k) => k));
    const fb = h('div', { class: 'fb' });
    const btns = order.map((k) => h('button', { class: 'btn opt', onclick: (e) => {
      btns.forEach((b) => (b.disabled = true));
      const ok = k === q.a;
      if (ok) { right++; sfx('good'); e.currentTarget.classList.add('right'); } else { sfx('bad'); e.currentTarget.classList.add('wrong'); btns[order.indexOf(q.a)].classList.add('right'); }
      onAnswer?.(ok);
      fb.className = 'fb ' + (ok ? 'good' : 'bad');
      fb.append(h('b', {}, ok ? '정답! ' : '아쉬워요. '), q.ex, h('button', { class: 'btn primary', onclick: () => { i++; show(); } }, i < picks.length - 1 ? '다음 문제' : '결과 보기'));
    } }, q.o[k]));
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'qhead' }, h('span', { class: 'lvl lv' + q.lv }, `난이도: ${QUIZ_LEVELS[q.lv]}`), h('span', {}, `${i + 1} / ${picks.length}`)),
      h('div', { class: 'qtext' }, q.q), h('div', { class: 'col gap6' }, btns), fb));
  };
  const end = () => {
    const reward = Math.round((1 + right * 2) * stageMult);
    sfx(right >= 3 ? 'fanfare' : 'coin');
    m.setBody(h('div', { class: 'col' }, h('div', { class: 'big-score' }, `${right} / ${picks.length} 정답`), h('div', { class: 'lesson' }, h('b', {}, '💡 배운 점'), h('div', {}, picks[picks.length - 1].ex)), h('div', { class: 'reward' }, `보상 +${reward}만원`), h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')));
    onFinish?.({ reward, right });
  };
  show();
  return m;
}

/* ================= 현장 갈등 해결 ================= */
export function runConflict(conf, onResult) {
  const m = openModal({ title: '⚠️ 현장 갈등', body: '', cls: 'mg', closable: true });
  const ch = shuffle(conf.ch.map((c, i) => ({ ...c, i })));
  m.setBody(h('div', { class: 'col' },
    h('div', { class: 'conf-title' }, conf.title),
    h('div', { class: 'chat' }, h('div', { class: 'msg' }, h('b', {}, conf.who), h('div', { class: 'say' }, conf.desc))),
    h('div', { class: 'tiny muted' }, '해결 전에는 인부 작업량이 30% 줄어요.'),
    h('div', { class: 'col gap6' }, ch.map((c) => h('button', { class: 'btn opt', onclick: () => {
      sfx(c.s === 2 ? 'good' : c.s === 1 ? 'tap' : 'bad');
      m.setBody(h('div', { class: 'col' },
        h('div', { class: 'conf-title' }, c.s === 2 ? '👍 좋은 판단!' : c.s === 1 ? '🤔 절반의 해결' : '😟 아쉬운 판단'),
        h('div', { class: 'fb ' + (c.s === 2 ? 'good' : c.s === 1 ? '' : 'bad') }, c.ex),
        h('div', { class: 'tiny' }, c.s === 2 ? '현장 사기 +8' : c.s === 1 ? '현장 사기 +2' : '현장 사기 -8'),
        h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')));
      onResult?.(c.s);
    } }, c.t)))));
  return m;
}

/* ================= 인부와 대화 (카톡풍) ================= */
export function runTalk(talk, onResult) {
  const m = openModal({ title: `💬 ${talk.who}`, body: '', cls: 'talk', closable: true });
  const chat = h('div', { class: 'chat' });
  const choices = h('div', { class: 'col gap6' });
  m.setBody(h('div', { class: 'col' }, chat, choices));
  const add = (who, text, mine = false) => {
    const el = h('div', { class: 'msg' + (mine ? ' mine' : '') }, mine ? null : h('b', {}, who), h('div', { class: 'say' }, text));
    chat.append(el); sfx('pop'); chat.scrollTop = chat.scrollHeight;
  };
  (async () => {
    for (const l of talk.lines) {
      const typing = h('div', { class: 'msg' }, h('b', {}, talk.who), h('div', { class: 'say typing' }, '•••'));
      chat.append(typing); await sleep(650); typing.remove(); add(talk.who, l);
    }
    shuffle(talk.ch).forEach((c) => choices.append(h('button', { class: 'btn opt', onclick: async () => {
      choices.innerHTML = '';
      add('나', c.t, true);
      await sleep(600);
      add(talk.who, c.r);
      const d = c.m;
      choices.append(h('div', { class: 'morale ' + (d >= 0 ? 'up' : 'down') }, `현장 사기 ${d >= 0 ? '+' : ''}${d}`), h('button', { class: 'btn primary', onclick: () => m.close() }, '닫기'));
      onResult?.(d);
    } }, c.t)));
  })();
  return m;
}
