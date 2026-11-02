// 뚝딱뚝딱 현장 테마곡 + 효과음 (assets/bgm.mp3가 있으면 그것을, 없으면 Web Audio로 합성)
let ctx = null, master = null, musicGain = null, sfxGain = null;
let musicOn = true, sfxOn = true, playing = false, timer = null, step = 0, nextTime = 0;
let mp3 = null, mp3Checked = false;

export function setPrefs(m, s) { musicOn = m; sfxOn = s; if (musicGain) musicGain.gain.value = m ? 0.32 : 0; if (mp3) { mp3.muted = !m; } }

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.32 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

async function tryMp3() {
  if (mp3Checked) return !!mp3;
  mp3Checked = true;
  try {
    const r = await fetch('./assets/bgm.mp3', { method: 'HEAD' });
    if (r.ok && (r.headers.get('content-type') || '').includes('audio')) {
      mp3 = new Audio('./assets/bgm.mp3'); mp3.loop = true; mp3.volume = 0.45; mp3.muted = !musicOn;
      return true;
    }
  } catch {}
  return false;
}

export async function startMusic() {
  unlock();
  if (playing || !ctx) return;
  playing = true;
  if (await tryMp3()) { mp3.play().catch(() => {}); return; }
  step = 0; nextTime = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 50);
}
export function stopMusic() { playing = false; clearInterval(timer); if (mp3) mp3.pause(); }

// 8비트 곡: C장조, 템포 132, 16분음표 스텝
const BPM = 132, S = 60 / BPM / 4;
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
// 멜로디(64스텝 = 4마디), 0 = 쉼
const MEL = [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 74, 72, 0, 0, 0,
  74, 0, 77, 0, 81, 0, 77, 0, 79, 0, 77, 76, 74, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 84, 0, 81, 0, 79, 0, 77, 76, 74, 0,
  76, 0, 74, 0, 72, 0, 74, 76, 72, 0, 0, 0, 79, 0, 0, 0];
const BASS = [48, 55, 52, 55, 50, 57, 53, 57, 48, 55, 52, 55, 43, 50, 47, 50];
function schedule() {
  if (!playing) return;
  while (nextTime < ctx.currentTime + 0.25) {
    const s = step % 64;
    if (MEL[s]) tone(N(MEL[s]), nextTime, S * 1.6, 'square', 0.09, musicGain);
    if (s % 4 === 0) tone(N(BASS[(s / 4) % 16]), nextTime, S * 2.5, 'triangle', 0.22, musicGain);
    // 공사 소리 리듬: 망치 "뚝"(킥) 1·3박, 우드블록 "딱" 2·4박, 쇠 "챙" 엇박
    if (s % 8 === 0) hammer(nextTime, musicGain, 0.5);
    if (s % 8 === 4) woodblock(nextTime, musicGain, 0.35, 1);
    if (s % 16 === 14) woodblock(nextTime, musicGain, 0.22, 1.5);
    if (s % 4 === 2) clank(nextTime, musicGain, 0.05);
    nextTime += S; step++;
  }
}

function tone(f, t, d, type, v, out, slide) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.02);
}
function noise(t, d, v, out, freq = 1000, q = 1, type = 'bandpass') {
  const len = Math.max(1, Math.floor(ctx.sampleRate * d));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = v;
  src.connect(f).connect(g).connect(out); src.start(t);
}
function hammer(t, out, v) { tone(150, t, 0.12, 'sine', v, out, 50); noise(t, 0.04, v * 0.4, out, 2500, 1.5); }
function woodblock(t, out, v, k = 1) { tone(900 * k, t, 0.06, 'sine', v, out, 700 * k); tone(1800 * k, t, 0.03, 'square', v * 0.15, out); }
function clank(t, out, v) { noise(t, 0.05, v, out, 7000, 3, 'highpass'); }

export function sfx(name) {
  if (!sfxOn || !ctx) return;
  const t = ctx.currentTime, o = sfxGain;
  switch (name) {
    case 'build': hammer(t, o, 0.7); woodblock(t + 0.12, o, 0.5); break; // 뚝-딱
    case 'tamp': tone(110, t, 0.15, 'sine', 0.8, o, 40); noise(t, 0.08, 0.3, o, 400, 1); break;
    case 'coin': tone(988, t, 0.08, 'square', 0.18, o); tone(1319, t + 0.08, 0.25, 'square', 0.18, o); break;
    case 'pop': tone(600, t, 0.09, 'sine', 0.35, o, 1200); break;
    case 'fanfare': [72, 76, 79, 84, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.12, i === 5 ? 0.6 : 0.14, 'square', 0.16, o)); hammer(t, o, 0.5); hammer(t + 0.6, o, 0.6); break;
    case 'horn': tone(330, t, 0.35, 'sawtooth', 0.12, o); tone(415, t, 0.35, 'sawtooth', 0.1, o); tone(330, t + 0.45, 0.5, 'sawtooth', 0.12, o); tone(415, t + 0.45, 0.5, 'sawtooth', 0.1, o); break;
    case 'good': tone(784, t, 0.1, 'square', 0.15, o); tone(1047, t + 0.1, 0.2, 'square', 0.15, o); break;
    case 'bad': tone(220, t, 0.25, 'square', 0.15, o, 150); break;
    case 'tap': woodblock(t, o, 0.4); break;
    case 'drop': tone(500, t, 0.3, 'sine', 0.3, o, 120); break;
    case 'thud': hammer(t, o, 0.8); break;
    case 'radio': noise(t, 0.18, 0.25, o, 1800, 0.8); tone(1400, t + 0.2, 0.08, 'square', 0.12, o); tone(1400, t + 0.32, 0.08, 'square', 0.12, o); noise(t + 0.45, 0.12, 0.2, o, 2200, 0.8); break; // 무전기 치직-삐삐
    case 'ding': tone(1319, t, 0.5, 'sine', 0.3, o); tone(1047, t + 0.25, 0.7, 'sine', 0.25, o); break; // 호이스트 도착 띵동
  }
}
