// 첫 삽 v18 — 근로자 (코드 모델, 키 약 1.72m). 보호구는 부품마다 켜고 끈다 → scenes.json 의 bad/good 과 1:1
// makeWorker(THREE, M, o, RB) → THREE.Group
//  M(key): 재질 (js/learn/materials.js kit.mat). RB: RoundedBoxGeometry(모서리 베벨, 없으면 BoxGeometry)
//  o: { helmet: true|false|'white', chinStrap: true|false, vest: true, boots: true|false(운동화), harness: false, hook: null|[x,y,z](몸 기준 고리 건 곳),
//       pose: 'stand'|'walk'|'carry'|'crouch'|'weld'|'flag'|'point'|'sit'|'wipe'|'climb'|'lie', ry }
//  얼굴·국적이 드러나지 않게 얼굴은 그리지 않는다. 첫삽이 캐릭터와 구분되는 실사 비율. 치수 근거: docs/모델_치수.md
export function makeWorker(THREE, M, o = {}, RB = null) {
  const g = new THREE.Group(); g.rotation.y = o.ry || 0;
  const rbox = (w, h, d, r = 0.02) => (RB ? new RB(w, h, d, 2, Math.min(r, Math.min(w, h, d) * 0.45)) : new THREE.BoxGeometry(w, h, d));
  const add = (geo, mat, px, py, pz, parent = g) => { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const limb = (px, py, pz, len, r, mat, rx = 0, rz = 0, parent = g) => { const p = new THREE.Group(); p.position.set(px, py, pz); p.rotation.set(rx, 0, rz); parent.add(p); add(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10), mat, 0, -len / 2, 0, p); return p; };
  const pose = o.pose || 'stand';
  const low = pose === 'crouch' || pose === 'weld', seat = pose === 'sit' || pose === 'wipe';
  const hip = low ? 0.5 : seat ? 0.45 : 0.9;
  const PANTS = 'fabric:navy', SHIRT = 'fabric:shirt', SKIN = 'skin', GLOVE = 'fabric:gray';
  const body = new THREE.Group(); g.add(body);

  // 다리 + 신발 (안전화: 발목 높이, 두꺼운 밑창, 앞코 보강 / 운동화: 낮고 흰색)
  const legLen = low ? 0.5 : 0.86;
  const legA = pose === 'walk' ? 0.35 : low ? -1.2 : seat ? -1.45 : 0;
  const legL = limb(-0.1, hip, 0, legLen, 0.078, PANTS, legA, 0, body);
  const legR = limb(0.1, hip, 0, legLen, 0.078, PANTS, pose === 'walk' ? -0.35 : legA, 0, body);
  if (low) { limb(-0.1, hip, 0.45, 0.45, 0.072, PANTS, 0, 0, body); limb(0.1, hip, 0.45, 0.45, 0.072, PANTS, 0, 0, body); }
  for (const lg of [legL, legR]) {
    const foot = new THREE.Group(); foot.position.set(0, -legLen, 0.04); lg.add(foot);
    if (o.boots === false) { // 운동화
      add(rbox(0.12, 0.075, 0.27, 0.03), 'paint:white', 0, 0.02, 0.01, foot);
      add(rbox(0.125, 0.025, 0.275, 0.01), 'rubber:gray', 0, -0.02, 0.01, foot);
      add(rbox(0.127, 0.02, 0.12, 0.008), 'paint:blue', 0, 0.03, -0.02, foot);
    } else { // 안전화
      add(rbox(0.135, 0.16, 0.17, 0.035), 'rubber:--art-dirt-dark', 0, 0.06, -0.035, foot);
      add(rbox(0.14, 0.095, 0.29, 0.04), 'rubber:--art-dirt-dark', 0, 0.015, 0.02, foot);
      add(rbox(0.15, 0.04, 0.3, 0.012), 'rubber:navy', 0, -0.04, 0.02, foot);
      add(rbox(0.142, 0.06, 0.07, 0.025), 'rubber:--art-dark', 0, 0.01, 0.135, foot); // 앞코 보강
    }
  }
  // 몸통 (허리·셔츠·조끼)
  const torso = new THREE.Group(); torso.position.set(0, hip, 0); body.add(torso);
  if (low) torso.rotation.x = 0.35;
  add(rbox(0.36, 0.14, 0.21, 0.05), PANTS, 0, 0.04, 0, torso);
  add(rbox(0.38, 0.52, 0.21, 0.07), SHIRT, 0, 0.33, 0, torso);
  if (o.vest !== false) {
    add(rbox(0.41, 0.4, 0.245, 0.07), 'vest', 0, 0.32, 0, torso);
    for (const y of [0.22, 0.36]) add(rbox(0.415, 0.04, 0.25, 0.02), M('paint:white', { glow: 0.35 }), 0, y, 0, torso); // 반사띠 2줄
    for (const sx of [-0.12, 0.12]) add(rbox(0.075, 0.05, 0.23, 0.02), 'vest', sx, 0.545, 0, torso); // 어깨끈
  }
  // 안전대(전신식): 어깨끈·가슴끈·허리벨트·다리고리 + 등 D링 — 위험한 모습과 차이가 한눈에
  let dring = null;
  if (o.harness) {
    const W = 'fabric:yellow';
    for (const sx of [-0.1, 0.1]) add(rbox(0.06, 0.6, 0.27, 0.02), W, sx, 0.3, 0, torso);
    add(rbox(0.43, 0.06, 0.27, 0.02), W, 0, 0.44, 0, torso);
    add(rbox(0.44, 0.075, 0.27, 0.02), W, 0, 0.07, 0, torso);
    add(rbox(0.05, 0.05, 0.03, 0.01), 'steel', 0, 0.44, 0.14, torso);
    const dr = add(new THREE.TorusGeometry(0.045, 0.012, 6, 16), 'steel', 0, 0.5, -0.15, torso); dring = dr;
    for (const lg of [legL, legR]) add(new THREE.TorusGeometry(0.095, 0.022, 6, 16), W, 0, -0.12, 0, lg).rotation.x = Math.PI / 2;
  }
  // 팔 + 장갑
  const armPose = { stand: [0, 0.08], walk: [-0.4, 0.08], carry: [-1.2, 0.15], crouch: [-0.9, 0.1], lie: [0, 0.3], weld: [-1.3, 0.1], flag: [0, 2.6], point: [-1.4, 0.1], sit: [-0.6, 0.15], wipe: [-0.6, 0.15], climb: [-2.7, 0.2] }[pose] || [0, 0.08];
  const lArm = limb(-0.255, 0.55, 0, 0.62, 0.058, SHIRT, armPose[0], armPose[1], torso);
  const rArm = limb(0.255, 0.55, 0, 0.62, 0.058, SHIRT, pose === 'walk' ? 0.4 : pose === 'flag' ? 0 : pose === 'wipe' ? -2.5 : armPose[0], pose === 'flag' ? -2.7 : pose === 'wipe' ? 0.5 : -armPose[1], torso);
  for (const a of [lArm, rArm]) add(new THREE.SphereGeometry(0.058, 10, 8), GLOVE, 0, -0.64, 0, a);
  if (pose === 'flag') { add(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), 'steel', 0, -0.9, 0, rArm); add(rbox(0.02, 0.28, 0.36, 0.005), 'paint:red', 0, -1.1, 0.18, rArm); }
  if (pose === 'carry') add(rbox(1.4, 0.04, 0.5, 0.01), 'plywood', 0, 0.42, 0.42, torso);
  if (pose === 'weld') add(rbox(0.06, 0.06, 0.4, 0.02), 'rubber:dark', 0.1, 0.45, 0.45, torso);

  // 머리 (얼굴 없음) + 안전모
  const head = new THREE.Group(); head.position.set(0, 0.7, 0); torso.add(head);
  add(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 12), SKIN, 0, -0.04, 0, head); // 목
  const skull = add(new THREE.SphereGeometry(0.105, 18, 14), SKIN, 0, 0.08, 0.005, head); skull.scale.set(0.95, 1.08, 1.02);
  for (const sx of [-0.1, 0.1]) add(new THREE.SphereGeometry(0.022, 8, 6), SKIN, sx, 0.07, 0, head);
  if (o.helmet === false) {
    add(new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), 'fabric:dark', 0, 0.095, -0.005, head); // 머리카락
  } else {
    const HC = o.helmet === 'white' ? 'paint:white' : 'paint:yellow';
    const hg = new THREE.Group(); hg.position.set(0, 0.102, 0); head.add(hg);
    if (o.chinStrap === false) hg.rotation.set(-0.32, 0, 0.18); // 턱끈을 안 매면 뒤로 젖혀 얹힘
    // 둥근 모자 (회전체) + 앞 차양 + 가운데 줄기
    const prof = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI / 2; prof.push(new THREE.Vector2(Math.cos(a) * 0.132 + 0.001, Math.sin(a) * 0.125)); }
    add(new THREE.LatheGeometry(prof.reverse(), 24), HC, 0, 0, 0, hg);
    const brim = add(new THREE.CylinderGeometry(0.145, 0.148, 0.016, 28), HC, 0, 0.004, 0.006, hg);
    brim.scale.set(1, 1, 1.08);
    const peak = add(new THREE.CylinderGeometry(0.11, 0.11, 0.014, 20, 1, false, -Math.PI / 2, Math.PI), HC, 0, 0.012, 0.1, hg); peak.rotation.x = 0.12;
    add(rbox(0.028, 0.03, 0.24, 0.012), HC, 0, 0.12, 0, hg);
    // 턱끈: 맴 = 귀 앞에서 턱 아래로 팽팽하게 이어지고 턱 밑에 버클 / 안 맴 = 양옆으로 늘어져 흔들림 (차이가 한눈에)
    const S = 'rubber:dark', strap = (a, b, r = 0.009) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const m = add(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 6), S, 0, 0, 0, hg); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m; };
    if (o.chinStrap === false) {
      for (const sx of [-1, 1]) { strap([sx * 0.13, -0.005, 0.01], [sx * 0.2, -0.24, 0.05]); add(rbox(0.03, 0.04, 0.02, 0.006), 'paint:gray', sx * 0.2, -0.25, 0.05, hg); }
    } else {
      for (const sx of [-1, 1]) strap([sx * 0.125, -0.005, 0.0], [sx * 0.035, -0.146, 0.065]);
      strap([-0.035, -0.146, 0.065], [0.035, -0.146, 0.065], 0.011);
      add(rbox(0.03, 0.03, 0.02, 0.006), 'paint:gray', 0, -0.15, 0.07, hg); // 턱 밑 버클
    }
  }
  if (pose === 'weld') add(rbox(0.26, 0.24, 0.05, 0.02), 'rubber:--asphalt-2', 0, 0.08, 0.12, head);
  // 죔줄 + 고리: 등 D링 → hook 위치
  if (o.harness && o.hook && dring) {
    g.updateMatrixWorld(true);
    const a = new THREE.Vector3(); dring.getWorldPosition(a); g.worldToLocal(a);
    const b = new THREE.Vector3(...o.hook), len = a.distanceTo(b);
    const rope = add(new THREE.CylinderGeometry(0.012, 0.012, len, 6), 'fabric:orange', 0, 0, 0); rope.position.copy(a).add(b).multiplyScalar(0.5); rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const hk = add(new THREE.TorusGeometry(0.03, 0.01, 6, 12, Math.PI * 1.6), 'steel', b.x, b.y, b.z); hk.rotation.y = Math.PI / 2;
  }
  if (pose === 'lie') { g.rotation.z = Math.PI / 2; g.position.y = 0.18; }
  return g;
}
