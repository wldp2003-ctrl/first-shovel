// 2차 미니게임 — 학생: 압축강도·철근 배근·공정표 / 현장 첫 출근: 창문 닦기·숨기·점심·현장 말 퀴즈
import { h, openModal, hiCanvas, shuffle, sleep } from './ui.js';
import { sfx } from './audio.js';
import { FIELD_TERMS, FIELD_UI, FIELD_LESSON } from './data2.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// 공통 결과 카드: 점수 · 보상 · 배운 점 한 줄 (현장 트랙은 선택 언어 + 작은 한국어)
export function resultCard(m, { big, reward, lesson, lessonId, lang = 'ko', extra = null, good = true }) {
  const L = lessonId && FIELD_LESSON[lessonId];
  const lessonEl = L
    ? h('div', { class: 'lesson' }, h('b', {}, `💡 ${FIELD_UI[lang]?.learned || '배운 점'}`), h('div', {}, L[lang] || L.ko), lang !== 'ko' ? h('div', { class: 'tl-ko' }, L.ko) : null)
    : h('div', { class: 'lesson' }, h('b', {}, '💡 배운 점'), h('div', {}, lesson));
  sfx(good ? 'fanfare' : 'coin');
  m.setBody(h('div', { class: 'col' },
    h('div', { class: 'big-score' }, big), extra, lessonEl,
    h('div', { class: 'reward' }, `보상 +${reward}만원`),
    h('button', { class: 'btn primary big', onclick: () => m.close() }, '확인')));
  m.el.dataset.done = '1';
}

/* ================= 학생 2. 공시체 압축강도 시험 ================= */
export function runCyl({ stageMult = 1, onFinish }) {
  const m = openModal({ title: '🧪 공시체 압축강도 시험', body: '', cls: 'mg' });
  const AREA = Math.PI * 50 * 50; // 지름 100mm → 7,854mm²
  const FCN = 24;
  const f = +rnd(19.5, 31).toFixed(1); // 이 공시체의 실제 강도
  const pmax = +(f * AREA / 1000).toPrecision(3); // kN, 유효숫자 3자리
  const fTrue = +(pmax * 1000 / AREA).toFixed(1);
  const score = { rate: true, calc: false, judge: false, tries: 0 };
  const W = 300, H = 230, SPEED = 4;

  function intro() {
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'step' }, '1단계 · 공시체 확인'),
      h('div', { class: 'fb' }, '재령 28일 동안 표준 양생(20±2°C 수중)한 원기둥 공시체예요. 지름 100mm × 높이 200mm, 호칭강도 24MPa 콘크리트.'),
      cylArt(),
      h('div', { class: 'tiny muted' }, '버튼을 누르고 있으면 하중이 올라가요. 재하 속도를 초록 띠(0.6±0.2 MPa/s, KS F 2405) 안에 유지하세요. 게임에선 4배속으로 보여 줘요.'),
      h('button', { class: 'btn primary big', onclick: test }, '압축시험기에 올리기')));
  }
  function cylArt() {
    const { c, ctx } = hiCanvas(300, 120);
    ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, 300, 120);
    ctx.fillStyle = '#555'; ctx.fillRect(90, 6, 120, 14); ctx.fillRect(90, 100, 120, 14);
    const g = ctx.createLinearGradient(125, 0, 175, 0); g.addColorStop(0, '#9b9b95'); g.addColorStop(0.5, '#d8d8d2'); g.addColorStop(1, '#8f8f89');
    ctx.fillStyle = g; ctx.fillRect(125, 20, 50, 80);
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.fillText('Ø100', 182, 64); ctx.fillText('200', 100, 64);
    return c;
  }
  function test() {
    const { c, ctx } = hiCanvas(W, H);
    let stress = 0, rate = 0, over = 0, slow = 0, holding = false, run = true, broke = false, t = 0;
    const hist = [];
    const read = h('div', { class: 'reading' }, '0.0 kN');
    const info = h('div', { class: 'fb' }, '버튼을 누르고 있으면 하중이 올라가요. 너무 오래 누르면 속도가 빨라져요!');
    const btn = h('button', { class: 'btn primary big hold' }, '꾹 눌러 가압');
    const on = (e) => { e.preventDefault(); holding = true; };
    const off = () => { holding = false; };
    btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointerleave', off); btn.addEventListener('pointercancel', off);
    let last = performance.now();
    const draw = () => {
      ctx.fillStyle = '#fbfaf3'; ctx.fillRect(0, 0, W, H);
      // 축
      ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(36, 10); ctx.lineTo(36, 170); ctx.lineTo(290, 170); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      for (let k = 0; k <= 300; k += 100) { const y = 170 - k / 300 * 160; ctx.fillText(k, 32, y + 3); ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(37, y); ctx.lineTo(290, y); ctx.stroke(); }
      ctx.textAlign = 'left'; ctx.fillText('하중 kN', 40, 12); ctx.fillText('시간 →', 250, 182);
      ctx.strokeStyle = '#d33'; ctx.lineWidth = 2.5; ctx.beginPath();
      hist.forEach((p, i) => { const x = 36 + i * 0.9, y = 170 - p / 300 * 160; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      // 재하 속도 게이지 (0~1.4 MPa/s)
      const gx = 36, gy = 196, gw = 254;
      ctx.fillStyle = '#ffd1c4'; ctx.fillRect(gx, gy, gw, 14);
      ctx.fillStyle = '#c7f0c2'; ctx.fillRect(gx + gw * 0.4 / 1.4, gy, gw * 0.4 / 1.4, 14);
      ctx.fillStyle = '#111'; ctx.fillRect(gx + gw * Math.min(1, rate / 1.4) - 2, gy - 3, 4, 20);
      ctx.fillStyle = '#333'; ctx.font = '10px sans-serif'; ctx.fillText(`재하 속도 ${rate.toFixed(2)} MPa/s`, gx, gy + 28);
      ctx.textAlign = 'right'; ctx.fillText('0.4  ~  0.8', gx + gw, gy + 28); ctx.textAlign = 'left';
      if (broke) { ctx.fillStyle = '#d33'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('💥 파괴!', 200, 40); }
    };
    const frame = (now) => {
      if (!run) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!broke) {
        rate = Math.max(0, rate + (holding ? 0.55 : -0.7) * dt);
        stress += rate * SPEED * dt; t += dt;
        if (Math.floor(t * 12) > hist.length) hist.push(stress * AREA / 1000);
        if (rate > 0.8) over += dt; else over = Math.max(0, over - dt * 0.5);
        if (stress > 1 && rate < 0.4) slow += dt;
        read.textContent = `${(stress * AREA / 1000).toFixed(1)} kN`;
        if (over > 0.9) { run = false; score.rate = false; score.tries++; sfx('bad'); info.className = 'fb bad'; info.textContent = '재하 속도 초과! 너무 빨리 누르면 강도가 실제보다 높게 나와요. 시험 무효 — 새 공시체로 다시!'; btn.disabled = true; info.append(h('button', { class: 'btn', onclick: test }, '다시 시험')); draw(); return; }
        if (stress >= f) {
          broke = true; sfx('thud'); hist.push(pmax);
          read.textContent = `최대하중 ${pmax} kN`; btn.disabled = true;
          info.className = 'fb good'; info.textContent = slow > 3 ? '파괴! (속도가 느린 구간이 길었어요)' : '파괴! 일정한 속도로 잘 눌렀어요.';
          if (slow > 3) score.rate = false;
          draw(); setTimeout(() => { run = false; calc(); }, 1100); return;
        }
      }
      draw(); requestAnimationFrame(frame);
    };
    m.setBody(h('div', { class: 'col' }, h('div', { class: 'step' }, '2단계 · 압축시험 (KS F 2405)'), c, read, btn, info));
    requestAnimationFrame(frame);
  }
  function calc() {
    const opts = shuffle([fTrue, +(pmax * 1000 / (Math.PI * 100 * 100)).toFixed(1), +(pmax * 1000 / 10000).toFixed(1), +(fTrue * 1.27).toFixed(1)]);
    const fb = h('div', { class: 'fb' });
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'step' }, '3단계 · 강도 계산'),
      h('div', { class: 'reading' }, `최대하중 P = ${pmax} kN`),
      h('div', { class: 'fb' }, '압축강도 = 최대하중 ÷ 단면적. 지름 100mm 원의 단면적은? (1 kN = 1,000 N, 1 MPa = 1 N/mm²)'),
      h('div', { class: 'grid2' }, opts.map((v) => h('button', { class: 'btn opt', onclick: (e) => {
        score.calc = v === fTrue;
        e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => (b.disabled = true));
        e.currentTarget.classList.add(score.calc ? 'right' : 'wrong'); sfx(score.calc ? 'good' : 'bad');
        fb.className = 'fb ' + (score.calc ? 'good' : 'bad');
        fb.textContent = `${pmax.toLocaleString()} kN × 1,000 ÷ (π × 50²) = ${pmax * 1000 | 0} ÷ 7,854 ≈ ${fTrue} MPa. ` + (score.calc ? '정답!' : '반지름은 50mm예요(지름 100mm).');
        fb.append(h('button', { class: 'btn primary', onclick: judge }, '판정하기'));
      } }, `${v} MPa`))), fb));
  }
  function judge() {
    const pass = fTrue >= FCN;
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'step' }, '4단계 · 판정'),
      h('div', { class: 'reading' }, `이 공시체 강도 ${fTrue} MPa · 호칭강도 ${FCN} MPa`),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn big good', onclick: () => end(true, pass) }, '✅ 호칭강도 이상'),
        h('button', { class: 'btn big bad', onclick: () => end(false, pass) }, '❌ 호칭강도 미달'))));
  }
  function end(saidPass, pass) {
    score.judge = saidPass === pass;
    const reward = Math.round((1 + (score.rate ? 3 : 0) + (score.calc ? 4 : 0) + (score.judge ? 3 : 0)) * stageMult);
    resultCard(m, { big: `${(score.rate ? 1 : 0) + (score.calc ? 1 : 0) + (score.judge ? 1 : 0)} / 3 단계 성공`, reward, good: score.judge && score.calc,
      extra: h('div', { class: 'tiny' }, `재하 속도 ${score.rate ? '○' : '×'} · 강도 계산 ${score.calc ? '○' : '×'} · 판정 ${score.judge ? '○' : '×'} (${pass ? '이상' : '미달'}이 정답)`),
      lesson: '강도 = 최대하중 ÷ 단면적. 실제 받아들이기 판정은 공시체 3개 평균이 1회 시험값이고, 호칭강도 35MPa 이하는 "연속 3회 평균 ≥ 호칭강도, 1회 시험값 ≥ 호칭강도 − 3.5MPa"를 함께 봐요(KS F 4009 — 최신 원문 확인).' });
    onFinish?.({ reward, correct: score.judge && score.calc });
  }
  intro();
  return m;
}

/* ================= 학생 3. 철근 배근 퍼즐 ================= */
export function runRebar({ stageMult = 1, level = 0, onFinish }) {
  const m = openModal({ title: '🧱 철근 배근 퍼즐', body: '', cls: 'mg' });
  const B = level >= 1 ? 350 : 300, D = level >= 1 ? 600 : 500, N = level >= 1 ? 5 : 4, DIA = 22, COVER = 40;
  const SMIN = Math.ceil(Math.max(25, DIA, 25 * 4 / 3)); // 34mm
  const W = 300, H = 330, S = Math.min(200 / B, 250 / D); // px per mm
  const ox = (W - B * S) / 2, oy = 14;
  const bars = [], spacers = [];
  let mode = 'bar', drag = null, fails = 0, done = false;
  const { c, ctx } = hiCanvas(W, H);
  c.style.touchAction = 'none';
  const info = h('div', { class: 'fb' }, `아래 D22 철근을 끌어다 보 아래쪽에 ${N}개 놓으세요. 점선(피복 ${COVER}mm) 안쪽, 철근 사이 순간격 ${SMIN}mm 이상!`);
  const toMM = (px, py) => ({ x: (px - ox) / S, y: (py - oy) / S });
  const toPX = (x, y) => ({ x: ox + x * S, y: oy + y * S });
  const palette = { x: W / 2, y: oy + D * S + 38 };
  const check = () => {
    const bad = new Set(), msgs = new Set();
    bars.forEach((b, i) => {
      const r = DIA / 2;
      if (b.x - r < COVER || b.x + r > B - COVER || b.y - r < COVER || b.y + r > D - COVER) { bad.add(i); msgs.add(`피복두께 ${COVER}mm 부족`); }
      bars.forEach((o, j) => { if (j <= i) return; const clear = Math.hypot(b.x - o.x, b.y - o.y) - DIA; if (clear < SMIN) { bad.add(i); bad.add(j); msgs.add(`철근 순간격 ${SMIN}mm 미만`); } });
    });
    return { bad, msgs: [...msgs] };
  };
  const draw = () => {
    const { bad } = check();
    ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9c6bd'; ctx.fillRect(ox, oy, B * S, D * S);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, B * S, D * S);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2f6fbf'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + COVER * S, oy + COVER * S, (B - 2 * COVER) * S, (D - 2 * COVER) * S); ctx.setLineDash([]);
    ctx.fillStyle = '#2f6fbf'; ctx.font = '10px sans-serif'; ctx.fillText(`피복 ${COVER}`, ox + 3, oy + COVER * S - 3);
    ctx.fillStyle = '#555'; ctx.fillText(`${B} × ${D} 보 단면`, ox, oy + D * S + 12);
    // 인장측 표시
    ctx.fillStyle = 'rgba(229,72,59,.12)'; ctx.fillRect(ox, oy + D * S * 0.66, B * S, D * S * 0.34);
    ctx.fillStyle = '#b42a1d'; ctx.fillText('인장측(아래)', ox + B * S - 62, oy + D * S - 4);
    spacers.forEach((sx) => { const p = toPX(sx, D); ctx.fillStyle = '#3a3f48'; ctx.fillRect(p.x - 6, p.y - COVER * S + 2, 12, COVER * S - 2); });
    bars.forEach((b, i) => { const p = toPX(b.x, b.y); ctx.fillStyle = bad.has(i) ? '#e5483b' : '#5d4a3a'; ctx.beginPath(); ctx.arc(p.x, p.y, DIA / 2 * S + 1, 0, 7); ctx.fill(); });
    // 가장 가까운 두 철근 간격 표시
    if (bars.length >= 2) {
      let best = null; bars.forEach((a, i) => bars.forEach((b, j) => { if (j > i) { const d = Math.hypot(a.x - b.x, a.y - b.y) - DIA; if (!best || d < best.d) best = { d, a, b }; } }));
      const pa = toPX(best.a.x, best.a.y), pb = toPX(best.b.x, best.b.y);
      ctx.fillStyle = best.d < SMIN ? '#b42a1d' : '#1d7a3a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(best.d)}mm`, (pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - 10); ctx.textAlign = 'left';
    }
    if (mode === 'bar') {
      const left = N - bars.length;
      if (left > 0) { ctx.fillStyle = '#5d4a3a'; ctx.beginPath(); ctx.arc(palette.x, palette.y, 12, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(left > 0 ? `D22 끌어다 놓기 (남은 ${left}개)` : '밖으로 끌어내면 빼기', palette.x, palette.y + 26); ctx.textAlign = 'left';
    } else { ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`철근 바로 아래를 눌러 스페이서 끼우기 (${spacers.length}/2)`, W / 2, palette.y + 10); ctx.textAlign = 'left'; }
    if (drag) { ctx.fillStyle = 'rgba(93,74,58,.7)'; ctx.beginPath(); ctx.arc(drag.px, drag.py, DIA / 2 * S + 1, 0, 7); ctx.fill(); }
  };
  const pos = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  c.addEventListener('pointerdown', (e) => {
    if (done) return;
    const p = pos(e);
    if (mode === 'spacer') {
      const mm = toMM(p.x, p.y);
      const under = bars.find((b) => Math.abs(b.x - mm.x) < 30 && b.y > D * 0.6);
      if (under && mm.y > D * 0.55 && !spacers.some((s) => Math.abs(s - under.x) < 5)) { spacers.push(under.x); sfx('tamp'); }
      else sfx('bad');
      draw(); if (spacers.length >= 2) finishBtn.disabled = false; return;
    }
    c.setPointerCapture(e.pointerId);
    if (Math.hypot(p.x - palette.x, p.y - palette.y) < 22 && bars.length < N) { drag = { px: p.x, py: p.y, idx: -1 }; return; }
    const i = bars.findIndex((b) => { const q = toPX(b.x, b.y); return Math.hypot(q.x - p.x, q.y - p.y) < 16; });
    if (i >= 0) { const b = bars.splice(i, 1)[0]; drag = { px: p.x, py: p.y, idx: i, from: b }; draw(); }
  });
  c.addEventListener('pointermove', (e) => { if (!drag) return; const p = pos(e); drag.px = p.x; drag.py = p.y; draw(); });
  c.addEventListener('pointerup', () => {
    if (!drag) return;
    const mm = toMM(drag.px, drag.py);
    if (mm.x > 0 && mm.x < B && mm.y > 0 && mm.y < D) { bars.push({ x: mm.x, y: mm.y }); sfx('tap'); }
    drag = null; draw();
    nextBtn.disabled = bars.length !== N;
  });
  const nextBtn = h('button', { class: 'btn primary big', disabled: true, onclick: () => {
    const { bad, msgs } = check();
    if (bad.size) { fails++; sfx('bad'); info.className = 'fb bad'; info.textContent = `빨간 철근을 고쳐요: ${msgs.join(', ')}`; return; }
    if (!bars.every((b) => b.y > D * 0.66)) { fails++; sfx('bad'); info.className = 'fb bad'; info.textContent = '주근은 당기는 힘을 받는 아래쪽(인장측)에 놓아요.'; return; }
    mode = 'spacer'; sfx('good'); info.className = 'fb good'; info.textContent = '배근 OK! 이제 철근이 처지지 않게 바닥 피복 자리에 스페이서를 2개 이상 끼워요.';
    nextBtn.classList.add('hidden'); finishBtn.classList.remove('hidden'); draw();
  } }, '배근 검측 받기');
  const finishBtn = h('button', { class: 'btn primary big hidden', disabled: true, onclick: () => {
    done = true;
    const ok = fails === 0;
    const reward = Math.round((2 + Math.max(0, 8 - fails * 2)) * stageMult);
    resultCard(m, { big: ok ? '🎉 한 번에 합격!' : `완성 (지적 ${fails}회)`, reward, good: true,
      extra: h('div', { class: 'tiny' }, `보 ${B}×${D} · D22 ${N}개 · 피복 ${COVER}mm · 최소 순간격 ${SMIN}mm = max(25mm, 철근 지름 22mm, 굵은골재 25mm × 4/3)`),
      lesson: '피복두께는 철근을 녹·불에서 지키는 덮개예요. 철근 사이가 너무 좁으면 굵은골재가 못 지나가 공극이 생겨요. 스페이서가 없으면 철근이 내려앉아 피복이 사라져요(KDS 14 20 50 — 노출 조건별 피복은 원문 확인).' });
    onFinish?.({ reward, ok: true, clean: ok });
  } }, '완성!');
  m.setBody(h('div', { class: 'col' }, h('div', { class: 'step' }, `보 단면 배근 — 주근 D22 × ${N}`), c, info, nextBtn, finishBtn));
  draw();
  return m;
}

/* ================= 학생 4. 공정표 짜기 ================= */
const NETS = [
  { acts: ['터파기', '기초', '골조', '외장', '설비', '마감'], pred: [[], [0], [1], [2], [2], [3, 4]] },
  { acts: ['터파기', '기초', '골조', '외장', '설비', '창호', '내장', '마감'], pred: [[], [0], [1], [2], [2], [3], [4, 5], [6]] },
  { acts: ['터파기', '기초', '골조', '외장', '설비', '창호', '내장', '조경', '마감'], pred: [[], [0], [1], [2], [2], [3], [4, 5], [2], [6, 7]] },
];
function cpm(net, dur) {
  const n = net.acts.length, es = Array(n).fill(0), ef = Array(n).fill(0);
  for (let i = 0; i < n; i++) { es[i] = Math.max(0, ...net.pred[i].map((p) => ef[p])); ef[i] = es[i] + dur[i]; }
  const T = Math.max(...ef), lf = Array(n).fill(T), ls = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { const succ = net.pred.map((p, k) => (p.includes(i) ? k : -1)).filter((k) => k >= 0); lf[i] = succ.length ? Math.min(...succ.map((k) => ls[k])) : T; ls[i] = lf[i] - dur[i]; }
  const tf = dur.map((_, i) => lf[i] - ef[i]);
  const ff = dur.map((_, i) => { const succ = net.pred.map((p, k) => (p.includes(i) ? k : -1)).filter((k) => k >= 0); return (succ.length ? Math.min(...succ.map((k) => es[k])) : T) - ef[i]; });
  return { es, ef, ls, lf, tf, ff, T, cp: tf.map((v) => v === 0) };
}
export function runCpm({ stageMult = 1, level = 0, onFinish }) {
  const m = openModal({ title: '🗂️ 공정표 짜기', body: '', cls: 'mg' });
  const net = NETS[Math.min(level, 2)];
  let dur, r, guard = 0;
  // 주공정선이 하나로 정해지고(동률 없음), 여유가 있는 작업이 최소 1개 있도록 다시 뽑기
  do { dur = net.acts.map(() => 2 + Math.floor(Math.random() * 7)); r = cpm(net, dur); }
  while (r.cp.every(Boolean) && ++guard < 200);
  const n = net.acts.length;
  const depth = Array(n).fill(0); for (let i = 0; i < n; i++) depth[i] = Math.max(0, ...net.pred[i].map((p) => depth[p] + 1));
  const cols = Math.max(...depth) + 1, W = Math.max(300, cols * 72), H = 230;
  const byCol = Array.from({ length: cols }, () => []); depth.forEach((d, i) => byCol[d].push(i));
  const P = net.acts.map((_, i) => { const col = byCol[depth[i]], k = col.indexOf(i); return { x: 4 + depth[i] * ((W - 64) / Math.max(1, cols - 1)), y: H / 2 + (k - (col.length - 1) / 2) * 62 - 20 }; });
  const need = []; net.pred.forEach((ps, i) => ps.forEach((p) => need.push([p, i])));
  const links = [], picked = new Set();
  let sel = null, wrong = 0, step = 'link', cpOk = false, tfOk = null;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.classList.add('cpm');
  const info = h('div', { class: 'fb' });
  const hints = h('ul', { class: 'tiny cpm-hints' }, need.map(([a, b]) => h('li', {}, `${net.acts[b]}은(는) ${net.acts[a]}이(가) 끝나야 시작`)));
  const render = () => {
    svg.innerHTML = '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#3a3f48"/></marker></defs>';
    links.forEach(([a, b]) => {
      const l = document.createElementNS(svgNS, 'line');
      const crit = step !== 'link' && cpOk && r.cp[a] && r.cp[b];
      l.setAttribute('x1', P[a].x + 58); l.setAttribute('y1', P[a].y + 20); l.setAttribute('x2', P[b].x - 2); l.setAttribute('y2', P[b].y + 20);
      l.setAttribute('stroke', crit ? '#e5483b' : '#3a3f48'); l.setAttribute('stroke-width', crit ? 3 : 1.6); l.setAttribute('marker-end', 'url(#ah)');
      svg.append(l);
    });
    net.acts.forEach((name, i) => {
      const g = document.createElementNS(svgNS, 'g'); g.setAttribute('transform', `translate(${P[i].x},${P[i].y})`); g.style.cursor = 'pointer';
      const on = sel === i || picked.has(i);
      g.innerHTML = `<rect width="58" height="40" rx="7" fill="${on ? '#ffcc1a' : '#fff'}" stroke="#3a3f48" stroke-width="2"/><text x="29" y="17" text-anchor="middle" font-size="11" font-weight="700">${name}</text><text x="29" y="32" text-anchor="middle" font-size="10" fill="#2f6fbf">${dur[i]}일</text>`;
      g.addEventListener('click', () => tapNode(i));
      svg.append(g);
    });
  };
  const tapNode = (i) => {
    if (step === 'link') {
      if (sel == null) { sel = i; sfx('tap'); return render(); }
      const a = sel; sel = null;
      if (a === i) return render();
      if (links.some(([x, y]) => x === a && y === i)) return render();
      if (need.some(([x, y]) => x === a && y === i)) {
        links.push([a, i]); sfx('good'); info.className = 'fb good'; info.textContent = `${net.acts[a]} → ${net.acts[i]} 연결! (${links.length}/${need.length})`;
        if (links.length === need.length) { step = 'cp'; info.className = 'fb'; info.textContent = '연결 완료! 이제 기간을 더해 가장 긴 경로(주공정선)에 있는 작업을 모두 눌러 고르세요.'; cpBtn.classList.remove('hidden'); }
      } else { wrong++; sfx('bad'); info.className = 'fb bad'; info.textContent = `${net.acts[a]} → ${net.acts[i]}는 맞지 않아요. 아래 선후행 조건을 보세요.`; }
      return render();
    }
    if (step === 'cp') { picked.has(i) ? picked.delete(i) : picked.add(i); sfx('tap'); render(); }
  };
  const cpBtn = h('button', { class: 'btn primary big hidden', onclick: () => {
    const ok = r.cp.every((v, i) => v === picked.has(i));
    cpOk = ok; step = 'tf'; cpBtn.remove(); picked.clear(); r.cp.forEach((v, i) => v && picked.add(i)); render();
    sfx(ok ? 'good' : 'bad');
    info.className = 'fb ' + (ok ? 'good' : 'bad');
    info.textContent = (ok ? '정답! ' : '아쉬워요. 노란 칸이 주공정선이에요. ') + `전체 공기 ${r.T}일 = ${net.acts.filter((_, i) => r.cp[i]).join(' → ')}`;
    if (level >= 1) {
      const k = r.tf.findIndex((v) => v > 0);
      const opts = shuffle([...new Set([r.tf[k], r.tf[k] + 1, Math.max(0, r.tf[k] - 1), dur[k], r.tf[k] + 2])].slice(0, 4));
      info.append(h('div', { class: 'qtext' }, `"${net.acts[k]}"의 전체여유(TF)는? (TF = LFT − EFT)`),
        h('div', { class: 'grid2' }, opts.map((v) => h('button', { class: 'btn opt', onclick: (e) => {
          tfOk = v === r.tf[k]; sfx(tfOk ? 'good' : 'bad');
          e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => (b.disabled = true));
          e.currentTarget.classList.add(tfOk ? 'right' : 'wrong');
          info.append(h('div', { class: 'tiny' }, `EST ${r.es[k]} · EFT ${r.ef[k]} · LST ${r.ls[k]} · LFT ${r.lf[k]} → TF = ${r.lf[k]} − ${r.ef[k]} = ${r.tf[k]}일 (자유여유 FF = ${r.ff[k]}일)`), h('button', { class: 'btn primary', onclick: end }, '결과 보기'));
        } }, `${v}일`))));
    } else info.append(h('button', { class: 'btn primary', onclick: end }, '결과 보기'));
  } }, '주공정선 확정');
  const end = () => {
    const reward = Math.round((2 + Math.max(0, 3 - wrong) + (cpOk ? 4 : 0) + (tfOk ? 3 : 0)) * stageMult);
    resultCard(m, { big: cpOk ? '📈 주공정선 정답!' : '공정표 완성', reward, good: cpOk,
      extra: h('div', { class: 'tiny' }, `연결 실수 ${wrong}회 · 주공정선 ${cpOk ? '○' : '×'}${tfOk == null ? '' : ` · TF ${tfOk ? '○' : '×'}`} · 전체 공기 ${r.T}일`),
      lesson: '주공정선(CP)은 여유가 0인 가장 긴 경로예요. CP 위 작업이 하루 늦으면 준공도 하루 늦어지고, 여유가 있는 작업은 TF만큼 늦어져도 공기에 영향이 없어요.' });
    onFinish?.({ reward, cpOk });
  };
  info.textContent = '먼저 할 작업 카드 → 다음 작업 카드 순서로 눌러 화살표로 이으세요.';
  m.setBody(h('div', { class: 'col' }, h('div', { class: 'step' }, `네트워크 공정표 (작업 ${n}개)`), svg, info, cpBtn, h('div', { class: 'sec' }, '선후행 조건'), hints));
  render();
  return m;
}

/* ================= 현장 2. 창문 닦기 ================= */
export function runWindow({ stageMult = 1, lang = 'ko', onFinish }) {
  const m = openModal({ title: '🏢 창문 닦기', body: '', cls: 'mg' });
  const W = 300, H = 320;
  const { c, ctx } = hiCanvas(W, H); c.style.touchAction = 'none';
  const blobs = Array.from({ length: 8 }, () => ({ x: rnd(60, 240), y: rnd(70, 270), r: rnd(16, 26), a: 1 }));
  let hooked = false, safetyMiss = 0, windMiss = 0, paused = false, gust = 0, warn = 0, nextGust = rnd(6, 8), t = 0, run = true, swing = 0;
  const TIME = 45;
  const status = h('div', { class: 'fb' }, '먼저 안전대 고리를 거세요! 그다음 손가락으로 문질러 얼룩을 지워요.');
  const hookBtn = h('button', { class: 'btn big', onclick: () => { hooked = true; sfx('good'); hookBtn.disabled = true; hookBtn.textContent = '🔗 안전대 고리 걸림 ✔'; status.className = 'fb good'; status.textContent = '안전대 OK! 문질러서 닦아요. 바람이 세지면 "멈춤"!'; } }, '🔗 안전대 고리 걸기');
  const stopBtn = h('button', { class: 'btn big bad', onclick: () => { if (gust > 0 || warn > 0) { paused = true; sfx('good'); status.className = 'fb good'; status.textContent = '잘했어요! 바람이 잦아들 때까지 멈춰요.'; } else { sfx('tap'); status.textContent = '지금은 바람이 약해요. 계속 닦아도 돼요.'; } } }, '✋ 멈춤');
  const draw = () => {
    ctx.fillStyle = '#d8dde2'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(Math.sin(swing * 8) * swing * 6, 0);
    ctx.fillStyle = '#9fd8f5'; ctx.fillRect(40, 50, 220, 240);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(120, 60); ctx.lineTo(70, 160); ctx.lineTo(50, 160); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 6; ctx.strokeRect(40, 50, 220, 240); ctx.beginPath(); ctx.moveTo(150, 50); ctx.lineTo(150, 290); ctx.stroke();
    blobs.forEach((b) => { if (b.a <= 0) return; ctx.fillStyle = `rgba(120,100,70,${b.a * 0.85})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); });
    ctx.restore();
    // 안전대 줄
    ctx.strokeStyle = hooked ? '#ff8a1e' : 'rgba(255,138,30,.3)'; ctx.lineWidth = 3; ctx.setLineDash(hooked ? [] : [4, 4]);
    ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, 30); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#555'; ctx.fillRect(130, 0, 40, 10);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#333'; ctx.fillText(`⏱ ${Math.max(0, TIME - t).toFixed(0)}초`, 8, 18);
    const level = gust > 0 ? 1 : warn > 0 ? 0.6 : 0.15;
    ctx.fillStyle = '#ccc'; ctx.fillRect(200, 8, 90, 10); ctx.fillStyle = level > 0.9 ? '#e5483b' : level > 0.5 ? '#ffb020' : '#2fb35a'; ctx.fillRect(200, 8, 90 * level, 10);
    ctx.fillStyle = '#333'; ctx.fillText('🌬', 184, 18);
    if (gust > 0) { ctx.fillStyle = 'rgba(229,72,59,.85)'; ctx.fillRect(40, 140, 220, 34); ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(paused ? '멈춘 상태 — 바람 지나가는 중' : '강풍! 멈춤을 누르세요!', 150, 162); ctx.textAlign = 'left'; }
    else if (warn > 0) { ctx.fillStyle = '#b8860b'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('바람이 세지고 있어요…', 70, 42); }
  };
  const pos = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  let rubbing = false, warned = 0;
  c.addEventListener('pointerdown', (e) => { rubbing = true; c.setPointerCapture(e.pointerId); rub(pos(e)); });
  c.addEventListener('pointermove', (e) => { if (rubbing) rub(pos(e)); });
  c.addEventListener('pointerup', () => { rubbing = false; });
  const rub = (p) => {
    if (!hooked) { if (performance.now() - warned > 1200) { warned = performance.now(); safetyMiss++; sfx('bad'); status.className = 'fb bad'; status.textContent = '⚠️ 안전대 고리를 걸지 않았어요! 고소작업은 안전대가 먼저예요.'; } return; }
    if (gust > 0) { if (!paused && performance.now() - warned > 900) { warned = performance.now(); windMiss++; swing = 1; sfx('bad'); status.className = 'fb bad'; status.textContent = '⚠️ 강풍 중에 계속 작업하면 몸이 흔들려요! 멈춤!'; } return; }
    if (paused) paused = false;
    blobs.forEach((b) => { if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 14) b.a = Math.max(0, b.a - 0.06); });
  };
  let last = performance.now();
  const frame = (now) => {
    if (!run) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; swing = Math.max(0, swing - dt);
    if (hooked) {
      nextGust -= dt;
      if (nextGust <= 0 && warn <= 0 && gust <= 0) { warn = 1.6; sfx('horn'); }
      if (warn > 0) { warn -= dt; if (warn <= 0) { gust = 3.2; } }
      if (gust > 0) { const g0 = gust; gust -= dt; if (g0 > 1.2 && gust <= 1.2 && !paused) { windMiss++; status.className = 'fb bad'; status.textContent = '강풍 때 멈추지 않았어요. 바람이 세면 작업 중지!'; } if (gust <= 0) { nextGust = rnd(7, 11); paused = false; status.className = 'fb'; status.textContent = '바람이 잦아들었어요. 다시 닦아요.'; } }
    }
    draw();
    const clean = blobs.filter((b) => b.a <= 0.05).length / blobs.length;
    if (t >= TIME || clean >= 1) { run = false; return end(clean); }
    requestAnimationFrame(frame);
  };
  const end = (clean) => {
    const ok = safetyMiss === 0 && windMiss === 0 && clean >= 0.8;
    const reward = Math.round((1 + clean * 5 + (safetyMiss === 0 ? 2 : 0) + (windMiss === 0 ? 2 : 0)) * stageMult);
    resultCard(m, { big: `깨끗해진 정도 ${Math.round(clean * 100)}%`, reward, lessonId: 'window', lang, good: ok,
      extra: h('div', { class: 'tiny' }, `안전대 ${safetyMiss ? '× (먼저 안 걸었어요)' : '○'} · 강풍 때 멈춤 ${windMiss ? `× ${windMiss}번` : '○'}`) });
    onFinish?.({ reward, ok });
  };
  m.setBody(h('div', { class: 'col' }, c, h('div', { class: 'grid2' }, hookBtn, stopBtn), status));
  requestAnimationFrame(frame);
  return m;
}

/* ================= 현장 4. 소장님 피해 숨기 ================= */
const HIDE_SPOTS = [
  { ic: '⛱️', t: '그늘 휴게소', safe: true, ex: '그늘 휴게소는 쉬라고 만든 곳이에요.' },
  { ic: '🏠', t: '컨테이너 사무실 안', safe: true, ex: '컨테이너 안은 안전해요.' },
  { ic: '🚰', t: '휴게실 정수기 옆', safe: true, ex: '물도 마시고 쉬기 좋아요.' },
  { ic: '⛺', t: '휴게 천막', safe: true, ex: '그늘진 휴게 천막, 좋아요.' },
  { ic: '🏗️', t: '크레인 짐 아래', safe: false, ex: '짐이 떨어질 수 있어요. 크레인 짐 아래는 절대 안 돼요!' },
  { ic: '🕳️', t: '개구부 옆', safe: false, ex: '구멍 옆에서 졸다가 떨어질 수 있어요!' },
  { ic: '🧗', t: '비계 위', safe: false, ex: '비계 위는 쉬는 곳이 아니에요. 떨어질 수 있어요!' },
  { ic: '🚜', t: '지게차 뒤', safe: false, ex: '후진하는 지게차는 뒤가 안 보여요!' },
  { ic: '🧱', t: '쌓인 자재 사이', safe: false, ex: '자재가 무너질 수 있어요!' },
];
export function runHide({ stageMult = 1, lang = 'ko', onFinish }) {
  const m = openModal({ title: '🙈 소장님 피해 숨기', body: '', cls: 'mg' });
  let round = 0, safe = 0, danger = 0;
  const next = () => {
    if (round >= 3) return end();
    round++;
    const spots = shuffle([...shuffle(HIDE_SPOTS.filter((s) => s.safe)).slice(0, 2), ...shuffle(HIDE_SPOTS.filter((s) => !s.safe)).slice(0, 2)]);
    let left = 5, chosen = false;
    const timer = h('div', { class: 'reading' }, `${left}초`);
    const fb = h('div', { class: 'fb' }, '점심 먹고 쉬는 시간! 소장님이 순찰 와요. 어디에 숨을까?');
    const it = setInterval(() => { left--; timer.textContent = `${left}초`; if (left <= 0) { clearInterval(it); if (!chosen) { chosen = true; sfx('tap'); fb.textContent = '앗, 못 숨었어요! 소장님: "쉬는 시간엔 그늘에서 쉬어요~"'; fb.append(h('button', { class: 'btn primary', onclick: next }, '다음')); } } }, 1000);
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'qhead' }, h('span', {}, `${round} / 3라운드`), timer),
      h('div', { class: 'hide-art' }, '🧑‍💼👀 … 🚶'),
      h('div', { class: 'grid2' }, spots.map((s) => h('button', { class: 'btn hide-spot', onclick: (e) => {
        if (chosen) return; chosen = true; clearInterval(it);
        e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => (b.disabled = true));
        if (s.safe) { safe++; sfx('good'); e.currentTarget.classList.add('right'); fb.className = 'fb good'; fb.textContent = (Math.random() < 0.3 ? '들켰지만 안전한 곳이라 괜찮대요 😄 ' : '들키지 않았어요! ') + s.ex; }
        else { danger++; sfx('bad'); e.currentTarget.classList.add('wrong'); fb.className = 'fb bad'; fb.textContent = '소장님: "거긴 위험해!" ' + s.ex; }
        fb.append(h('button', { class: 'btn primary', onclick: next }, round < 3 ? '다음 라운드' : '결과 보기'));
      } }, h('div', { class: 'big-ic' }, s.ic), s.t))), fb));
  };
  const end = () => {
    const ok = safe === 3;
    const reward = Math.round((1 + safe * 3) * stageMult);
    resultCard(m, { big: `안전하게 숨기 ${safe} / 3`, reward, lessonId: 'hide', lang, good: danger === 0,
      extra: danger ? h('div', { class: 'tiny' }, `위험한 곳 ${danger}번 — 쉬는 곳도 안전이 먼저!`) : null });
    onFinish?.({ reward, ok });
  };
  next();
  return m;
}

/* ================= 현장 5. 맛있는 점심 (함바집) ================= */
const DISHES = [['🍚', '밥'], ['🍲', '국'], ['🥬', '김치'], ['🍳', '계란말이'], ['🐟', '생선구이'], ['🥩', '제육볶음'], ['🥗', '나물'], ['🍠', '고구마']];
export function runLunch({ stageMult = 1, lang = 'ko', hot = false, onFinish }) {
  const m = openModal({ title: '🍱 맛있는 점심 — 함바집', body: '', cls: 'mg' });
  const people = ['김반장', '박기사', '이막내'].map((who) => ({ who, want: shuffle(DISHES.map((d) => d[0])).slice(0, 3), got: [] }));
  let idx = 0, right = 0, waterOk = 0;
  const show = () => {
    let left = 6;
    const cd = h('div', { class: 'reading' }, `${left}초 동안 기억하세요!`);
    const it = setInterval(() => { left--; cd.textContent = `${left}초 동안 기억하세요!`; if (left <= 0) { clearInterval(it); tray(); } }, 1000);
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'step' }, '주문 기억하기'),
      ...people.map((p) => h('div', { class: 'order' }, h('b', {}, p.who), h('span', { class: 'big-ic' }, p.want.join(' ')))),
      hot ? h('div', { class: 'fb' }, '☀️ 오늘은 더워요! 식판마다 물병(💧)도 챙기면 보너스') : null, cd,
      h('button', { class: 'btn', onclick: () => { clearInterval(it); tray(); } }, '다 외웠어요')));
  };
  const tray = () => {
    if (idx >= people.length) return end();
    const p = people[idx];
    const max = hot ? 4 : 3;
    const trayEl = h('div', { class: 'tray' });
    const renderTray = () => { trayEl.innerHTML = ''; p.got.forEach((d, k) => trayEl.append(h('button', { class: 'tray-item', onclick: () => { p.got.splice(k, 1); renderTray(); } }, d))); for (let k = p.got.length; k < max; k++) trayEl.append(h('span', { class: 'tray-slot' })); };
    renderTray();
    const opts = DISHES.map(([ic, name]) => h('button', { class: 'btn dish', onclick: () => { if (p.got.length < max && !p.got.includes(ic)) { p.got.push(ic); sfx('tap'); renderTray(); } } }, h('div', { class: 'big-ic' }, ic), h('small', {}, name)));
    if (hot) opts.push(h('button', { class: 'btn dish water', onclick: () => { if (p.got.length < max && !p.got.includes('💧')) { p.got.push('💧'); sfx('tap'); renderTray(); } } }, h('div', { class: 'big-ic' }, '💧'), h('small', {}, '물병')));
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'step' }, `${p.who}님 식판 (${idx + 1}/3)`), trayEl,
      h('div', { class: 'dishes' }, opts),
      h('button', { class: 'btn primary big', onclick: () => {
        const ok = p.want.filter((d) => p.got.includes(d)).length;
        right += ok; if (hot && p.got.includes('💧')) waterOk++;
        sfx(ok === 3 ? 'good' : 'tap'); idx++; tray();
      } }, '식판 드리기')));
  };
  const end = () => {
    const total = people.length * 3;
    const reward = Math.round((1 + right * 0.8 + waterOk * 1) * stageMult);
    resultCard(m, { big: `${right} / ${total} 반찬 맞힘`, reward, lessonId: 'lunch', lang, good: right >= 7,
      extra: h('div', { class: 'tiny' }, people.map((p) => `${p.who}: ${p.want.join('')} → ${p.got.join('') || '빈 식판'}`).join(' · ') + (hot ? ` · 물병 ${waterOk}/3` : '')) });
    onFinish?.({ reward, ok: right === total, hot, waterOk });
  };
  show();
  return m;
}

/* ================= 현장 6. 현장 말 퀴즈 (쉬운 버전) ================= */
export function runFieldQuiz({ stageMult = 1, lang = 'ko', onAnswer, onFinish }) {
  const m = openModal({ title: '📝 현장 말 퀴즈', body: '', cls: 'mg' });
  const picks = shuffle(FIELD_TERMS).slice(0, 5);
  let i = 0, right = 0;
  const show = () => {
    if (i >= picks.length) return end();
    const q = picks[i];
    const opts = shuffle([q, ...shuffle(FIELD_TERMS.filter((t) => t !== q)).slice(0, 2)]);
    const fb = h('div', { class: 'fb' });
    const btns = opts.map((o) => h('button', { class: 'btn opt term', onclick: (e) => {
      btns.forEach((b) => (b.disabled = true));
      const ok = o === q; if (ok) right++;
      onAnswer?.(ok);
      sfx(ok ? 'good' : 'bad'); e.currentTarget.classList.add(ok ? 'right' : 'wrong'); btns[opts.indexOf(q)].classList.add('right');
      fb.className = 'fb ' + (ok ? 'good' : 'bad');
      fb.append(h('div', { class: 'term-big' }, `${q.ic} ${q.ko}`), h('div', {}, q.m[lang]), lang !== 'ko' ? h('div', { class: 'tl-ko' }, q.m.ko) : null,
        h('button', { class: 'btn primary', onclick: () => { i++; show(); } }, i < picks.length - 1 ? '다음' : '결과'));
    } }, o.ko));
    m.setBody(h('div', { class: 'col' },
      h('div', { class: 'qhead' }, h('span', { class: 'lvl lv0' }, '쉬운 버전'), h('span', {}, `${i + 1} / 5`)),
      h('div', { class: 'term-pic' }, q.ic),
      h('div', { class: 'qtext' }, FIELD_UI[lang].q, h('div', { class: 'term-mean' }, `“${q.m[lang]}”`), lang !== 'ko' ? h('div', { class: 'tl-ko' }, `이 뜻의 현장 말은? “${q.m.ko}”`) : null),
      h('div', { class: 'col gap6' }, btns), fb));
  };
  const end = () => {
    const reward = Math.round((1 + right * 2) * stageMult);
    resultCard(m, { big: `${right} / 5 정답`, reward, lessonId: 'fquiz', lang, good: right >= 3 });
    onFinish?.({ reward, right });
  };
  show();
  return m;
}
