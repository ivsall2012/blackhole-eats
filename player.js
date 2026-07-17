// player.js — Player black hole with input handling & camera follow
const Player = (() => {
  class Player extends BlackHole.BlackHole {
    constructor(scene, camera, opts={}) {
      super(scene, opts);
      this.isPlayer = true;
      this.camera = camera;
      this.name = 'You';
      this.color = 0x7a5dff;
      this.rim.material.color.setHex(this.color);
      this.glow.material.color.setHex(this.color);

      this.maxSpeed = 12;
      this.accel = 38;
      this.friction = 6;

      // camera follow parameters
      this.camYaw = 0;
      this.camPitch = 0.9;
      this.camDist = 14;
      this.camTarget = new THREE.Vector3();
      this.camPos = new THREE.Vector3(0,14,14);

      this.input = new THREE.Vector3();
      // keyboard intentionally disabled on PC — movement is mouse-driven.
      // touch state — drag anywhere on screen as a virtual joystick (mobile)
      this.touch = { active:false, id:null, sx:0, sy:0, cx:0, cy:0 };
      // mouse state — pointer position on screen (PC aim-to-move control)
      this.mouse = { active:false, x:0, y:0, overUI:false };
      this._bindInput();
    }

    _bindInput() {
      // ---- Touch (mobile) — virtual joystick ----
      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        const t = this.touch;
        if (t.active && t.id !== null) return; // one finger only
        t.active = true; t.id = e.pointerId;
        t.sx = t.cx = e.clientX; t.sy = t.cy = e.clientY;
        try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch(_){}
      });
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') {
          if (!this.touch.active || this.touch.id !== e.pointerId) return;
          this.touch.cx = e.clientX; this.touch.cy = e.clientY;
        } else if (e.pointerType === 'mouse' || e.pointerType === '') {
          // PC mouse aim
          this.mouse.active = true;
          this.mouse.x = e.clientX; this.mouse.y = e.clientY;
          // mark if hovering over an overlay (UI), so we don't steer
          this.mouse.overUI = !!(e.target && e.target.closest && e.target.closest('.overlay,.panel,button'));
        }
      });
      const endTouch = (e) => {
        const t = this.touch;
        if (t.id !== e.pointerId) return;
        t.active = false; t.id = null;
        t.cx = t.sx; t.cy = t.sy;
      };
      window.addEventListener('pointerup', endTouch);
      window.addEventListener('pointercancel', endTouch);
      window.addEventListener('mouseleave', () => { this.mouse.active = false; });

      // Prevent mobile scroll / pinch-zoom while playing
      const prevent = (e) => { if (this.touch.active) e.preventDefault(); };
      window.addEventListener('touchmove', prevent, { passive:false });
      window.addEventListener('gesturestart', (e)=>e.preventDefault());
    }

    // movement direction in world (camera-relative)
    // Returns { dir: Vector3 (unit), strength: 0..1 } so the touch joystick
    // can throttle speed proportional to how far you drag.
    desiredMoveDir() {
      let ix=0, iz=0, strength=1;
      // touch joystick (mobile)
      if (this.touch.active) {
        const dx = this.touch.cx - this.touch.sx;
        const dy = this.touch.cy - this.touch.sy;
        const maxR = 50; // saturation radius in px
        const r = Math.hypot(dx, dy);
        if (r > 4) {                 // 4 px deadzone (very responsive)
          const mag = Math.min(r / maxR, 1);
          ix = (dx / r) * mag;
          iz = (dy / r) * mag;
          strength = 1;             // mag already baked into ix/iz
        } else { ix=0; iz=0; }
      } else if (this.mouse.active && !this.mouse.overUI) {
        // PC: aim-to-move. Project a ray from the camera through the cursor
        // onto the ground plane (y=0). Steer toward that world point;
        // strength scales with distance from the player.
        const w = this._projectMouseToGround();
        if (w) {
          const dx = w.x - this.pos.x;
          const dz = w.z - this.pos.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.6) {                // small deadzone right under the hole
            const sat = 6;              // world-units to reach full strength
            strength = Math.min(d / sat, 1);
            ix = dx / d;
            iz = dz / d;
          } else { ix=0; iz=0; strength=0; }
        }
      }
      if (ix===0 && iz===0) return { dir: new THREE.Vector3(), strength: 0 };
      const fwd = new THREE.Vector3(-Math.sin(this.camYaw),0,-Math.cos(this.camYaw));
      const right = new THREE.Vector3(Math.cos(this.camYaw),0,-Math.sin(this.camYaw));
      const dir = new THREE.Vector3();
      dir.addScaledVector(fwd, -iz);
      dir.addScaledVector(right, ix);
      // keep magnitude from input (= throttle for touch)
      return { dir, strength };
    }

    update(dt, world) {
      if (!this.alive) return;
      const { dir, strength } = this.desiredMoveDir();
      // Mild size scaling: small hole is a touch slower (still responsive),
      // quickly reaches full speed as you grow — keeps early game in control
      // without the "slow/laggy" feel.
      const sizeFactor = Utils.clamp(0.7 + (this.radius - 0.6) * 0.18, 0.7, 1);
      const speed = this.maxSpeed * sizeFactor * (strength !== undefined ? strength : 1);
      const target = dir.clone().multiplyScalar(speed);
      // tighter smoothing → snappier, low-latency follow on touch & keyboard
      this.vel.x = Utils.smooth(this.vel.x, target.x, 0.45, dt);
      this.vel.z = Utils.smooth(this.vel.z, target.z, 0.45, dt);
      // move
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      // clamp to world bounds
      const b = world.bounds;
      this.pos.x = Utils.clamp(this.pos.x, -b, b);
      this.pos.z = Utils.clamp(this.pos.z, -b, b);

      this._updateTransform();
      this._visualUpdate(dt);
      this.updateCamera(dt);
    }

    // Project the current mouse position onto the ground plane (y=0) and
    // return the world-space target point, or null if the cursor misses the
    // ground (e.g., pointing at the sky). Used for PC aim-to-move control.
    _projectMouseToGround() {
      if (!this.camera || !this.mouse.active) return null;
      const ndcX = (this.mouse.x / window.innerWidth) * 2 - 1;
      const ndcY = -((this.mouse.y / window.innerHeight) * 2 - 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
      // intersect with y=0 plane: parametrize ray as origin + t*dir
      const o = ray.ray.origin, d = ray.ray.direction;
      if (Math.abs(d.y) < 1e-5) return null;
      const t = -o.y / d.y;
      if (t < 0) return null; // ground is behind the camera (cursor above horizon)
      return new THREE.Vector3(o.x + d.x*t, 0, o.z + d.z*t);
    }

    _visualUpdate(dt) {
      this.disk.rotation.z += dt * 0.6;
      this.rim.rotation.z += dt * 0.3;
      for (const o of this.orbiters) {
        o.angle += dt * o.speed;
        const r = o.radius;
        o.sprite.position.set(Math.cos(o.angle)*r, Math.sin(o.angle*1.5)*0.4 + o.tilt, Math.sin(o.angle)*r);
      }
      const p = 1 + Math.sin(performance.now()*0.004)*0.05;
      this.glow.scale.setScalar(p);
    }

    updateCamera(dt) {
      // Fixed camera orientation: it always looks down the same compass
      // direction and only follows position + zooms out as you grow.
      // (camYaw stays constant so strafing with A/D no longer rotates the view.)
      const targetDist = Utils.clamp(10 + this.radius * 1.6, 10, 60);
      this.camDist = Utils.smooth(this.camDist, targetDist, 0.05, dt);
      const pitch = Utils.clamp(0.7 + this.radius*0.03, 0.7, 1.2);
      this.camPitch = Utils.smooth(this.camPitch, pitch, 0.05, dt);

      // desired camera position: behind & above based on yaw
      const cx = this.pos.x + Math.sin(this.camYaw) * this.camDist * Math.cos(this.camPitch);
      const cz = this.pos.z + Math.cos(this.camYaw) * this.camDist * Math.cos(this.camPitch);
      const cy = this.pos.y + this.camDist * Math.sin(this.camPitch) + this.radius*0.6;
      this.camPos.set(
        Utils.smooth(this.camPos.x, cx, 0.12, dt),
        Utils.smooth(this.camPos.y, cy, 0.12, dt),
        Utils.smooth(this.camPos.z, cz, 0.12, dt)
      );
      this.camTarget.set(
        Utils.smooth(this.camTarget.x, this.pos.x, 0.15, dt),
        Utils.smooth(this.camTarget.y, this.pos.y + this.radius*0.8, 0.15, dt),
        Utils.smooth(this.camTarget.z, this.pos.z, 0.15, dt)
      );
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camTarget);
    }

    grow(deltaR) {
      this.setRadius(this.radius + deltaR);
    }
  }
  return { Player };
})();