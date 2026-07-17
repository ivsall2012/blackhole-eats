// objects.js — definition & factory for all city objects
// Object tiers with size/mass/score and low-poly meshes.

const Objects = (() => {
  const geoCache = {};
  function boxGeo(w,h,d){ const k=`b${w}_${h}_${d}`; if(!geoCache[k]) geoCache[k]=new THREE.BoxGeometry(w,h,d); return geoCache[k]; }
  function cylGeo(rt,rb,h,seg){ const k=`c${rt}_${rb}_${h}_${seg}`; if(!geoCache[k]) geoCache[k]=new THREE.CylinderGeometry(rt,rb,h,seg); return geoCache[k]; }
  function sphGeo(r,seg){ const k=`s${r}_${seg}`; if(!geoCache[k]) geoCache[k]=new THREE.SphereGeometry(r,seg,seg); return geoCache[k]; }

  // shared materials keyed by color
  const matCache = {};
  function mat(color, opts={}) {
    const colObj = (color && color.isColor) ? color : new THREE.Color(color);
    const k = '#' + colObj.getHexString() + JSON.stringify(opts);
    if (!matCache[k])
      matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color: colObj }, opts));
    return matCache[k];
  }

  // ---- Mesh builders (return THREE.Group/Mesh) ----
  // Each builder takes no args; uses materials internally.
  function m(type, color, opts={}) {
    const g = new THREE.Group();
    g.userData = { type, color };
    return g;
  }

  function buildBottle() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(cylGeo(0.08,0.08,0.22,8), mat('#5fd0e0',{transparent:true,opacity:.85}));
    body.position.y=0.12;
    const neck = new THREE.Mesh(cylGeo(0.04,0.05,0.06,8), mat('#5fd0e0',{transparent:true,opacity:.85}));
    neck.position.y=0.27;
    const cap = new THREE.Mesh(cylGeo(0.045,0.045,0.03,8), mat('#22a'));
    cap.position.y=0.31;
    g.add(body,neck,cap); return g;
  }
  function buildGarbage() {
    const g = new THREE.Group();
    const bag = new THREE.Mesh(boxGeo(0.18,0.14,0.18), mat('#4a3b2a'));
    bag.position.y=0.07; bag.rotation.y=Math.random()*1;
    bag.scale.y=0.7;
    g.add(bag); return g;
  }
  function buildFlower() {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(cylGeo(0.02,0.02,0.22,5), mat('#3a8a3a'));
    stem.position.y=0.11;
    const colors=['#ff5a8a','#ffd24a','#7a8aff','#ff8a4a','#e05aff'];
    const head=new THREE.Mesh(sphGeo(0.07,7), mat(Utils.pick(colors)));
    head.position.y=0.24;
    g.add(stem,head); return g;
  }
  function buildNewspaper() {
    const g=new THREE.Group();
    const p=new THREE.Mesh(boxGeo(0.22,0.02,0.3), mat('#e8e8d8'));
    p.position.y=0.01;
    g.add(p); return g;
  }
  function buildSmallPlant() {
    const g=new THREE.Group();
    const pot=new THREE.Mesh(cylGeo(0.1,0.08,0.1,6), mat('#b86a3a'));
    pot.position.y=0.05;
    for(let i=0;i<3;i++){
      const leaf=new THREE.Mesh(sphGeo(0.07,6), mat('#4caf50'));
      leaf.position.set(Math.cos(i)*0.07,0.16,Math.sin(i)*0.07);
      leaf.scale.y=0.7;
      g.add(leaf);
    }
    g.add(pot); return g;
  }

  function buildChair() {
    const g=new THREE.Group();
    const seat=new THREE.Mesh(boxGeo(0.4,0.05,0.4), mat('#c89060'));
    seat.position.y=0.4;
    const back=new THREE.Mesh(boxGeo(0.4,0.4,0.05), mat('#c89060'));
    back.position.set(0,0.6,-0.18);
    for(const x of [-0.17,0.17]) for(const z of [-0.17,0.17]) {
      const leg=new THREE.Mesh(boxGeo(0.04,0.4,0.04), mat('#8a5a3a'));
      leg.position.set(x,0.2,z); g.add(leg);
    }
    g.add(seat,back); return g;
  }
  function buildTable() {
    const g=new THREE.Group();
    const top=new THREE.Mesh(boxGeo(0.7,0.05,0.7), mat('#d0a070'));
    top.position.y=0.55;
    for(const x of [-0.3,0.3]) for(const z of [-0.3,0.3]) {
      const leg=new THREE.Mesh(boxGeo(0.06,0.55,0.06), mat('#8a5a3a'));
      leg.position.set(x,0.27,z); g.add(leg);
    }
    g.add(top); return g;
  }
  function buildBicycle() {
    const g=new THREE.Group();
    for(const x of [-0.25,0.25]) {
      const wheel=new THREE.Mesh(cylGeo(0.18,0.18,0.03,12), mat('#222'));
      wheel.rotation.z=Math.PI/2; wheel.position.set(x,0.18,0);
      g.add(wheel);
    }
    const frame=new THREE.Mesh(boxGeo(0.5,0.04,0.04), mat('#ff4040'));
    frame.position.set(0,0.35,0);
    const seat=new THREE.Mesh(boxGeo(0.12,0.06,0.12), mat('#222'));
    seat.position.set(-0.1,0.46,0);
    const bar=new THREE.Mesh(boxGeo(0.04,0.2,0.04), mat('#ff4040'));
    bar.position.set(0.25,0.45,0);
    g.add(frame,seat,bar); return g;
  }
  function buildTrashCan() {
    const g=new THREE.Group();
    const can=new THREE.Mesh(cylGeo(0.18,0.16,0.5,10), mat('#5a6a5a'));
    can.position.y=0.25;
    const lid=new THREE.Mesh(cylGeo(0.2,0.2,0.06,10), mat('#3a4a3a'));
    lid.position.y=0.53;
    g.add(can,lid); return g;
  }
  function buildSign() {
    const g=new THREE.Group();
    const pole=new THREE.Mesh(cylGeo(0.04,0.04,1.4,6), mat('#888'));
    pole.position.y=0.7;
    const plate=new THREE.Mesh(boxGeo(0.5,0.3,0.04), mat('#4a8aff'));
    plate.position.y=1.3;
    g.add(pole,plate); return g;
  }

  function buildCar() {
    const g=new THREE.Group();
    const colors=['#ff4040','#4070ff','#ffce40','#40c060','#e0e0e8','#888','#b040a0'];
    const col=Utils.pick(colors);
    const body=new THREE.Mesh(boxGeo(1.0,0.3,0.5), mat(col));
    body.position.y=0.25;
    const cabin=new THREE.Mesh(boxGeo(0.5,0.22,0.45), mat('#a8c8e8'));
    cabin.position.set(0,0.5,-0.05);
    for(const x of [-0.32,0.32]) for(const z of [-0.22,0.22]) {
      const w=new THREE.Mesh(cylGeo(0.1,0.1,0.12,10), mat('#1a1a1a'));
      w.rotation.x=Math.PI/2; w.position.set(x,0.1,z); g.add(w);
    }
    g.add(body,cabin); return g;
  }
  function buildTree() {
    const g=new THREE.Group();
    const trunk=new THREE.Mesh(cylGeo(0.1,0.14,0.6,7), mat('#7a4a2a'));
    trunk.position.y=0.3;
    const leafCols=['#3aa54a','#2f8f3a','#56c060'];
    for(let i=0;i<3;i++){
      const r=Utils.rand(0.35,0.5);
      const ball=new THREE.Mesh(sphGeo(r,7), mat(Utils.pick(leafCols)));
      ball.position.set(Utils.rand(-0.15,0.15),0.6+i*0.3,Utils.rand(-0.15,0.15));
      g.add(ball);
    }
    g.add(trunk); return g;
  }
  function buildVending() {
    const g=new THREE.Group();
    const cab=new THREE.Mesh(boxGeo(0.5,1.2,0.4), mat('#d83a4a'));
    cab.position.y=0.6;
    const glass=new THREE.Mesh(boxGeo(0.4,0.6,0.05), mat('#a8d8ff',{transparent:true,opacity:.5}));
    glass.position.set(0,0.7,0.2);
    g.add(cab,glass); return g;
  }

  function buildHouse() {
    const g=new THREE.Group();
    const cols=['#ffd9a0','#ffb0a0','#a0d0ff','#c0ffc0','#e0c0ff','#ffe080'];
    const col=Utils.pick(cols);
    const body=new THREE.Mesh(boxGeo(2.2,1.4,1.8), mat(col));
    body.position.y=0.7;
    const roof=new THREE.Mesh(boxGeo(2.6,0.6,2.2), mat('#8a3a2a'));
    roof.position.y=1.7;
    const door=new THREE.Mesh(boxGeo(0.4,0.9,0.06), mat('#5a3a2a'));
    door.position.set(0,0.45,0.9);
    g.add(body,roof,door); return g;
  }
  function buildShop() {
    const g=new THREE.Group();
    const col=Utils.pick(['#b0d0ff','#ffb0d0','#d0ffb0']);
    const body=new THREE.Mesh(boxGeo(3,2,2.5), mat(col));
    body.position.y=1;
    const sign=new THREE.Mesh(boxGeo(3,0.5,0.1), mat('#ff5050'));
    sign.position.set(0,2.2,1.25);
    const win=new THREE.Mesh(boxGeo(2.6,1,0.1), mat('#a8d8ff',{transparent:true,opacity:.6}));
    win.position.set(0,0.8,1.27);
    g.add(body,sign,win); return g;
  }
  function buildRestaurant() {
    const g=new THREE.Group();
    const body=new THREE.Mesh(boxGeo(3.5,2.2,2.8), mat('#ffe0a0'));
    body.position.y=1.1;
    const roof=new THREE.Mesh(boxGeo(4,0.4,3.2), mat('#c04030'));
    roof.position.y=2.4;
    const sign=new THREE.Mesh(boxGeo(2,0.4,0.1), mat('#ffce40'));
    sign.position.set(0,2.4,1.45);
    g.add(body,roof,sign); return g;
  }

  function buildSkyscraper() {
    const g=new THREE.Group();
    const cols=['#6080a0','#7090b0','#5a6a8a','#80a0c0','#9098b0'];
    const col=Utils.pick(cols);
    const h=Utils.rand(8,14);
    const w=Utils.rand(2.2,3.2), d=Utils.rand(2.2,3.2);
    const main=new THREE.Mesh(boxGeo(w,h,d), mat(col));
    main.position.y=h/2;
    // windows emissive-ish trim
    const trim=new THREE.Mesh(boxGeo(w*0.85,h*0.96,d*0.85), mat('#223344'));
    trim.position.y=h/2;
    const top=new THREE.Mesh(boxGeo(w*0.6,0.6,d*0.6), mat(Utils.shade(new THREE.Color(col),0.12)));
    top.position.y=h+0.3;
    g.add(main,trim,top); return g;
  }

  function buildStreetLamp() {
    const g=new THREE.Group();
    const pole=new THREE.Mesh(cylGeo(0.05,0.06,2.2,6), mat('#444'));
    pole.position.y=1.1;
    const arm=new THREE.Mesh(boxGeo(0.4,0.04,0.04), mat('#444'));
    arm.position.set(0.2,2.1,0);
    const bulb=new THREE.Mesh(sphGeo(0.07,6), mat('#ffe070'));
    bulb.position.set(0.4,2.05,0);
    g.add(pole,arm,bulb); return g;
  }
  function buildBench() {
    const g=new THREE.Group();
    for(let i=0;i<3;i++){
      const slat=new THREE.Mesh(boxGeo(0.9,0.04,0.1), mat('#9a6a3a'));
      slat.position.set(0,0.4+i*0.12,0); g.add(slat);
    }
    for(const x of [-0.4,0.4]) {
      const leg=new THREE.Mesh(boxGeo(0.05,0.4,0.3), mat('#444'));
      leg.position.set(x,0.2,0); g.add(leg);
    }
    return g;
  }
  function buildPed() {
    const g=new THREE.Group();
    const cols=['#ff5a5a','#5aff8a','#5aaaff','#ffd24a','#c08aff','#fff','#ffa040'];
    const col=Utils.pick(cols);
    const body=new THREE.Mesh(boxGeo(0.18,0.4,0.12), mat(col));
    body.position.y=0.2;
    const head=new THREE.Mesh(sphGeo(0.09,7), mat('#ffccaa'));
    head.position.y=0.5;
    g.add(body,head); return g;
  }
  function buildPoop() {
    const g=new THREE.Group();
    const brown=mat('#6b4423');
    // three stacked squashed spheres — soft-ice-cream swirl silhouette
    for (let i=0;i<3;i++) {
      const r=0.13 - i*0.03;
      const blob=new THREE.Mesh(sphGeo(r,8), brown);
      blob.position.y=0.06 + i*0.09;
      blob.scale.y=0.8;
      g.add(blob);
    }
    // tiny tip
    const tip=new THREE.Mesh(sphGeo(0.04,6), brown);
    tip.position.y=0.32; g.add(tip);
    return g;
  }

  // ---- Definitions ----
  // tier, builder, size(ref), score, mass, name
  const DEFS = {
    bottle:      { tier:1, build:buildBottle,      size:0.2,  score:5,   mass:0.2,  name:'Bottle' },
    garbage:     { tier:1, build:buildGarbage,     size:0.25, score:5,   mass:0.3,  name:'Garbage' },
    flower:      { tier:1, build:buildFlower,      size:0.3,  score:8,   mass:0.2,  name:'Flower' },
    newspaper:   { tier:1, build:buildNewspaper,   size:0.25, score:6,   mass:0.2,  name:'Newspaper' },
    smallplant:  { tier:1, build:buildSmallPlant,  size:0.25, score:8,   mass:0.3,  name:'Plant' },

    chair:       { tier:2, build:buildChair,       size:0.5,  score:18,  mass:1,    name:'Chair' },
    table:       { tier:2, build:buildTable,       size:0.6,  score:20,  mass:1.5,  name:'Table' },
    bicycle:     { tier:2, build:buildBicycle,      size:0.7,  score:25,  mass:2,    name:'Bicycle' },
    trashcan:    { tier:2, build:buildTrashCan,     size:0.6,  score:22,  mass:1.2,  name:'Trash Can' },
    sign:        { tier:2, build:buildSign,        size:0.7,  score:20,  mass:1.5,  name:'Sign' },
    bench:       { tier:2, build:buildBench,       size:0.7,  score:25,  mass:2,    name:'Bench' },
    lamp:        { tier:2, build:buildStreetLamp,  size:0.7,  score:22,  mass:1.5,  name:'Lamp' },

    car:         { tier:3, build:buildCar,         size:1.2,  score:60,  mass:8,    name:'Car' },
    tree:        { tier:3, build:buildTree,        size:1.4,  score:80,  mass:6,    name:'Tree' },
    vending:     { tier:3, build:buildVending,     size:1.3,  score:70,  mass:5,    name:'Vending' },

    house:       { tier:4, build:buildHouse,       size:5,    score:350, mass:60,   name:'House' },
    shop:        { tier:4, build:buildShop,         size:6,    score:450, mass:80,   name:'Shop' },
    restaurant:  { tier:4, build:buildRestaurant,   size:7,    score:520, mass:100,  name:'Restaurant' },

    skyscraper:  { tier:5, build:buildSkyscraper,   size:10,   score:2500, mass:500, name:'Skyscraper' },

    pedestrian:  { tier:2, build:buildPed,         size:0.5,  score:40,  mass:1,    name:'Pedestrian' },

    // HAZARD: eating poop halves the black hole's size. Size is set tiny so
    // any hole can eat it, but watch out — it hurts more than it helps.
    poop:        { tier:1, build:buildPoop,       size:0.15, score:0,   mass:0.1,  name:'Dog Poop', hazard:true },
  };

  function create(typeKey, x, z) {
    const def = DEFS[typeKey];
    const mesh = def.build();
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.random()*Utils.TAU;
    // small random scale jitter for variety (doesn't affect eat size)
    return {
      type: typeKey,
      def,
      mesh,
      size: def.size * Utils.rand(0.9, 1.1),
      score: def.score,
      mass: def.mass,
      tier: def.tier,
      name: def.name,
      alive: true,
      // physics state for attraction
      vx: 0, vz: 0,
      shake: 0,
      homeX: x, homeZ: z,
      movingPed: typeKey==='pedestrian',
      pedDir: Math.random()*Utils.TAU,
      pedTimer: Utils.rand(0,3),
    };
  }

  // which keys usable at a given black-hole radius
  function tierSetFor(radius) {
    if (radius >= 6) return ['skyscraper','house','shop','restaurant','car','tree','vending','trashcan','chair','table','bicycle','sign','bench','lamp','pedestrian','bottle','garbage','flower','newspaper','smallplant'];
    if (radius >= 1.5) return ['house','shop','restaurant','car','tree','vending','trashcan','chair','table','bicycle','sign','bench','lamp','pedestrian','bottle','garbage','flower','newspaper','smallplant'];
    if (radius >= 0.9) return ['car','tree','vending','trashcan','chair','table','bicycle','sign','bench','lamp','pedestrian','bottle','garbage','flower','newspaper','smallplant'];
    if (radius >= 0.55) return ['trashcan','chair','table','bicycle','sign','bench','lamp','pedestrian','bottle','garbage','flower','newspaper','smallplant'];
    return ['bottle','garbage','flower','newspaper','smallplant'];
  }

  return { DEFS, create, tierSetFor };
})();