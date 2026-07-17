// effects.js — particles, floating text, camera shake, distort ring
const FX = (() => {
  let scene, camera, dom, floatsLayer, w, h;
  let shakeAmt = 0;
  const pool = []; // sprite particles

  function init(scn, cam, domEl, floatEl, width, height) {
    scene = scn; camera = cam; dom = domEl; floatsLayer = floatEl; w = width; h = height;
  }
  function setSize(width, height){ w = width; h = height; }

  // ---- Floating score text in screen space ----
  function floatText(text, world3D, color='#fff') {
    if (!camera) return;
    const p = Utils.worldToScreen(world3D, camera, w, h);
    if (p.z > 1) return; // behind camera
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    el.style.color = color;
    floatsLayer.appendChild(el);
    setTimeout(()=>el.remove(), 1100);
  }

  // ---- Particle burst (pooled sprites) ----
  function getSprite() {
    for (const s of pool) if (!s.userData.active) {
      s.userData.active = true; s.visible = true; return s;
    }
    const mat = new THREE.SpriteMaterial({ color:0xffffff, transparent:true,
      opacity:1, blending:THREE.AdditiveBlending, depthWrite:false });
    const s = new THREE.Sprite(mat);
    s.userData = { active:true, vel:new THREE.Vector3(), life:0, max:1 };
    scene.add(s); pool.push(s);
    return s;
  }
  function burst(pos, color, count=14, speed=4, scaleMin=0.15, scaleMax=0.5) {
    const col = new THREE.Color(color);
    for (let i=0;i<count;i++) {
      const s = getSprite();
      s.material.color.copy(col);
      const sc = Utils.rand(scaleMin, scaleMax);
      s.scale.set(sc,sc,sc);
      s.position.copy(pos);
      const a = Math.random()*Utils.TAU, up = Utils.rand(0.3,1);
      const sp = Utils.rand(speed*0.3, speed);
      s.userData.vel.set(Math.cos(a)*sp, up*speed, Math.sin(a)*sp);
      s.userData.life = 0;
      s.userData.max = Utils.rand(0.4, 0.9);
    }
  }
  function shockwave(pos, color) {
    // animated ring expanding
    const geo = new THREE.RingGeometry(0.2, 0.35, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.9,
      side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(pos); ring.position.y = 0.05;
    ring.userData = { life:0, max:0.6, mat };
    scene.add(ring);
    ringList.push(ring);
  }
  const ringList = [];

  function shake(amt) { shakeAmt = Math.max(shakeAmt, amt); }
  function consumeShakeOffset() {
    const a = shakeAmt;
    shakeAmt *= 0.86;
    if (shakeAmt < 0.002) shakeAmt = 0;
    return { x:(Math.random()*2-1)*a, y:(Math.random()*2-1)*a };
  }

  function update(dt) {
    // particles
    for (const s of pool) {
      if (!s.userData.active) continue;
      s.userData.life += dt;
      const t = s.userData.life / s.userData.max;
      if (t >= 1) { s.userData.active=false; s.visible=false; continue; }
      s.position.addScaledVector(s.userData.vel, dt);
      s.userData.vel.multiplyScalar(0.94);
      s.userData.vel.y -= 6*dt;
      s.material.opacity = 1 - t;
      const sc = s.scale.x;
      s.scale.setScalar(sc * (1 - t*0.5));
    }
    // shockwave rings
    for (let i=ringList.length-1;i>=0;i--) {
      const r = ringList[i];
      r.userData.life += dt;
      const t = r.userData.life / r.userData.max;
      if (t>=1) {
        scene.remove(r); r.geometry.dispose(); r.material.dispose();
        ringList.splice(i,1); continue;
      }
      const sc = 1 + t*8;
      r.scale.set(sc,sc,sc);
      r.userData.mat.opacity = (1-t)*0.9;
    }
  }

  return { init, setSize, floatText, burst, shockwave, shake,
    consumeShakeOffset, update };
})();