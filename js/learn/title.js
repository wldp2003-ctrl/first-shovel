// 첫 삽 v20 — 인트로·메인 메뉴: 타이틀 화면(3D 현장 배경) · "이 앱은?" 소개 4장 · 모드 고르기 · 게임 방법(시연 카드) · 환경 설정 · 정보
// app.js 의 도구(h, t, ic …)와 상태(S, UI)를 ctx 로 받아 쓴다. 교육 내용(lessons/sources/scenes)은 읽기만 한다.
// 색은 css/tokens.css 토큰만. 글자 크기 설정은 #app 의 zoom, 움직임 줄이기는 html.rm 클래스.

import { LANGS, langOf } from './langs.js';
export const APP_VERSION = 'v22.1';

export function makeTitle(ctx) {
  const { h, t, ic, icon, sapi, logoMark, renderMascot } = ctx;
  const UI = ctx.UI;
  const $ = (s) => document.querySelector(s);
  const app = () => $('#app');
  const rm = () => ctx.reduceMotion();
  let bg3d = null; // 타이틀 배경 3D (mountSite 결과)

  /* ---------- 공통: 화면 틀 (뒤로 → onBack) ---------- */
  function page(cls, title, onBack, { say } = {}) {
    stopBg();
    document.querySelector('.fbar')?.remove(); document.body.classList.remove('has-fbar', 'titled');
    document.body.classList.add('deep');
    app().innerHTML = '';
    ctx.setBack(onBack);
    const view = h('main', { id: 'view', class: `deepview view-in ${cls}` });
    if (say) view.dataset.say = say;
    app().append(h('header', { class: 'top deep' },
      h('button', { class: 'back', id: 'pgBack', 'aria-label': t('common.back'), onclick: () => { ctx.tap(); onBack(); } }, ic('back')),
      h('h1', { class: 'ttl' }, title), h('div', { class: 'dots', id: 'dots' }), ctx.sayBtn()), view);
    window.scrollTo(0, 0);
    ctx.autoSay();
    return view;
  }
  // 그림만 모드: 버튼 옆 작은 듣기
  const sayMini = (text) => (ctx.isPic() && ctx.canSpeak() ? h('span', { class: 'say-mini', role: 'button', tabindex: '0', 'aria-label': t('scene.listen'), onclick: (e) => { e.stopPropagation(); ctx.speak(text); } }, ic('sound', { size: 18 })) : null);

  /* ---------- ② 타이틀 화면 = 메인 메뉴 ---------- */
  function hasRecord() { const S = ctx.S; return !!S.pre || Object.keys(S.scenes || {}).length > 0; }
  function progressLine() {
    const SC = ctx.SC, S = ctx.S, n = SC.scenes.filter((x) => S.scenes?.[x.id]?.best).length;
    return t('title.progress', { n, m: SC.scenes.length, s: ctx.starSum() });
  }
  function showTitle({ fromOpening = false } = {}) {
    stopBg();
    document.querySelector('.fbar')?.remove();
    document.body.classList.remove('deep', 'has-fbar'); document.body.classList.add('titled');
    app().innerHTML = '';
    ctx.setBack('exit');
    const rec = hasRecord();
    const bg = h('div', { class: 'tt-bg' + (fromOpening && !rm() ? ' pull' : ''), 'aria-hidden': 'true' });
    const startTxt = rec ? t('title.continue') : t('title.start');
    const main = h('button', { class: 'btn primary big tt-main', id: rec ? 'ttContinue' : 'ttStart', 'aria-label': startTxt, onclick: () => { ctx.tap(); rec ? ctx.continueGame() : startFlow(); } },
      h('span', { class: 'tt-ic' }, ic('shovel', { size: ctx.isPic() ? 34 : 28 })),
      h('span', { class: 'tt-t' }, h('b', {}, startTxt), rec && !ctx.isPic() ? h('small', { id: 'ttProg' }, progressLine()) : null),
      sayMini(startTxt + (rec ? '. ' + progressLine() : '')), ic('next'));
    const row = (id, name, label, fn) => h('button', { class: 'btn big tt-btn', id, 'aria-label': label, onclick: () => { ctx.tap(); fn(); } },
      h('span', { class: 'tt-ic' }, ic(name, { size: ctx.isPic() ? 32 : 26 })), h('span', { class: 'tt-t' }, h('b', {}, label)), sayMini(label));
    const v = h('main', { id: 'view', class: 'title-screen' + (ctx.isPic() ? ' pic' : '') },
      bg, h('div', { class: 'tt-fade', 'aria-hidden': 'true' }),
      h('button', { class: 'tt-lang', id: 'ttLang', 'aria-label': t('i18n.pick'), onclick: () => { ctx.tap(); langPage(() => showTitle()); } }, ic('globe', { size: 22 }), h('span', {}, langOf(ctx.getLang()).name)),
      h('header', { class: 'tt-head' },
        h('div', { class: 'tt-logo' }, h('span', { class: 'tt-mark', html: logoMark({ size: 64 }) }),
          h('div', {}, h('h1', { class: 'tt-name' }, t('app.name')), h('p', { class: 'tt-sub' }, t('title.sub')))),
        h('span', { class: 'tt-mascot', html: renderMascot({ pose: 'wave', face: 'joy', size: 92, cls: 'm-blink' }) })),
      h('nav', { class: 'tt-menu', 'aria-label': t('title.menu') },
        main,
        row('ttHow', 'help', t('title.how'), () => howTo(() => showTitle())),
        row('ttSet', 'settings', t('title.settings'), () => settings(() => showTitle())),
        h('div', { class: 'tt-small' },
          h('button', { class: 'btn ghost', id: 'ttRecord', onclick: () => { ctx.tap(); ctx.go('record'); } }, ic('record', { size: 20 }), h('span', {}, t('title.record'))),
          h('button', { class: 'btn ghost', id: 'ttCredits', onclick: () => { ctx.tap(); info(() => showTitle()); } }, ic('worker', { size: 20 }), h('span', {}, t('title.credits'))),
          ctx.sayBtn())),
      h('footer', { class: 'tt-foot' }, h('small', {}, t('title.legal')), h('small', { class: 't-num' }, APP_VERSION)));
    v.dataset.say = `${t('app.name')}. ${t('title.sub')}. ${startTxt}`;
    app().append(v);
    mountBg(bg);
    ctx.autoSay();
    window.__title = { rec, bg: () => bg.dataset.kind || '' };
    return v;
  }
  // 배경: 3D 디오라마(60초에 한 바퀴) / 동작 줄이기·저사양·화질 "가볍게"·WebGL 실패 → 같은 각도 미리 렌더링 이미지
  // 느린 통신(2G·3G) 또는 데이터 절약 모드면 3D 를 받지 않음 (자동일 때)
  function slowNet() { const c = navigator.connection; return !!c && (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '')); }
  function lowEnd() { const n = navigator.hardwareConcurrency || 8, m = navigator.deviceMemory || 8; return n <= 4 && m <= 3; }
  function still(bg) { const src = ctx.PRE?.map?.sm || 'assets/scenes/map-sm.webp'; bg.dataset.kind = 'still'; if (src) bg.append(h('img', { class: 'tt-still', src, alt: '' })); }
  // 미리 렌더링 이미지를 바로 깔고(오프닝에서 이어지는 장면), 3D 가 준비되면 0.6초 동안 바꿔 끼움
  async function mountBg(bg) {
    still(bg);
    const q = UI.q3d || 'auto';
    if (rm() || q === 'low' || (q === 'auto' && (lowEnd() || slowNet())) || !ctx.hasGL()) return;
    // 라운드 1: 3D 를 만드는 동안 메인 스레드가 약 0.7초(CPU 4배 느린 휴대전화면 약 3초) 멈춤 — 측정. 그래서 "자동"이면
    //  ① 처음 실행은 그림(+ 느린 움직임)만 — 첫인상을 빨리, 3D 파일(약 1MB)도 받지 않음
    //  ② 두 번째부터는 2.5초 동안 아무것도 누르지 않을 때만 3D 로 바꿈 (누르는 순간 멈추지 않게). "좋게"면 바로 3D
    if (q === 'auto') {
      if (!UI.title3d) { UI.title3d = 1; ctx.saveUI(); return; }
      const touched = await new Promise((ok) => { const on = () => { off(); ok(true); }; const off = () => ['pointerdown', 'keydown'].forEach((e) => window.removeEventListener(e, on, true)); ['pointerdown', 'keydown'].forEach((e) => window.addEventListener(e, on, true)); setTimeout(() => { off(); ok(false); }, 2500); });
      if (touched) return;
    }
    if (!bg.isConnected) return;
    const holder = h('div', { class: 'tt-3d' }); bg.append(holder);
    const H = Math.round(window.innerHeight * 0.86);
    const r = await ctx.mountSite(holder, { zones: [], onPick: () => {}, height: H, backdrop: true, onSlow: q === 'auto' ? () => { bg.classList.remove('live'); bg.dataset.kind = 'still-slow'; bg3d = null; setTimeout(() => holder.remove(), 700); } : null }).catch(() => null);
    if (!bg.isConnected) { r?.destroy(); return; }
    if (!r) { holder.remove(); return; }
    bg3d = r; requestAnimationFrame(() => requestAnimationFrame(() => { bg.classList.add('live'); bg.dataset.kind = '3d'; }));
  }
  function stopBg() { bg3d?.destroy(); bg3d = null; document.body.classList.remove('titled'); }

  /* ---------- 처음 "시작하기": 소개(처음만) → 모드 → 사전 점검 ---------- */
  function startFlow() {
    if (UI.lang == null && !/^ko/i.test(navigator.language || 'ko') && ctx.langsReady().length > 1) { UI.lang = ctx.getLang(); ctx.saveUI(); return langPage(() => startFlow()); }
    if (!UI.aboutDone) about(() => pickMode(() => ctx.preTest()), () => showTitle());
    else pickMode(() => ctx.preTest());
  }

  /* ---------- ③ "이 앱은?" 소개 4장 (30초 이내, 건너뛰기) ---------- */
  function about(then, onBack) {
    const done = () => { UI.aboutDone = true; ctx.saveUI(); then(); };
    const v = page('about', t('about.title'), onBack || then);
    // 오른쪽 위 건너뛰기 (머리 줄의 듣기 자리 앞)
    const skip = h('button', { class: 'btn ghost ab-skip', id: 'abSkip', 'aria-label': t('about.skip'), onclick: () => { ctx.tap(); done(); } }, ic('next', { size: 16 }), ic('next', { size: 16 }), ctx.isPic() ? null : h('span', {}, t('about.skip')));
    $('.top.deep').insertBefore(skip, $('#sayBtn'));
    const PRE = ctx.PRE || {}, map = PRE.map, zone0 = PRE.zones?.tbm?.zone;
    const slides = [
      { art: () => h('div', { class: 'ab-art ab1' }, zone0 ? h('img', { src: zone0, alt: '' }) : null, h('span', { class: 'ab-gate', 'aria-hidden': 'true' }, ic('door', { size: 26 })),
          h('span', { class: 'ab-who', html: renderMascot({ pose: 'stand', face: 'basic', size: 120, cls: 'm-fix' }) })), k: 's1', ic: 'worker' },
      { art: () => routeArt(map), k: 's2', ic: 'walk' },
      { art: () => findArt(), k: 's3', ic: 'finger' },
      { art: () => cardArt(), k: 's4', ic: 'book' },
    ];
    let i = 0;
    const show = () => {
      ctx.dots(slides.length, i);
      v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
      const s = slides[i], line = t('about.' + s.k), last = i === slides.length - 1;
      v.dataset.say = line;
      v.append(h('div', { class: 'ab-slide' }, s.art(),
          h('div', { class: 'ab-line' }, h('span', { class: 'ab-ic' }, ic(s.ic, { size: 22 })), h('p', {}, line), ctx.canSpeak() ? h('button', { class: 'q-say', 'aria-label': t('scene.listen'), onclick: () => ctx.speak(line) }, ic('sound', { size: 22 })) : null)),
        h('div', { class: 'nav2' },
          i ? h('button', { class: 'btn', id: 'abPrev', 'aria-label': t('common.prev'), onclick: () => { ctx.tap(); i--; show(); } }, ic('back')) : null,
          h('button', { class: 'btn primary big', id: last ? 'abGo' : 'abNext', onclick: () => { ctx.tap(); if (last) done(); else { i++; show(); } } },
            h('span', {}, last ? t('about.go') : t('common.next')), ic(last ? 'site' : 'next'))));
      ctx.autoSay();
    };
    show();
    window.__about = { n: slides.length };
  }
  // 2장: 현장 지도 위로 동선 점선이 그려짐 (구역 이름표 위치 = 미리 렌더링 pins)
  function routeArt(map) {
    const box = h('div', { class: 'ab-art ab2' });
    if (!map) return box;
    box.append(h('img', { src: map.img, alt: '' }));
    const W = 1080, H = 1220, pts = map.pins.map((p) => [p.x * W / 100, p.y * H / 100]);
    const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(0)} ${y.toFixed(0)}`).join(' ');
    box.insertAdjacentHTML('beforeend', `<svg class="ab-route" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="${d}" pathLength="100" fill="none" stroke="var(--bg)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      <path class="ab-dash" d="${d}" pathLength="100" fill="none" stroke="var(--vest)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(([x, y], k) => `<circle class="ab-pin" style="--k:${k}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="22" fill="${k ? 'var(--bg)' : 'var(--brand)'}" stroke="var(--ink)" stroke-width="6"/>`).join('')}</svg>`);
    return box;
  }
  // 3장: 위험한 모습에서 손가락이 위험한 곳을 누르고 → 안전한 모습으로 (1-1 바닥 구멍 → 덮개, 미리 렌더링 쌍 — 한눈에 보이는 차이)
  function findArt() {
    const p = ctx.PRE?.zones?.floor?.pairs?.['1-1'], m = p?.meta?.diff || p?.meta?.focus || { x: 50, y: 45 };
    const box = h('div', { class: 'ab-art ab3', style: `--fx:${m.x}%;--fy:${m.y}%` });
    if (!p) return box;
    box.append(h('img', { class: 'ab-bad', src: p.bad, alt: '' }), h('img', { class: 'ab-good', src: p.good, alt: '' }),
      h('span', { class: 'ab-ring', 'aria-hidden': 'true' }), h('span', { class: 'ab-finger', 'aria-hidden': 'true' }, ic('finger', { size: 34 })),
      h('span', { class: 'ab-tag bad', 'aria-hidden': 'true' }, ic('cross', { size: 18 })), h('span', { class: 'ab-tag good', 'aria-hidden': 'true' }, ic('check', { size: 18 })));
    return box;
  }
  // 4장: 현장 안전 카드 한 줄 + 근거 배지 (실제 데이터: 1-2 바닥 끝 난간 — 법령·기본서 두 출처)
  function cardArt() {
    const z = ctx.SC.scenes.find((s) => s.id === 'floor')?.hazards.find((x) => x.id === '1-2');
    const p = ctx.PRE?.zones?.floor?.pairs?.['1-2'];
    return h('div', { class: 'ab-art ab4' },
      h('div', { class: 'ab-card' }, h('div', { class: 'ab-card-hd' }, ic('check', { size: 18 }), h('b', {}, t('card.title'))),
        h('div', { class: 'ab-card-row' }, p ? h('img', { src: p.good, alt: '' }) : null, h('div', {}, h('p', {}, z && ctx.shown(z.line) ? ctx.T(z.line) : ''),
          h('span', { class: 'ab-chips' }, (z?.line.src || []).map((id) => h('span', { class: 'basis-chip' }, ic('book', { size: 12 }), ctx.srcShort(id))))))));
  }

  /* ---------- ④ 모드 고르기: 글과 그림 / 그림만 ---------- */
  function pickMode(then) {
    const v = page('pick-mode', t('mode.title'), () => showTitle(), { say: t('intro.modeH') });
    const cur = UI.view || 'text';
    const opt = (id, name, label, sub) => h('button', { class: 'mode-opt big' + (cur === id ? ' sel' : ''), 'data-view': id, 'aria-pressed': cur === id ? 'true' : 'false', onclick: () => { ctx.tap(); UI.view = id; if (UI.autoSayUser == null) UI.autoSay = id === 'pic'; ctx.saveUI(); ctx.applyPrefs(); then(); } },
      h('span', { class: 'mo-pic', html: id === 'pic' ? `<span class="mo-big">${icon('eye', { size: 44 })}</span>` : `<span class="mo-big">${icon('eye', { size: 30 })}${icon('textmode', { size: 30 })}</span>` }),
      h('b', {}, label), h('small', {}, sub), sayMini(`${label}. ${sub}`));
    v.append(h('div', { class: 'intro' }, h('span', { class: 'sapi-s', html: sapi({ size: 96, mood: 'think' }) }), h('h2', {}, t('intro.modeH')), h('p', {}, t('mode.note'))),
      h('div', { class: 'mode-pick' }, opt('text', 'textmode', t('mode.text'), t('mode.textSub')), opt('pic', 'eye', t('mode.pic'), t('mode.picSub'))));
  }

  /* ---------- 게임 방법: 그림 설명서 (카드마다 움직이는 짧은 시연) ---------- */
  const HOW = ['loop', 'preview', 'find', 'swipe', 'card', 'stars', 'pic'];
  const HOW_READY = HOW; // v20 라운드 4: 7장 모두
  function howTo(onBack, start = 0) {
    const v = page('howto', t('how.title'), onBack);
    const cards = HOW.filter((k) => HOW_READY.includes(k));
    let i = Math.min(start, cards.length - 1);
    const show = () => {
      ctx.dots(cards.length, i);
      v.innerHTML = ''; v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
      const k = cards[i], line = t('how.' + k), no = HOW.indexOf(k) + 1;
      v.dataset.say = line;
      v.append(h('div', { class: 'how-card', 'data-how': k },
          h('div', { class: 'how-no' }, h('span', { class: 'how-n t-num' }, String(no)), ctx.isPic() ? null : h('b', {}, t('how.' + k + 'H'))),
          demo(k),
          h('div', { class: 'ab-line' }, h('p', {}, line), ctx.canSpeak() ? h('button', { class: 'q-say', 'aria-label': t('scene.listen'), onclick: () => ctx.speak(line) }, ic('sound', { size: 22 })) : null)),
        h('div', { class: 'nav2' },
          h('button', { class: 'btn', id: 'howPrev', disabled: i ? null : true, 'aria-label': t('common.prev'), onclick: () => { ctx.tap(); i--; show(); } }, ic('back')),
          h('button', { class: 'btn primary big', id: 'howNext', onclick: () => { ctx.tap(); if (i < cards.length - 1) { i++; show(); } else onBack(); } },
            h('span', {}, i < cards.length - 1 ? t('common.next') : t('how.done')), ic(i < cards.length - 1 ? 'next' : 'check'))));
      ctx.autoSay();
    };
    show();
  }
  // 시연: 실제 화면을 줄인 모양 + 손가락이 따라 하는 2~3초 반복 (동작 줄이기면 끝 장면 한 장)
  function demo(k) {
    const PRE = ctx.PRE || {};
    if (k === 'loop') {
      const map = PRE.map, pins = map?.pins || [];
      const box = h('div', { class: 'demo d-loop' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-bar' }, h('span', {}, ic('walk', { size: 14 })), h('i', {}), h('b', { class: 't-num' }, '0/7')),
        h('div', { class: 'd-map' }, map ? h('img', { src: map.img, alt: '' }) : null,
          ...pins.slice(0, 3).map((p, j) => h('span', { class: 'd-pin ' + (j === 0 ? 'cur' : j === 1 ? 'next' : 'lock'), style: `left:${p.x}%;top:${p.y}%` }, ic(j === 0 ? 'flag' : 'lock', { size: 14 }))),
          pins[0] ? h('span', { class: 'd-finger', style: `left:${pins[0].x}%;top:${pins[0].y}%` }, ic('finger', { size: 30 })) : null)));
      return box;
    }
    if (k === 'find') {
      // 1-1 바닥 구멍: 미리 렌더링 장면 v0 의 누를 곳(400×300 좌표 → %)
      const z = PRE.zones?.floor, v0 = z?.variants?.[0], A = v0?.areas?.hazards?.['1-1'], a = A && { x: +(A.x / 4).toFixed(1), y: +(A.y / 3).toFixed(1) };
      const sc = ctx.SC.scenes.find((s) => s.id === 'floor'), hz = sc?.hazards.find((x) => x.id === '1-1');
      const sit = hz && ctx.shown(hz.situation) ? ctx.T(hz.situation).replace(/\*\*/g, '') : '';
      return h('div', { class: 'demo d-find' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-sit' }, ic('eye', { size: 14 }), h('span', {}, sit)),
        h('div', { class: 'd-scene', style: a ? `--ax:${a.x}%;--ay:${a.y}%` : '' }, v0 ? h('img', { src: v0.img, alt: '' }) : null,
          h('span', { class: 'd-ring' }), h('span', { class: 'd-finger' }, ic('finger', { size: 30 })), h('span', { class: 'd-ok' }, ic('check', { size: 16 })))));
    }
    // 라운드 4: 나머지 5장 — 앱 안 그림(미리 렌더링 장면·비교 그림·아이콘)으로만
    const pairImg = (zone, id, side) => h('img', { src: `assets/scenes/${zone}/${id}-${side}.webp`, alt: '' });
    if (k === 'preview') {
      const sc = ctx.SC.scenes.find((s) => s.id === 'lifting'), zimg = PRE.zones?.lifting?.zone;
      const types = [...new Set((sc?.hazards || []).map((z) => z.type))].slice(0, 4);
      return h('div', { class: 'demo d-preview' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-bar' }, h('span', {}, ic('crane', { size: 14 })), h('i', {}), h('b', { class: 't-num' }, '1 → 2 → 3')),
        h('div', { class: 'd-zone' }, zimg ? h('img', { src: zimg, alt: '' }) : null),
        h('div', { class: 'd-types' }, types.map((ty, j) => h('span', { class: 'd-type', style: `--d:${j * 0.25}s` }, ic(ty, { size: 18 })))),
        h('span', { class: 'd-go' }, ic('search', { size: 14 }), ic('next', { size: 14 }))));
    }
    if (k === 'swipe') {
      return h('div', { class: 'demo d-swipe' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-cards' },
          h('div', { class: 'd-card c-bad' }, pairImg('lifting', '3-1', 'bad'), h('span', { class: 'd-tag no' }, ic('stop', { size: 16 }))),
          h('div', { class: 'd-card c-good' }, pairImg('floor', '1-1', 'good'), h('span', { class: 'd-tag ok' }, ic('next', { size: 16 })))),
        h('div', { class: 'd-sides' }, h('span', { class: 'no' }, ic('back', { size: 14 }), ic('stop', { size: 16 })), h('span', { class: 'ok' }, ic('walk', { size: 16 }), ic('next', { size: 14 })))));
    }
    if (k === 'card') {
      return h('div', { class: 'demo d-cardd' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-bar dark' }, h('span', {}, ic('crane', { size: 14 })), h('i', {}), h('b', { class: 'd-st' }, ic('star', { size: 10 }), ic('star', { size: 10 }), ic('star', { size: 10 }))),
        h('div', { class: 'd-zone' }, PRE.zones?.lifting?.zone ? h('img', { src: PRE.zones.lifting.zone, alt: '' }) : null),
        ...['3-1', '3-2'].map((id, j) => h('div', { class: 'd-row', style: `--d:${0.3 + j * 0.3}s` }, h('b', { class: 't-num' }, String(j + 1)), pairImg('lifting', id, 'bad'), ic('next', { size: 12 }), pairImg('lifting', id, 'good'))),
        h('span', { class: 'd-save' }, ic('download', { size: 16 }))));
    }
    if (k === 'stars') {
      return h('div', { class: 'demo d-stars' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-mascot', html: sapi({ size: 64, mood: 'cheer' }) }),
        h('div', { class: 'd-starrow' }, [0, 1, 2].map((j) => h('span', { class: 'd-star', style: `--d:${j * 0.3}s` }, ic('star', { size: 30 })))),
        h('div', { class: 'd-badge' }, ic('flag', { size: 22 })),
        h('div', { class: 'd-nohint' }, ic('search', { size: 14 }), h('s', {}, ic('help', { size: 14 })))));
    }
    if (k === 'pic') {
      return h('div', { class: 'demo d-picm' }, h('div', { class: 'd-phone' },
        h('div', { class: 'd-toggle' }, h('span', { class: 'a' }, 'Aa'), h('span', { class: 'b' }, ic('eye', { size: 18 }))),
        h('div', { class: 'd-zone' }, PRE.zones?.floor?.zone ? h('img', { src: PRE.zones.floor.zone, alt: '' }) : null),
        h('div', { class: 'd-say' }, ic('sound', { size: 26 }), h('i', { class: 'w1' }), h('i', { class: 'w2' }), h('i', { class: 'w3' }))));
    }
    return h('div', { class: 'demo' });
  }

  /* ---------- ⑤ 환경 설정 ---------- */
  /* ---------- v21 언어: 목록(고른 언어 표시, 번역 파일이 있는 것만 누를 수 있음) · 언어 화면 ---------- */
  function langList() {
    const cur = ctx.getLang(), ready = ctx.langsReady();
    return h('div', { class: 'opts langs' }, LANGS.filter((L) => ready.includes(L.id)).map((L) =>
      h('button', { class: 'opt lang-opt' + (L.id === cur ? ' right sel' : ''), 'data-lang': L.id, lang: L.id, 'aria-pressed': L.id === cur ? 'true' : 'false', onclick: () => { ctx.tap(); if (L.id !== cur) ctx.setLang(L.id); } },
        ic('globe', { size: 20 }), h('span', { class: 'opt-t' }, L.name), L.id === cur ? h('span', { class: 'mark-ok' }, ic('check', { size: 20 })) : null)));
  }
  const langNote = () => (ctx.getLang() !== 'ko' ? h('p', { class: 'small lang-note' }, ic('idea', { size: 16 }), ' ', t('i18n.aiNote')) : null);
  function langPage(onBack) {
    const v = page('lang', t('i18n.pick'), onBack);
    v.append(h('div', { class: 'lang-hero' }, ic('globe', { size: 40 })), langList(), langNote());
  }
  function settings(onBack) {
    const v = page('settings', t('title.settings'), onBack);
    const render = () => {
      v.innerHTML = '';
      v.append(h('div', { class: 'set-hero' }, h('span', { class: 'sapi-s', html: sapi({ size: 56, mood: 'think' }) }), h('p', {}, t('set.hello'))));
      const grp = (name, title, ...rows) => h('section', { class: 'set-grp' }, h('h2', { class: 'sec head' }, ic(name, { size: 22 }), h('span', {}, title)), h('div', { class: 'card-lite set' }, ...rows));
      const sw = (id, name, label, on, fn) => h('label', { class: 'set-row', 'data-set': id }, ic(name), h('span', {}, label), sayMini(label),
        h('input', { type: 'checkbox', role: 'switch', id: 'set-' + id, checked: on ? true : null, onchange: (e) => { fn(e.target.checked); ctx.saveUI(); ctx.applyPrefs(); ctx.tap(); render(); } }));
      const seg = (id, name, label, opts, cur, fn) => h('div', { class: 'set-row col', 'data-set': id }, h('div', { class: 'set-lbl' }, ic(name), h('span', {}, label), sayMini(label)),
        h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, opts.map(([val, txt, art]) => h('button', { class: 'seg-b' + (cur === val ? ' on' : ''), role: 'radio', 'aria-checked': cur === val ? 'true' : 'false', 'aria-label': txt, 'data-val': val, onclick: () => { fn(val); ctx.saveUI(); ctx.applyPrefs(); ctx.tap(); render(); } }, art ? h('span', { class: 'seg-art', html: art }) : null, h('span', { class: 'seg-t' }, txt)))));
      const view = UI.view || 'text';
      const vcard = (id, label) => h('button', { class: 'mode-opt' + (view === id ? ' sel' : ''), 'data-view': id, 'aria-pressed': view === id ? 'true' : 'false', onclick: () => { UI.view = id; if (UI.autoSayUser == null) UI.autoSay = id === 'pic'; ctx.saveUI(); ctx.applyPrefs(); ctx.tap(); render(); } },
        h('span', { class: 'mo-big', html: id === 'pic' ? icon('eye', { size: 32 }) : icon('eye', { size: 24 }) + icon('textmode', { size: 24 }) }), h('b', {}, label));
      const fs = UI.fontSize || 'm';
      v.append(
        grp('eye', t('set.gView'),
          h('div', { class: 'set-row col', 'data-set': 'view' }, h('div', { class: 'set-lbl' }, ic('eye'), h('span', {}, t('set.view')), sayMini(t('set.view'))), h('div', { class: 'mode-pick sm' }, vcard('text', t('mode.text')), vcard('pic', t('mode.pic')))),
          seg('font', 'textsize', t('set.font'), [['m', t('set.fontM'), icon('textsize', { size: 16 })], ['l', t('set.fontL'), icon('textsize', { size: 21 })], ['xl', t('set.fontXL'), icon('textsize', { size: 26 })]], fs, (x) => { UI.fontSize = x; }),
          h('p', { class: 'set-preview', id: 'fontPreview' }, t('set.fontPreview')),
          sw('motion', 'motion', t('set.motion'), ctx.reduceMotion(), (on) => { UI.motion = on; }),
          seg('q3d', 'quality', t('set.q3d'), [['auto', t('set.qAuto'), icon('quality', { size: 18 }) + icon('check', { size: 14 })], ['low', t('set.qLow'), icon('quality', { size: 16 })], ['high', t('set.qHigh'), icon('quality', { size: 18 }) + icon('star', { size: 14 })]], UI.q3d || 'auto', (x) => { UI.q3d = x; })),
        grp('sound', t('set.gSound'),
          sw('sound', 'sound', t('settings.sound'), !!UI.sound, (on) => { UI.sound = on; }),
          sw('autoSay', 'play', t('set.autoSay'), ctx.autoSayOn(), (on) => { UI.autoSay = on; UI.autoSayUser = true; }),
          seg('rate', 'speed', t('set.rate'), [['slow', t('set.rateSlow'), icon('walk', { size: 18 })], ['normal', t('set.rateNormal'), icon('walk', { size: 18 }) + icon('next', { size: 14 })]], UI.rate || 'normal', (x) => { UI.rate = x; }),
          sw('vibrate', 'vibrate', t('settings.vibrate'), UI.vibrate !== false, (on) => { UI.vibrate = on; })),
        grp('globe', t('set.gLang'), langList(), langNote()),
        grp('learn', t('set.gLearn'),
          h('button', { class: 'btn set-btn', id: 'setAbout', onclick: () => { ctx.tap(); about(() => settings(onBack), () => settings(onBack)); } }, ic('idea'), h('span', {}, t('set.aboutAgain')), ic('next', { size: 18 })),
          h('button', { class: 'btn set-btn', id: 'setHow', onclick: () => { ctx.tap(); howTo(() => settings(onBack)); } }, ic('help'), h('span', {}, t('title.how')), ic('next', { size: 18 })),
          h('button', { class: 'btn set-btn', id: 'setPost', disabled: ctx.allScenes() ? null : true, onclick: () => { ctx.tap(); ctx.postTest(); } }, ic('test'), h('span', {}, t('set.post')), ctx.allScenes() ? ic('next', { size: 18 }) : ic('lock', { size: 18 })),
          ctx.allScenes() ? null : h('small', { class: 'set-note' }, t('set.postLocked'))),
        grp('record', t('set.gRecord'),
          h('p', { class: 'small' }, t('record.exportNote')),
          h('button', { class: 'btn set-btn', id: 'setExport', onclick: () => { ctx.tap(); ctx.exportData(); } }, ic('download'), h('span', {}, t('record.exportBtn'))),
          h('button', { class: 'btn danger set-btn', id: 'setWipe', onclick: () => { ctx.tap(); wipeAsk(render); } }, ic('trash'), h('span', {}, t('set.wipe')))),
        grp('book', t('set.gInfo'),
          h('button', { class: 'btn set-btn', id: 'setInfo', onclick: () => { ctx.tap(); info(() => settings(onBack)); } }, ic('book'), h('span', {}, t('set.info')), ic('next', { size: 18 })),
          h('p', { class: 'small set-ver' }, `${t('app.name')} ${APP_VERSION} · ${t('title.legal')}`)));
    };
    render();
  }
  // 기록 지우기: 확인 2번 — ① "정말 지울까요?" ② 버튼을 3초 누르고 있기
  function wipeAsk(after) {
    const close = () => dlg.remove();
    const dlg = h('div', { class: 'dlg-wrap', id: 'wipeDlg', role: 'dialog', 'aria-modal': 'true' });
    const step1 = () => { dlg.innerHTML = ''; dlg.append(h('div', { class: 'dlg' }, h('span', { class: 'sapi-s', html: sapi({ size: 64, mood: 'worry' }) }), h('h2', {}, t('set.wipeQ')), h('p', {}, t('set.wipeQ2')),
      h('div', { class: 'nav2' }, h('button', { class: 'btn', id: 'wipeNo', onclick: close }, t('common.cancel')), h('button', { class: 'btn danger', id: 'wipeYes1', onclick: step2 }, t('set.wipeYes'))))); };
    const step2 = () => {
      dlg.innerHTML = '';
      let timer = null, t0 = 0, raf = 0;
      const lab = h('span', {}, t('set.wipeHold'));
      const fill = h('i', { class: 'hold-fill' });
      const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); fill.style.width = '0%'; lab.textContent = t('set.wipeHold'); };
      const tick = () => { const k = Math.min(1, (performance.now() - t0) / 3000); fill.style.width = (k * 100).toFixed(1) + '%'; lab.textContent = t('set.wipeCount', { n: Math.max(1, Math.ceil(3 - k * 3)) }); if (k < 1) raf = requestAnimationFrame(tick); };
      const hold = h('button', { class: 'btn danger big hold', id: 'wipeHold', onpointerdown: (e) => { e.preventDefault(); t0 = performance.now(); tick(); timer = setTimeout(() => { cancelAnimationFrame(raf); close(); ctx.wipe(); showTitle(); ctx.toast(t('set.wiped')); }, 3000); }, onpointerup: stop, onpointerleave: stop, onpointercancel: stop, oncontextmenu: (e) => e.preventDefault() }, fill, ic('trash'), lab);
      dlg.append(h('div', { class: 'dlg' }, h('h2', {}, t('set.wipeLast')), h('p', {}, t('set.wipeLastSub')), hold, h('button', { class: 'btn ghost', id: 'wipeNo2', onclick: close }, t('common.cancel'))));
    };
    step1(); document.body.append(dlg);
  }

  /* ---------- 정보: 앱 소개 · 버전 · 법정 교육 아님 · 근거 자료 · 만든 사람들·에셋 라이선스 ---------- */
  async function info(onBack) {
    const v = page('info', t('set.info'), onBack);
    const SRC = Object.values(ctx.SRC || {});
    const by = (g) => SRC.filter((s) => s.grade === g);
    const docs = (list) => [...new Map(list.map((s) => [s.doc, s])).values()];
    v.append(h('section', { class: 'card-lite info-top' }, h('span', { class: 'tt-mark', html: logoMark({ size: 56 }) }),
        h('div', {}, h('b', {}, `${t('app.name')} ${APP_VERSION}`), h('p', {}, t('info.what')))),
      h('p', { class: 'legal-box' }, ic('warn', { size: 18 }), h('span', {}, t('info.legal'))),
      h('h2', { class: 'sec' }, t('info.sources', { n: SRC.length })),
      h('div', { class: 'card-lite info-src' }, [1, 2, 3].map((g) => { const ds = docs(by(g)); return ds.length ? h('div', {}, h('b', {}, `${t('grade.' + g)} (${by(g).length})`), h('ul', {}, ds.map((s) => h('li', {}, `${s.org} 「${s.doc}」`)))) : null; })),
      h('h2', { class: 'sec' }, t('info.credits')));
    const cr = h('div', { class: 'card-lite info-cr' }, h('p', {}, h('b', {}, t('info.maker')), ' ', t('info.makerName')));
    v.append(cr);
    try {
      const M = (await (await fetch('./data/media.json')).json()).media;
      const groups = new Map();
      for (const m of M) { if (/자체 제작/.test(m.license || '')) continue; const k = `${m.author} · ${m.license}`; groups.set(k, (groups.get(k) || 0) + 1); }
      cr.append(h('ul', {}, [...groups.entries()].map(([k, n]) => h('li', {}, `${k} (${n})`)), h('li', {}, t('info.three'))));
    } catch {}
    cr.append(h('p', { class: 'small' }, t('info.self')));
    // v22 현장 말 사진: 사진마다 작성자·라이선스·원본 (CC BY·BY-SA 표시 의무)
    try {
      const TMJ = await (await fetch('./data/terms.json')).json();
      const ph = Object.values(TMJ.terms).filter((x) => x.credit && !x.credit.own);
      if (ph.length) v.append(h('h2', { class: 'sec' }, t('info.photos', { n: ph.length })),
        h('div', { class: 'card-lite info-cr info-ph' }, h('ul', {}, ph.map((x) => h('li', {}, h('b', { lang: 'ko' }, x.ko), ' — ', x.credit.artist, ' · ', x.credit.licUrl ? h('a', { href: x.credit.licUrl, target: '_blank', rel: 'noopener' }, x.credit.lic) : x.credit.lic, ' · ', h('a', { href: x.credit.page, target: '_blank', rel: 'noopener' }, 'Wikimedia Commons'))))));
    } catch {}
  }

  return { langPage, showTitle, about, pickMode, howTo, settings, info, stopBg, hasRecord };
}
