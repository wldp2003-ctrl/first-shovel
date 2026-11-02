// 공용 가상 조이스틱 (폰: 왼쪽 아래 패드 / PC: 방향키·WASD)
export function createJoystick(container) {
  const vec = { x: 0, y: 0 }; // x: 오른쪽 +, y: 위(앞) +
  const pad = document.createElement('div'); pad.className = 'joy';
  const knob = document.createElement('div'); knob.className = 'joy-knob';
  pad.append(knob); container.append(pad);
  const R = 46;
  let pid = null, cx = 0, cy = 0, touch = { x: 0, y: 0 };
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    pid = e.pointerId; pad.setPointerCapture(pid);
    const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    move(e);
  });
  const move = (e) => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    setKnob(dx, dy);
    touch = { x: dx / R, y: -dy / R };
  };
  const up = (e) => { if (e.pointerId !== pid) return; pid = null; touch = { x: 0, y: 0 }; setKnob(0, 0); };
  pad.addEventListener('pointermove', move);
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);

  const keys = new Set();
  const MAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  const kd = (e) => { const k = MAP[e.code]; if (k) { keys.add(k); e.preventDefault(); } };
  const ku = (e) => { const k = MAP[e.code]; if (k) keys.delete(k); };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  return {
    vec,
    read() {
      let x = touch.x, y = touch.y;
      if (keys.size) {
        x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
        y = (keys.has('u') ? 1 : 0) - (keys.has('d') ? 1 : 0);
        const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
      }
      vec.x = x; vec.y = y;
      return vec;
    },
    // 테스트·자동 조작용
    setVirtual(x, y) { touch = { x, y }; },
    dispose() { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); pad.remove(); },
  };
}
