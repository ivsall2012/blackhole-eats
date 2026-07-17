// ai.js — AI black hole opponents
const AI = (() => {
  const NAMES = ['VoidMaster','BlackKing','NullReaper','SingularityX','DarkMaw',
    'GravityGhoul','NoxGobbler','SkyDevourer','CosmicJaws','EventHorizon'];
  const COLORS = [0xff4d6a,0x4dffce,0xffb84d,0x4d8aff,0xb04dff,0x4dff4d,0xff4dff];

  class AISlot extends BlackHole.BlackHole {
    constructor(scene, opts={}) {
      super(scene, Object.assign({
        radius: Utils.rand(0.4, 0.65),
        x: Utils.rand(-40,40),
        z: Utils.rand(-40,40),
      }, opts));
      this.isAI = true;
      this.name = opts.name || Utils.pick(NAMES);
      this.color = opts.color || (COLORS[(Math.random()*COLORS.length)|0]);
      this.rim.material.color.setHex(this.color);
      this.glow.material.color.setHex(this.color);

      this.maxSpeed = Utils.rand(9.5, 11.5);
      this.accel = 36;
      this.aggression = Utils.rand(0.9, 1.25); // per-AI personality: how eagerly it hunts prey
      this.vel = new THREE.Vector3();
      // AI state
      this.thinkTimer = 0;
      this.wanderDir = new THREE.Vector3(Utils.rand(-1,1),0,Utils.rand(-1,1)).normalize();
      this.fleeing = false;
      this.targetObj = null;
      this.dead = false;
    }

    think(dt, world, blackholes) {
      this.thinkTimer -= dt;
      if (this.thinkTimer > 0) return;
      // react quicker so it can pounce and dodge more responsively
      this.thinkTimer = Utils.rand(0.12, 0.28);

      const me = this.pos;
      let best = null, bestScore = -1;
      // scan nearby objects
      const range = this.radius * 9 + 14;
      const r2 = range*range;
      const list = world.queryNear(me.x, me.z, range);
      for (const o of list) {
        if (!o.alive) continue;
        if (!this.canEat(o.size)) continue;
        const d2 = Utils.dist2(me.x, me.z, o.mesh.position.x, o.mesh.position.z);
        if (d2 > r2) continue;
        const sc = o.score - Math.sqrt(d2)*0.4;
        if (sc > bestScore) { bestScore = sc; best = o; }
      }
      this.targetObj = best;

      // threat & prey detection among blackholes
      let threat = null, threatD = Infinity;
      let prey = null, preyD = Infinity;
      for (const b of blackholes) {
        if (b===this || !b.alive) continue;
        const d = Utils.dist(me.x, me.z, b.pos.x, b.pos.z);
        if (b.radius > this.radius * 1.15 && d < threatD && d < range*1.1) {
          threat = b; threatD = d;
        }
        // Much more aggressive: only needs 15% size edge, and will hunt prey
        // across the full scan range (scaled by its aggression personality).
        if (this.radius > b.radius * 1.15 && d < preyD && d < range * this.aggression) {
          prey = b; preyD = d;
        }
      }
      this.threat = threat;
      this.prey = prey;

      if (threat) { this.fleeing = true;
        this.fleeDir = new THREE.Vector3(me.x - threat.pos.x, 0, me.z - threat.pos.z).normalize();
      } else this.fleeing = false;
    }

    update(dt, world, blackholes) {
      if (!this.alive) return;
      this.think(dt, world, blackholes);

      let dir = new THREE.Vector3();
      let speedMul = 1;
      if (this.fleeing && this.threat) {
        dir.copy(this.fleeDir);
        speedMul = 1.15; // panic sprint when fleeing
      } else if (this.prey) {
        dir.set(this.prey.pos.x - this.pos.x, 0, this.prey.pos.z - this.pos.z).normalize();
        speedMul = 1.2 * this.aggression; // burst of speed when hunting prey
      } else if (this.targetObj) {
        dir.set(this.targetObj.mesh.position.x - this.pos.x, 0,
                this.targetObj.mesh.position.z - this.pos.z).normalize();
      } else {
        // wander, occasionally pick new direction
        if (Math.random()<0.02 || this.wanderDir.lengthSq()<0.01)
          this.wanderDir.set(Utils.rand(-1,1),0,Utils.rand(-1,1)).normalize();
        dir.copy(this.wanderDir);
      }

      const target = dir.multiplyScalar(this.maxSpeed * speedMul);
      this.vel.x = Utils.smooth(this.vel.x, target.x, 0.12, dt);
      this.vel.z = Utils.smooth(this.vel.z, target.z, 0.12, dt);
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      const b = world.bounds;
      if (this.pos.x < -b) { this.pos.x=-b; this.wanderDir.x*=-1; }
      if (this.pos.x >  b) { this.pos.x= b; this.wanderDir.x*=-1; }
      if (this.pos.z < -b) { this.pos.z=-b; this.wanderDir.z*=-1; }
      if (this.pos.z >  b) { this.pos.z= b; this.wanderDir.z*=-1; }
      this._updateTransform();
      this.disk.rotation.z += dt * 0.6;
      this.rim.rotation.z += dt * 0.3;
      for (const o of this.orbiters) {
        o.angle += dt * o.speed;
        const r = o.radius;
        o.sprite.position.set(Math.cos(o.angle)*r, Math.sin(o.angle*1.5)*0.4 + o.tilt, Math.sin(o.angle)*r);
      }
      const p = 1 + Math.sin(performance.now()*0.004 + this.pos.x)*0.05;
      this.glow.scale.setScalar(p);
    }

    grow(deltaR) { this.setRadius(this.radius + deltaR); }
  }

  function spawnAll(scene, count, world, player) {
    const arr = [];
    const usedNames = new Set([player.name]);
    for (let i=0;i<count;i++) {
      let name;
      do { name = Utils.pick(NAMES); } while (usedNames.has(name));
      usedNames.add(name);
      // spawn away from player
      let x,z, tries=0;
      do { x=Utils.rand(-world.bounds*0.8, world.bounds*0.8); z=Utils.rand(-world.bounds*0.8, world.bounds*0.8); tries++; }
      while (tries<20 && Utils.dist(x,z,player.pos.x,player.pos.z) < 25);
      const ai = new AISlot(scene, { name, x, z, color:COLORS[i%COLORS.length] });
      arr.push(ai);
    }
    return arr;
  }
  return { AISlot, spawnAll, NAMES, COLORS };
})();