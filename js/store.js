// 진행 상황 저장: 웹은 localStorage, 앱(Capacitor)은 Preferences
const KEY = 'cheotsap.save.v1';
const Prefs = () => window.Capacitor?.Plugins?.Preferences;

export async function loadSave() {
  try {
    const p = Prefs();
    if (p && window.Capacitor.isNativePlatform?.()) {
      const { value } = await p.get({ key: KEY });
      if (value) return JSON.parse(value);
    }
  } catch (e) { console.warn('prefs load', e); }
  try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

let timer = null;
export function save(state) {
  clearTimeout(timer);
  timer = setTimeout(() => saveNow(state), 300);
}
export function saveNow(state) {
  const s = JSON.stringify(state);
  try { localStorage.setItem(KEY, s); } catch {}
  try { const p = Prefs(); if (p && window.Capacitor.isNativePlatform?.()) p.set({ key: KEY, value: s }); } catch {}
}
export function wipe() {
  try { localStorage.removeItem(KEY); } catch {}
  try { Prefs()?.remove({ key: KEY }); } catch {}
}
