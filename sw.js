// 첫 삽 서비스 워커 — 앱 파일은 미리 저장(오프라인 실행), 글꼴은 처음 받을 때 저장, 날씨·Firebase는 항상 네트워크
const VERSION = 'cheotsap-v15';
const CORE = [
  './', './index.html', './game.html', './css/tokens.css', './css/learn.css', './js/learn/app.js', './js/learn/mascot.js', './js/learn/site3d.js', './js/learn/scene3d.js', './fonts/BlackHanSans-Regular.woff2', './js/learn/art.js', './js/learn/icons.js', './js/learn/brand.js', './js/learn/scene-art.js', './js/learn/scene-art2.js', './data/lessons.json', './data/sources.json', './data/scenes.json',
  './fonts/fonts.css', './fonts/PretendardVariable.woff2', './fonts/NotoSans-latin.woff2', './fonts/NotoSans-latin-ext.woff2', './fonts/NotoSans-vietnamese.woff2', './fonts/NotoSans-cyrillic.woff2', './fonts/NotoSans-cyrillic-ext.woff2', './manifest.webmanifest', './css/style.css', './css/upgrade.css', './css/i18n.css', './vendor/three.module.js',
  './js/main.js', './js/scene.js', './js/models.js', './js/data.js', './js/ui.js', './js/audio.js', './js/weather.js',
  './js/store.js', './js/net.js', './js/firebase-config.js', './js/minigames.js', './js/safety.js', './js/i18n.js',
  './js/lang.js', './locales/ko.json', './locales/zh.json', './locales/vi.json', './locales/ru.json',
  './js/data2.js', './js/joystick.js', './js/walk.js', './js/games2.js', './js/walkgames.js', './js/hoist.js', './js/night.js', './js/basis.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
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
