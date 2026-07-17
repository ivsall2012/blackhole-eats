// utils.js — shared helpers
const Utils = (() => {
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function chance(p) { return Math.random() < p; }
  function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx*dx+dy*dy; }
  function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax,ay,bx,by)); }
  function smooth(cur, target, damp, dt) {
    // frame-rate independent exponential smoothing
    const k = 1 - Math.pow(1 - damp, dt * 60);
    return cur + (target - cur) * k;
  }
  function approach(cur, target, maxStep) {
    if (cur < target) return Math.min(cur + maxStep, target);
    return Math.max(cur - maxStep, target);
  }
  // world <-> screen projection helper (uses a camera)
  function worldToScreen(vec3, camera, w, h) {
    const v = vec3.clone().project(camera);
    return { x:(v.x*0.5+0.5)*w, y:(-v.y*0.5+0.5)*h, z:v.z };
  }

  // Color helpers ------------------------------------------------------
  function hsl(h, s, l) { return new THREE.Color().setHSL(h/360, s, l); }
  function shade(color, amount) { // amount -1..1
    const c = color.clone();
    const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 1));
    return c;
  }

  return { TAU, DEG, clamp, lerp, rand, randInt, pick, chance,
    dist2, dist, smooth, approach, worldToScreen, hsl, shade };
})();