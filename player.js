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
      this.keys = {};
      // touch state — drag anywhere on screen as a virtual joystick
      this.touch = { active:false, id:null, sx:0, sy:0, cx:0, cy:0 };
      this._bindInput();
    }

    _bindInput() {
      window.addEventListener('keydown', (e)=>{
        this.keys[e.key.toLowerCase()] = true;
        if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
      });
      window.addEventListener('keyup', (e)=>{ this.keys[e.key.toLowerCase()] = false; });
      window.addEventListener('mousemove', (e)=>{
        // use horizontal mouse position for slight camera yaw influence
        this._mx = (e.clientX / window.innerWidth) * 2 - 1;
      });

      // Touch joystick ------------------------------------------------
      // Treat the whole screen as a floating joystick: the touch start
      // position is the centre, current touch offset → movement direction.
      const isTouch = (e) => e.pointerType === 'touch' || e.touches !== undefined
        || (e.pointerType && e.pointerType !== 'mouse');
      // Use Pointer Events for unified mouse/touch; only act on touch.
      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        const t = this.touch;
        if (t.active && t.id !== null) return; // one finger only
        t.active = true; t.id = e.pointerId;
        t.sx = t.cx = e.clientX; t.sy = t.cy = e.clientY;
        try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch(_){}
      });
      window.addEventListener('pointermove', (e) => {
        if (!this.touch.active || this.touch.id !== e.pointerId) return;
        this.touch.cx = e.clientX; this.touch.cy = e.clientY;
      });
      const endTouch = (e) => {
        const t = this.touch;
        if (t.id !== e.pointerId) return;
        t.active = false; t.id = null;
        t.cx = t.sx; t.cy = t.sy;
      };
      window.addEventListener('pointerup', endTouch);
      window.addEventListener('pointercancel', endTouch);

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
      // keyboard
      if (this.keys['w']||this.keys['arrowup']) iz -= 1;
      if (this.keys['s']||this.keys['arrowdown']) iz += 1;
      if (this.keys['a']||this.keys['arrowleft']) ix -= 1;
      if (this.keys['d']||this.keys['arrowright']) ix += 1;
      // touch joystick
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
      const speed = this.maxSpeed * (strength !== undefined ? strength : 1);
      const target = dir.clone().multiplyScalar(speed);
      // tighter smoothing → snappier, low-latency follow on touch & keyboard
      this.vel.x = Utils.smooth(this.vel.x, target.x, 0.35, dt);
      this.vel.z = Utils.smooth(this.vel.z, target.z, 0.35, dt);
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