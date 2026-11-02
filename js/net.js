// 함께 짓기(동시접속) — Firebase Realtime Database REST + 스트리밍(SSE)
// SDK 없이 동작해서 가볍고, 인터넷이 없으면 자동으로 혼자 하기.
import { FIREBASE_DB_URL } from './firebase-config.js';

const ONLINE_WINDOW = 70000;
let myId = null, getInfo = null, handlers = {};
let presence = {}; // id -> info
let mode = 'off'; // 'firebase' | 'local' | 'off'
let es1 = null, es2 = null, bc = null, beat = null;
const base = FIREBASE_DB_URL.replace(/\/$/, '');

export const netMode = () => mode;

export function startNet(id, infoFn, h) {
  myId = id; getInfo = infoFn; handlers = h;
  stopNet();
  if (base && navigator.onLine) startFirebase();
  else startLocal();
  beat = setInterval(publish, 15000);
  publish();
  window.addEventListener('online', () => { if (base && mode !== 'firebase') { stopNet(); startFirebase(); beat = setInterval(publish, 15000); publish(); } });
  window.addEventListener('offline', () => { if (mode === 'firebase') { stopNet(); mode = 'off'; handlers.onChange?.(); } });
  window.addEventListener('pagehide', leave);
}

function stopNet() {
  es1?.close(); es2?.close(); bc?.close(); clearInterval(beat);
  es1 = es2 = bc = null;
}

function startFirebase() {
  mode = 'firebase';
  try {
    es1 = new EventSource(`${base}/presence.json`);
    const onEv = (e) => {
      const { path, data } = JSON.parse(e.data);
      if (path === '/') presence = data || {};
      else {
        const parts = path.split('/').filter(Boolean);
        const id = parts[0];
        if (parts.length === 1) { if (data === null) delete presence[id]; else presence[id] = data; }
        else if (presence[id]) presence[id][parts[1]] = data;
      }
      handlers.onChange?.();
    };
    es1.addEventListener('put', onEv); es1.addEventListener('patch', onEv);
    es1.onerror = () => { if (es1.readyState === 2) { mode = 'off'; handlers.onChange?.(); } };
    es2 = new EventSource(`${base}/inbox/${myId}.json`);
    es2.addEventListener('put', (e) => {
      const { path, data } = JSON.parse(e.data);
      if (!data) return;
      const items = path === '/' ? data : { [path.slice(1)]: data };
      for (const [k, msg] of Object.entries(items)) {
        if (!msg || typeof msg !== 'object') continue;
        handlers.onMessage?.(msg);
        fetch(`${base}/inbox/${myId}/${k}.json`, { method: 'DELETE' }).catch(() => {});
      }
    });
  } catch (e) { console.warn(e); startLocal(); }
}

function startLocal() {
  mode = 'local';
  if (!('BroadcastChannel' in window)) { mode = 'off'; return; }
  bc = new BroadcastChannel('cheotsap-net');
  bc.onmessage = (e) => {
    const m = e.data;
    if (m.t === 'presence') { presence[m.id] = m.info; handlers.onChange?.(); }
    else if (m.t === 'leave') { delete presence[m.id]; handlers.onChange?.(); }
    else if (m.t === 'msg' && m.to === myId) handlers.onMessage?.(m.msg);
    else if (m.t === 'hello') publish();
  };
  bc.postMessage({ t: 'hello' });
}

function publish() {
  if (!getInfo) return;
  const info = { ...getInfo(), ts: Date.now() };
  if (mode === 'firebase') fetch(`${base}/presence/${myId}.json`, { method: 'PUT', body: JSON.stringify(info) }).catch(() => {});
  else if (mode === 'local') bc?.postMessage({ t: 'presence', id: myId, info });
}
export const publishNow = publish;

function leave() {
  if (mode === 'firebase') fetch(`${base}/presence/${myId}.json`, { method: 'DELETE', keepalive: true }).catch(() => {});
  else if (mode === 'local') bc?.postMessage({ t: 'leave', id: myId });
}

export function onlineFriends() {
  const now = Date.now();
  return Object.entries(presence)
    .filter(([id, p]) => id !== myId && p && now - (p.ts || 0) < ONLINE_WINDOW)
    .map(([id, p]) => ({ id, ...p }));
}

export function sendTo(id, msg) {
  const full = { ...msg, from: myId, ts: Date.now() };
  if (mode === 'firebase') return fetch(`${base}/inbox/${id}.json`, { method: 'POST', body: JSON.stringify(full) }).then((r) => r.ok).catch(() => false);
  if (mode === 'local') { bc?.postMessage({ t: 'msg', to: id, msg: full }); return Promise.resolve(true); }
  return Promise.resolve(false);
}
