// blackhole.js — BlackHole base class (player & AI visuals + gravity logic)
const BlackHole = (() => {
  let geomId = 0;

  class BlackHole {
    constructor(scene, opts={}) {
      this.scene = scene;
      this.radius = opts.radius || 0.5;       // eat/collision radius
      this.score = 0;
      this.eaten = 0;
      this.alive = true;
      this.color = opts.color || 0x6a4dff;
      this.name = opts.name || 'BlackHole';
      this.pos = new THREE.Vector3(opts.x||0, 0, opts.z||0);
      this.vel = new THREE.Vector3();
      this.target = new THREE.Vector3();
      this.isPlayer = !!opts.isPlayer;

      this._build();
    }

    _build() {
      const g = new THREE.Group();
      this.group = g;

      // Dark core - a sphere with pure black material
      const coreMat = new THREE.MeshBasicMaterial({ color:0x000000 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), coreMat);
      this.core = core;

      // Glowing rim ring (additive)
      const rimMat = new THREE.MeshBasicMaterial({
        color: this.color, transparent:true, opacity:0.9,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite:false
      });
      const rim = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.25, 48), rimMat);
      rim.rotation.x = -Math.PI/2;
      rim.position.y = 0.02;
      this.rim = rim;

      // Outer glow halo (backside)
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.color, transparent:true, opacity:0.35,
        blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite:false
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 18), glowMat);
      this.glow = glow;

      // Accretion disk - tilted ring
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0xffaa44, transparent:true, opacity:0.6,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite:false
      });
      const disk = new THREE.Mesh(new THREE.RingGeometry(1.3, 2.4, 64, 1), diskMat);
      disk.rotation.x = Math.PI/2 - 0.25;
      disk.rotation.z = 0.4;
      this.disk = disk;

      // Orbiting particle sprites
      this.orbiters = [];
      for (let i=0;i<10;i++) {
        const m = new THREE.SpriteMaterial({ color:0xffce88, transparent:true,
          opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false });
        const s = new THREE.Sprite(m);
        s.scale.set(0.18,0.18,0.18);
        this.orbiters.push({ sprite:s, angle:Math.random()*Utils.TAU,
          tilt:Utils.rand(-0.3,0.3), radius:Utils.rand(1.4,2.2),
          speed:Utils.rand(1.5,3.2)*(Math.random()<0.5?1:-1) });
        g.add(s);
      }

      g.add(glow, core, rim, disk);
      this.scene.add(g);
      this._updateTransform();
    }

    _updateTransform() {
      this.group.position.copy(this.pos);
      // visual scale relative to radius (radius is gameplay value)
      const s = this.radius;
      this.group.scale.setScalar(s);
      // grow core scale slightly less to keep rim brightness
      // store current outward radius in world units for gravity
    }

    setRadius(r) {
      this.radius = r;
      this._updateTransform();
    }

    // gravity radius in world units
  // Raised only modestly with size: a huge hole doesn't auto-vacuum the whole map.
  gravityRadius() { return this.radius * 2.0 + 1.2; }

  // gravity strength scaler — linear (not quadratic) so big holes don't
  // exponentially dominate. The strong-pull zone is also tightened in runGravity.
  gravityStrength() { return this.radius * 6 + 4; }

    update(dt) {
      if (!this.alive) return;
      // visual spin of accretion disk
      this.disk.rotation.z += dt * 0.6;
      this.rim.rotation.z += dt * 0.3;
      // orbiter animation
      const gr = this.radius;
      for (const o of this.orbiters) {
        o.angle += dt * o.speed;
        const r = o.radius;
        o.sprite.position.set(Math.cos(o.angle)*r, Math.sin(o.angle*1.5)*0.4 + o.tilt, Math.sin(o.angle)*r);
      }
      // pulsate glow
      const p = 1 + Math.sin(performance.now()*0.004)*0.05;
      this.glow.scale.setScalar(p);
    }

    // Returns true if object (with size oSize at distance d) is eatable
    canEat(oSize) { return this.radius > oSize * 0.92; }

    dispose() {
      this.scene.remove(this.group);
      this.core.geometry.dispose(); this.core.material.dispose();
      this.rim.geometry.dispose(); this.rim.material.dispose();
      this.glow.geometry.dispose(); this.glow.material.dispose();
      this.disk.geometry.dispose(); this.disk.material.dispose();
      for (const o of this.orbiters) { o.sprite.material.dispose(); }
    }
  }

  return { BlackHole };
})();