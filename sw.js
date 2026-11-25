// 첫 삽 서비스 워커 — 앱 파일은 미리 저장(오프라인 실행), 글꼴은 처음 받을 때 저장, 날씨·Firebase는 항상 네트워크
const VERSION = 'cheotsap-v20-r5';
const CORE = [
  './', './index.html', './game.html', './css/tokens.css', './css/learn.css', './js/learn/app.js', './js/learn/title.js', './data/media.json', './js/learn/mascot.js', './js/learn/site3d.js', './js/learn/scene3d.js', './js/learn/props3d.js', './data/prerender.json', './assets/scenes/map-sm.webp',
  // v18: 재질 세트·근로자 모델·베벨·CC0 모델·질감·HDRI
  './js/learn/materials.js', './js/learn/models/worker.js', './vendor/addons/geometries/RoundedBoxGeometry.js', './assets/tex/sky.hdr',
  './assets/tex/concrete_d.webp', './assets/tex/concrete_n.webp', './assets/tex/concrete_r.webp', './assets/tex/dirt_d.webp', './assets/tex/dirt_n.webp', './assets/tex/dirt_r.webp', './assets/tex/gravel_d.webp', './assets/tex/gravel_n.webp',
  './assets/tex/gravel_r.webp', './assets/tex/plywood_d.webp', './assets/tex/plywood_n.webp', './assets/tex/plywood_r.webp', './assets/tex/metal_d.webp', './assets/tex/metal_n.webp', './assets/tex/metal_r.webp',
  './assets/models/container.json', './assets/models/cone.json', './assets/models/barrier.json', './assets/models/warnlight.json', './assets/models/excavator.json', './assets/models/mixer.json', './assets/models/crane.json', './assets/models/dumper.json', './js/learn/models/safety.js', './js/learn/models/constructionHoist.js', './fonts/BlackHanSans-Regular.woff2', './js/learn/art.js', './js/learn/icons.js', './js/learn/brand.js', './js/learn/scene-art.js', './js/learn/scene-art2.js', './data/lessons.json', './data/sources.json', './data/scenes.json',
  './fonts/fonts.css', './fonts/pretendard-subset.css', './fonts/NotoSans-latin.woff2', './fonts/NotoSans-latin-ext.woff2', './fonts/NotoSans-vietnamese.woff2', './fonts/NotoSans-cyrillic.woff2', './fonts/NotoSans-cyrillic-ext.woff2', './manifest.webmanifest', './css/style.css', './css/upgrade.css', './css/i18n.css', './vendor/three.module.js',
  './js/main.js', './js/scene.js', './js/models.js', './js/data.js', './js/ui.js', './js/audio.js', './js/weather.js',
  './js/store.js', './js/net.js', './js/firebase-config.js', './js/minigames.js', './js/safety.js', './js/i18n.js',
  './js/lang.js', './locales/ko.json', './locales/ko-learn.json', './locales/zh.json', './locales/vi.json', './locales/ru.json',
  './js/data2.js', './js/joystick.js', './js/walk.js', './js/games2.js', './js/walkgames.js', './js/hoist.js', './js/night.js', './js/basis.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];
self.addEventListener('install', (e) => {
  // v17: 미리 렌더링한 지도·장면 이미지(data/prerender.json 에 적힌 것)도 처음 설치 때 저장 → 두 번째부터 오프라인
  e.waitUntil(caches.open(VERSION).then(async (c) => {
    await c.addAll(CORE);
    try { const m = await (await fetch('./data/prerender.json')).json(); const list = [...new Set(JSON.stringify(m).match(/assets\/scenes\/[^"]+/g) || [])].map((x) => './' + x); await c.addAll(list); } catch {}
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== 'fonts').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('open-meteo') || url.hostname.includes('firebase')) return; // 실시간 데이터
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(caches.open('fonts').then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // 앱 파일: 네트워크 우선(최신), 실패하면 캐시
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
