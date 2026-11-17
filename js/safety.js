// 현장 첫 출근 안전 코스 (약 10분) — 4개 언어 + 작은 한국어 병기
import { T, LANGS, SIGNS, MULTI_LANG } from './i18n.js';
import { t as $t, koOn } from './lang.js';
import { h, openModal, hiCanvas, shuffle } from './ui.js';
import { sfx } from './audio.js';

// 공식 안전보건표지 형태를 단순화: 파란 원 = 지시, 노란 삼각형 = 경고, 빨간 팔각형 = 정지
export function drawSign(ctx, kind, S = 160) {
  const cx = S / 2, cy = S / 2;
  ctx.clearRect(0, 0, S, S);
  const type = kind.split('-')[0];
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (type === 'mand') {
    ctx.fillStyle = '#1f5fbf'; ctx.beginPath(); ctx.arc(cx, cy, S * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = S * 0.025; ctx.beginPath(); ctx.arc(cx, cy, S * 0.43, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
  } else if (type === 'warn') {
    ctx.fillStyle = '#ffd200'; ctx.strokeStyle = '#111'; ctx.lineWidth = S * 0.06;
    ctx.beginPath(); ctx.moveTo(cx, S * 0.08); ctx.lineTo(S * 0.94, S * 0.88); ctx.lineTo(S * 0.06, S * 0.88); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#111';
  } else {
    ctx.fillStyle = '#d32020';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(cx + Math.cos(a) * S * 0.47, cy + Math.sin(a) * S * 0.47); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = S * 0.02;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(cx + Math.cos(a) * S * 0.42, cy + Math.sin(a) * S * 0.42); }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
  }
  const k = S / 160;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  ctx.lineWidth = 7;
  const person = (x, y, s = 1) => {
    ctx.beginPath(); ctx.arc(x, y - 30 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - 20 * s); ctx.lineTo(x, y + 8 * s); ctx.moveTo(x - 15 * s, y - 8 * s); ctx.lineTo(x + 15 * s, y - 8 * s);
    ctx.moveTo(x, y + 8 * s); ctx.lineTo(x - 11 * s, y + 30 * s); ctx.moveTo(x, y + 8 * s); ctx.lineTo(x + 11 * s, y + 30 * s); ctx.stroke();
  };
  switch (kind) {
    case 'mand-helmet':
      ctx.beginPath(); ctx.arc(0, 6, 36, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-46, 4, 92, 9);
      ctx.beginPath(); ctx.moveTo(-28, 13); ctx.quadraticCurveTo(0, 46, 28, 13); ctx.lineWidth = 5; ctx.stroke(); // 턱끈
      ctx.fillStyle = '#1f5fbf'; ctx.fillRect(-4, -28, 8, 30);
      break;
    case 'mand-harness':
      person(-8, 6, 1.15);
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(18, -40); ctx.lineTo(34, -40); ctx.stroke();
      ctx.beginPath(); ctx.arc(34, -36, 6, -Math.PI / 2, Math.PI); ctx.stroke();
      ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('2m+', 30, 50);
      break;
    case 'warn-opening':
      ctx.fillRect(-46, 30, 30, 8); ctx.fillRect(16, 30, 30, 8);
      ctx.save(); ctx.translate(0, 8); ctx.rotate(0.5); person(0, 0, 0.8); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-6, 44); ctx.lineTo(6, 44); ctx.stroke();
      break;
    case 'warn-load':
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -28); ctx.stroke();
      ctx.fillRect(-22, -28, 44, 22);
      person(0, 18, 0.7);
      ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-14, 4); ctx.moveTo(14, -2); ctx.lineTo(14, 4); ctx.stroke();
      break;
    case 'stop-weather':
      ctx.beginPath(); ctx.arc(-14, -24, 14, 0, Math.PI * 2); ctx.arc(8, -30, 18, 0, Math.PI * 2); ctx.arc(26, -20, 12, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 4; for (const x of [-18, 0, 18]) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x - 6, 10); ctx.stroke(); }
      ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('STOP', 0, 46);
      break;
    case 'stop-hand':
      ctx.beginPath(); ctx.roundRect(-20, -20, 40, 46, 8); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(-20 + i * 10.5, -46, 8.5, 32, 4); ctx.fill(); }
      ctx.beginPath(); ctx.roundRect(16, -6, 20, 9, 4); ctx.fill();
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('STOP', 0, 50);
      break;
  }
  ctx.restore();
}

function tline(lang, key, sub) {
  // 외국어 + 아래 작은 한국어
  const main = typeof key === 'function' ? key(T[lang]) : T[lang][key];
  const ko = typeof key === 'function' ? key(T.ko) : T.ko[key];
  return h('div', { class: 'tl' }, h('div', { class: 'tl-main' + (sub ? ' ' + sub : '') }, main), koOn() ? h('div', { class: 'tl-ko' }, ko) : null);
}

export function runSafetyCourse({ nick, lang: initLang, onDone, onNote }) {
  let lang = initLang || 'ko', score = 0;
  const m = openModal({ title: $t('safety.runSafetyCourse.1'), body: '', cls: 'safety', closable: true });
  const set = (el) => m.setBody(el);

  function stepLang() {
    set(h('div', { class: 'col' },
      h('p', { class: 'muted' }, $t('safety.stepLang.2')),
      h('div', { class: 'grid2' }, LANGS.map((L) => h('button', { class: 'btn big' + (L.id === lang ? ' on' : ''), onclick: () => { lang = L.id; sfx('tap'); stepTBM(); } }, L.name))),
      h('p', { class: 'tiny muted' }, $t('safety.stepLang.1'))));
  }
  function stepTBM() {
    set(h('div', { class: 'col' },
      tline(lang, 'tbmTitle', 'h'),
      h('div', { class: 'tbm-art' }, '⟦worker⟧⟦worker⟧⟦worker⟧ ⟦note⟧'),
      tline(lang, 'tbm1'), tline(lang, 'tbm2'), tline(lang, 'tbm3'),
      h('button', { class: 'btn primary big', onclick: () => stepQ(0) }, tline(lang, 'next'))));
  }
  function stepQ(i) {
    if (i >= 6) return stepBuild();
    const q = T[lang].q[i], qk = T.ko.q[i];
    const { c, ctx } = hiCanvas(150, 150); drawSign(ctx, SIGNS[i], 150);
    const type = SIGNS[i].split('-')[0];
    const sk = type === 'mand' ? 'signMand' : type === 'warn' ? 'signWarn' : 'signStop';
    let first = true;
    const fb = h('div', { class: 'fb' });
    const order = shuffle([0, 1, 2]);
    const btns = order.map((k) => h('button', { class: 'btn opt', onclick: (e) => {
      if (k === 0) {
        if (first) score++;
        sfx('good'); e.currentTarget.classList.add('right');
        btns.forEach((b) => (b.disabled = true));
        fb.innerHTML = ''; fb.append(h('b', {}, T[lang].correct), ' ', tline(lang, (t) => t.q[i].fb));
        fb.append(h('button', { class: 'btn primary', onclick: () => stepQ(i + 1) }, T[lang].next + (koOn() ? $t('safety.stepQ.1') : '')));
      } else {
        first = false; sfx('bad'); e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true;
        fb.innerHTML = ''; fb.append(tline(lang, 'wrong'));
      }
    } }, h('div', {}, q.o[k]), koOn() ? h('div', { class: 'tl-ko' }, qk.o[k]) : null));
    set(h('div', { class: 'col' },
      h('div', { class: 'qhead' }, `${i + 1} / 6`, ' · ', tline(lang, 'quizIntro')),
      h('div', { class: 'sign-wrap' }, c, h('div', { class: 'sign-kind ' + type }, T[lang][sk] + (koOn() ? ` · ${T.ko[sk]}` : ''))),
      h('div', { class: 'qtext' }, q.q, koOn() ? h('div', { class: 'tl-ko' }, qk.q) : null),
      h('div', { class: 'col gap6' }, btns), fb));
  }
  function stepBuild() {
    const { c, ctx } = hiCanvas(260, 190);
    let stage = 0;
    const msg = h('div', { class: 'fb' });
    const draw = (bounce = 0) => {
      ctx.clearRect(0, 0, 260, 190);
      ctx.fillStyle = '#bfe6ff'; ctx.fillRect(0, 0, 260, 150); ctx.fillStyle = '#7cc456'; ctx.fillRect(0, 150, 260, 40);
      const cube = (x, y, col, s = 18) => { ctx.fillStyle = col; ctx.fillRect(x, y, s, s); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, s, 4); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.strokeRect(x + .5, y + .5, s - 1, s - 1); };
      if (stage >= 1) for (let x = 0; x < 8; x++) cube(58 + x * 18, 134 - (stage === 1 ? bounce : 0), '#9d9d97');
      if (stage >= 2) for (let y = 0; y < 3; y++) for (let x = 0; x < 8; x++) { if (y < 2 && (x === 3 || x === 4)) continue; cube(58 + x * 18, 116 - y * 18 - (stage === 2 ? bounce : 0), '#9c6a3c'); }
      if (stage >= 3) for (let r = 0; r < 4; r++) for (let x = r; x < 9 - r; x++) cube(49 + x * 18, 62 - r * 14 - (stage === 3 ? bounce : 0), '#c8463c');
      if (stage >= 3) { ctx.font = '28px sans-serif'; ctx.fillText('', 118, 140); }
    };
    const anim = () => { let b = 30; const it = setInterval(() => { b = Math.max(0, b - 4); draw(b); if (!b) clearInterval(it); }, 16); };
    draw();
    const mk = (n, key) => h('button', { class: 'btn big', onclick: () => {
      if (n !== stage + 1) { sfx('bad'); msg.innerHTML = ''; msg.append(tline(lang, 'orderWarn')); return; }
      stage = n; sfx('build'); anim(); msg.innerHTML = '';
      if (stage === 3) { sfx('fanfare'); msg.append(tline(lang, 'buildDone'), h('button', { class: 'btn primary', onclick: stepCert }, T[lang].next + (koOn() ? $t('safety.mk.1') : ''))); }
    } }, h('div', {}, T[lang][key]), koOn() ? h('div', { class: 'tl-ko' }, T.ko[key]) : null);
    set(h('div', { class: 'col' }, tline(lang, 'buildTitle', 'h'), c, h('div', { class: 'grid3' }, mk(1, 'b1'), mk(2, 'b2'), mk(3, 'b3')), msg));
  }
  function stepCert() {
    const now = new Date();
    const rec = { nick: nick || $t('safety.stepCert.1'), date: `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`, lang: LANGS.find((L) => L.id === lang).name, score };
    onNote?.('safety');
    const row = (k, v) => h('div', { class: 'cert-row' }, h('span', {}, T[lang][k] + (koOn() ? ` · ${T.ko[k]}` : '')), h('b', {}, v));
    set(h('div', { class: 'col' },
      h('div', { class: 'cert' },
        h('div', { class: 'cert-stripe' }),
        h('div', { class: 'cert-title' }, T[lang].certTitle, koOn() ? h('small', {}, $t('safety.row.4')) : null),
        h('div', { class: 'cert-sub' }, `(${T[lang].certSub}${koOn() ? $t('safety.row.3') : ''})`),
        row('nick', rec.nick), row('date', rec.date), row('lang', rec.lang), row('score', `${score} / 6`),
        h('div', { class: 'cert-co' }, $t('safety.row.2'))),
      h('button', { class: 'btn primary big', onclick: () => { m.close(); onDone?.(rec, lang); } }, T[lang].finish + (koOn() ? $t('safety.row.1') : ''))));
  }
  // v10: 다국어가 꺼져 있으면 언어 고르기를 건너뛰고 한국어로 TBM부터
  if (MULTI_LANG) stepLang(); else { lang = 'ko'; stepTBM(); }
  return m;
}
