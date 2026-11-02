// 실시간 날씨 — Open-Meteo (키 불필요). 실패하면 계절 기반 가상 예보
import { CITIES } from './data.js';

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return ymd(dt);
}
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function fmtDate(dateStr, withDow = true) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}` + (withDow ? `(${DOW[dt.getDay()]})` : '');
}
export function dayDiff(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
}

let cache = { city: null, days: {}, live: false, fetchedAt: 0 };

export async function fetchForecast(cityId) {
  const c = CITIES.find((x) => x.id === cityId) || CITIES[0];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=16&past_days=92`;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(url, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const d = j.daily, days = {};
    d.time.forEach((t, i) => {
      days[t] = { code: d.weather_code[i] ?? 0, tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i],
        rain: d.precipitation_sum[i] ?? 0, wind: d.wind_speed_10m_max[i] ?? 0, live: true };
    });
    cache = { city: cityId, days, live: true, fetchedAt: Date.now() };
    try { localStorage.setItem('cheotsap.wx', JSON.stringify(cache)); } catch {}
    return true;
  } catch (e) {
    console.warn('weather fetch failed', e);
    try {
      const old = JSON.parse(localStorage.getItem('cheotsap.wx') || 'null');
      if (old && old.city === cityId) { cache = { ...old, live: false }; return false; }
    } catch {}
    cache = { city: cityId, days: {}, live: false, fetchedAt: 0 };
    return false;
  }
}

// 결정적 가상 예보(날짜 시드)
function rng(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function virtual(dateStr) {
  const r = rng(dateStr + 'wx');
  const m = Number(dateStr.slice(5, 7));
  const base = [0, -1, 2, 8, 14, 19, 23, 27, 28, 23, 16, 9, 2][m];
  const tmax = Math.round((base + 5 + (r() - 0.5) * 8) * 10) / 10;
  const tmin = Math.round((base - 4 + (r() - 0.5) * 6) * 10) / 10;
  const wet = (m >= 6 && m <= 8) ? 0.4 : 0.22;
  const x = r();
  let code = 0, rain = 0;
  if (x < wet * 0.35) { code = tmax < 2 ? 73 : 63; rain = 6 + r() * 15; }
  else if (x < wet) { code = tmax < 2 ? 71 : 61; rain = 0.5 + r() * 3.5; }
  else if (x < wet + 0.05) code = 45;
  else if (x < wet + 0.35) code = 2;
  const wind = Math.round((2 + r() * 7 + (r() < 0.12 ? 6 : 0)) * 10) / 10;
  return { code, tmax, tmin, rain: Math.round(rain * 10) / 10, wind, live: false };
}

// 발표·테스트용: 주소에 ?wx=clear 를 붙이면 맑은 날로 고정
const FORCE = new URLSearchParams(location.search).get('wx');
export function getWeather(dateStr) {
  if (FORCE === 'clear') return { code: 0, tmax: 21, tmin: 11, rain: 0, wind: 3, live: false };
  return cache.days[dateStr] || virtual(dateStr);
}
export const isLive = () => cache.live;

export function describe(w) {
  const c = w.code;
  let icon = '☀️', name = '맑음', kind = 'clear';
  if (c === 1 || c === 2) { icon = '⛅'; name = '구름 조금'; kind = 'cloud'; }
  else if (c === 3) { icon = '☁️'; name = '흐림'; kind = 'cloud'; }
  else if (c === 45 || c === 48) { icon = '🌫️'; name = '안개'; kind = 'fog'; }
  else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) { icon = '🌧️'; name = c < 60 ? '이슬비' : '비'; kind = 'rain'; }
  else if ((c >= 71 && c <= 77) || c === 85 || c === 86) { icon = '❄️'; name = '눈'; kind = 'snow'; }
  else if (c >= 95) { icon = '⛈️'; name = '뇌우'; kind = 'storm'; }
  return { icon, name, kind };
}

// 날씨가 공사에 미치는 영향
export function effect(w) {
  const d = describe(w);
  const out = { stop: false, mult: 1, craneStop: false, notes: [] };
  if (w.rain >= 5 || d.kind === 'snow' || d.kind === 'storm') {
    out.stop = true; out.mult = 0;
    out.notes.push(d.kind === 'snow' ? '눈 → 공사 중지 (공기 1일 연장 인정)' : d.kind === 'storm' ? '뇌우 → 공사 중지 (공기 1일 연장 인정)' : `비 ${w.rain}mm → 공사 중지 (공기 1일 연장 인정)`);
    return out;
  }
  if (d.kind === 'rain') { out.mult *= 0.5; out.notes.push('약한 비 → 작업량 50% (타설 금지)'); }
  if (d.kind === 'fog') { out.mult *= 0.8; out.notes.push('안개 → 작업량 80%'); }
  if (w.wind >= 10) { out.craneStop = true; out.mult *= 0.85; out.notes.push(`풍속 ${w.wind}m/s → 타워크레인 운행 중지, 85%`); }
  if (w.tmin <= 0) { out.mult *= 0.8; out.notes.push(`최저 ${w.tmin}°C → 한중 콘크리트 보양, 80%`); }
  if (w.tmax >= 33) { out.mult *= 0.7; out.notes.push(`최고 ${w.tmax}°C → 폭염 휴식, 70%`); }
  if (!out.notes.length) out.notes.push('작업하기 좋은 날 · 작업량 100%');
  return out;
}
