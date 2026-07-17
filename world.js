// world.js — procedural low-poly city + object management + spatial query
const World = (() => {
  const BLOCK = 12;       // block size
  const ROAD = 3;         // road width

  class World {
    constructor(scene, size=90) {
      this.scene = scene;
      this.bounds = size;       // half-extent
      this.objects = [];
      this.staticRoot = new THREE.Group(); scene.add(this.staticRoot);
      this.objRoot = new THREE.Group(); scene.add(this.objRoot);
      this._buildGround();
      this._buildCity();
    }

    _buildGround() {
      const total = this.bounds * 2;
      // grass base
      const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(total+40, total+40),
        new THREE.MeshLambertMaterial({ color:0x4caf50 })
      );
      grass.rotation.x = -Math.PI/2; grass.position.y = -0.05;
      grass.receiveShadow = true;
      this.staticRoot.add(grass);

      // roads grid
      const roadMat = new THREE.MeshLambertMaterial({ color:0x3a3a42 });
      const sideMat = new THREE.MeshLambertMaterial({ color:0x9a9a9a });
      const lineMat = new THREE.MeshLambertMaterial({ color:0xffd24a, emissive:0x553300 });
      const step = BLOCK + ROAD;
      const n = Math.floor(this.bounds / step);
      for (let i=-n; i<=n; i++) {
        const c = i*step;
        // skip the road that would run straight through the spawn area
        if (Math.abs(c) < step*0.5) continue;
        // horizontal road
        const rh = new THREE.Mesh(new THREE.BoxGeometry(this.bounds*2-BLOCK, 0.04, ROAD), roadMat);
        rh.rotation.x = -Math.PI/2; rh.position.set(0, 0.0, c); rh.receiveShadow=true;
        this.staticRoot.add(rh);
        // vertical road
        const rv = new THREE.Mesh(new THREE.BoxGeometry(ROAD, 0.04, this.bounds*2-BLOCK), roadMat);
        rv.rotation.x = -Math.PI/2; rv.position.set(c, 0.0, 0); rv.receiveShadow=true;
        this.staticRoot.add(rv);
        // center dashed line
        const lh = new THREE.Mesh(new THREE.PlaneGeometry(this.bounds*2-BLOCK, 0.1), lineMat);
        lh.rotation.x=-Math.PI/2; lh.position.set(0,0.02,c); this.staticRoot.add(lh);
        const lv = new THREE.Mesh(new THREE.PlaneGeometry(0.1, this.bounds*2-BLOCK), lineMat);
        lv.rotation.x=-Math.PI/2; lv.position.set(c,0.02,0); this.staticRoot.add(lv);
      }
    }

    _buildCity() {
      const step = BLOCK + ROAD;
      const n = Math.floor(this.bounds / step);
      // build blocks (sidewalk slabs) then place buildings/objects
      for (let bx=-n; bx<n; bx++) {
        for (let bz=-n; bz<n; bz++) {
          const cx = bx*step + step/2;
          const cz = bz*step + step/2;
          // skip center area so spawn is clear
          if (Math.hypot(cx,cz) < 8) continue;
          this._buildBlock(cx, cz);
        }
      }
      this._scatterObjects();
    }

    _buildBlock(cx, cz) {
      // sidewalk slab
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(BLOCK, 0.18, BLOCK),
        new THREE.MeshLambertMaterial({ color:0xb6b6ba })
      );
      slab.position.set(cx, 0.09, cz);
      slab.receiveShadow = true;
      this.staticRoot.add(slab);

      // decide block type
      const r = Math.random();
      if (r < 0.15) {
        // park: trees + benches + flowers, no building
        this._park(cx, cz);
      } else {
        // buildings: 1-4 small lots or a skyscraper
        this._buildings(cx, cz);
      }
    }

    _park(cx, cz) {
      // grass patch
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(BLOCK-0.6, 0.12, BLOCK-0.6),
        new THREE.MeshLambertMaterial({ color:0x66c066 })
      );
      grass.position.set(cx,0.16,cz); grass.receiveShadow=true;
      this.staticRoot.add(grass);
      const count = Utils.randInt(2,4);
      for (let i=0;i<count;i++) this._place('tree', cx+Utils.rand(-3,3), cz+Utils.rand(-3,3));
      for (let i=0;i<3;i++) this._place('bench', cx+Utils.rand(-3,3), cz+Utils.rand(-3,3));
      for (let i=0;i<5;i++) this._place('flower', cx+Utils.rand(-4,4), cz+Utils.rand(-4,4));
      this._place('lamp', cx-BLOCK/2+1, cz);
    }

    _buildings(cx, cz) {
      const slots = [
        [-BLOCK/4,-BLOCK/4],[ BLOCK/4,-BLOCK/4],
        [-BLOCK/4, BLOCK/4],[ BLOCK/4, BLOCK/4],
      ];
      const t = Math.random();
      if (t < 0.08) {
        const sk = Objects.create('skyscraper', cx, cz);
        this.addObj(sk);
        return;
      }
      const fill = Utils.randInt(1, 4);
      const pool = slots.slice();
      const sel = [];
      for (let i=0;i<fill && pool.length;i++) {
        const idx=(Math.random()*pool.length)|0;
        sel.push(pool[idx]); pool.splice(idx,1);
      }
      for (const s of sel) {
        const types = ['house','shop','shop','restaurant','house'];
        const type = Utils.pick(types);
        const o = Objects.create(type, cx+s[0], cz+s[1]);
        this.addObj(o);
      }
      // street props
      if (Math.random()<0.7) this._place('lamp', cx-BLOCK/2+1, cz);
      if (Math.random()<0.5) this._place('trashcan', cx+BLOCK/2-1, cz+BLOCK/2-1);
      if (Math.random()<0.4) this._place('sign', cx, cz+BLOCK/2-1);
    }

    _scatterObjects() {
      // loose props & pedestrians scattered on roads & sidewalks
      const step = BLOCK + ROAD;
      const list = ['bottle','garbage','newspaper','smallplant','chair','table',
        'bicycle','trashcan','sign','bench','car','car','car','vending','pedestrian','pedestrian'];
      for (let i=0;i<260;i++) {
        const t = Utils.pick(list);
        let x,z, tries=0;
        do {
          x = Utils.rand(-this.bounds, this.bounds);
          z = Utils.rand(-this.bounds, this.bounds);
          tries++;
        } while (tries<8 && Math.hypot(x,z) < 6);
        // avoid placing large objects right where a building probably is — keep scatter but add sky ones later
        this._place(t, x, z);
      }
      // a few skyscrapers near edges
      for (let i=0;i<8;i++) {
        const a = Math.random()*Utils.TAU;
        const r = Utils.rand(this.bounds*0.6, this.bounds*0.95);
        this._place('skyscraper', Math.cos(a)*r, Math.sin(a)*r);
      }
      // a few dog poop hazards scattered around (small amount)
      for (let i=0;i<12;i++) {
        const x = Utils.rand(-this.bounds, this.bounds);
        const z = Utils.rand(-this.bounds, this.bounds);
        if (Math.hypot(x,z) < 10) continue; // keep clear of spawn
        this._place('poop', x, z);
      }
    }

    _place(type, x, z) {
      const o = Objects.create(type, x, z);
      this.addObj(o);
      return o;
    }

    // add an object to the scene & apply shadows to larger meshes
    addObj(o) {
      this.objRoot.add(o.mesh);
      this.objects.push(o);
      if (o.tier >= 3) {
        o.mesh.traverse(c => {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });
      }
    }

    // Spatial query: return objects within range of (x,z).
    queryNear(x, z, range) {
      const r2 = range*range;
      const out = [];
      for (const o of this.objects) {
        if (!o.alive) continue;
        const dx = o.mesh.position.x - x, dz = o.mesh.position.z - z;
        if (dx*dx+dz*dz <= r2) out.push(o);
      }
      return out;
    }

    // respawn an eaten object somewhere (pick tier set based on player radius passed in)
    respawn(o, playerRadius=3) {
      const types = Objects.tierSetFor(playerRadius);
      const t = Utils.pick(types);
      const def = Objects.DEFS[t];
      o.type = t; o.def = def; o.size = def.size * Utils.rand(0.9,1.1);
      o.score = def.score; o.mass = def.mass; o.tier = def.tier; o.name = def.name;
      o.movingPed = (t === 'pedestrian');
      o.pedDir = Math.random()*Utils.TAU; o.pedTimer = Utils.rand(0,3);
      // dispose existing mesh & rebuild
      this.objRoot.remove(o.mesh);
      const newMesh = def.build();
      newMesh.position.set(o.homeX, 0, o.homeZ);
      newMesh.rotation.y = Math.random()*Utils.TAU;
      o.mesh = newMesh;
      o.alive = true; o.vx=0; o.vz=0; o.shake=0;
      this.objRoot.add(newMesh);
      if (o.tier >= 3) newMesh.traverse(c=>{ if(c.isMesh){c.castShadow=true;c.receiveShadow=true;} });
    }

    disposeObject(o) {
      this.objRoot.remove(o.mesh);
      // (geometry shared caches; just drop reference)
      o.alive = false;
    }

    update(dt) {
      // pedestrian wandering animation handled by main game physics; here just idle
    }
  }
  return { World };
})();