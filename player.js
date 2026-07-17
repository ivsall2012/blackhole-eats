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
    }

    // movement direction in world (camera-relative)
    desiredMoveDir() {
      let ix=0, iz=0;
      if (this.keys['w']||this.keys['arrowup']) iz -= 1;
      if (this.keys['s']||this.keys['arrowdown']) iz += 1;
      if (this.keys['a']||this.keys['arrowleft']) ix -= 1;
      if (this.keys['d']||this.keys['arrowright']) ix += 1;
      if (ix===0 && iz===0) return new THREE.Vector3();
      // camera-relative: forward is from camera toward player (away from camera)
      const fwd = new THREE.Vector3(-Math.sin(this.camYaw),0,-Math.cos(this.camYaw));
      const right = new THREE.Vector3(Math.cos(this.camYaw),0,-Math.sin(this.camYaw));
      const dir = new THREE.Vector3();
      dir.addScaledVector(fwd, -iz);
      dir.addScaledVector(right, ix);
      if (dir.lengthSq()>0) dir.normalize();
      return dir;
    }

    update(dt, world) {
      if (!this.alive) return;
      const dir = this.desiredMoveDir();
      // accelerate toward dir * maxSpeed
      const target = dir.clone().multiplyScalar(this.maxSpeed);
      this.vel.x = Utils.smooth(this.vel.x, target.x, 0.18, dt);
      this.vel.z = Utils.smooth(this.vel.z, target.z, 0.18, dt);
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