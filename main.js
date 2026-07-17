// main.js — orchestrates everything: scene, loop, state, UI
let Main = (() => {
  const TAU = Utils.TAU;
  let scene, camera, renderer, world, player, ais = [];
  let clock;
  let state = 'menu'; // menu | playing | end
  let timeLeft = 180;
  let lastTime = 0;
  let sun;

  const ui = {
    sizeVal: document.getElementById('size-val'),
    timer: document.getElementById('timer'),
    leaderboard: document.getElementById('leaderboard'),
    floats: document.getElementById('floats'),
    indicators: document.getElementById('indicators'),
    minimap: document.getElementById('minimap-canvas'),
    menu: document.getElementById('menu'),
    endscreen: document.getElementById('endscreen'),
    hint: document.getElementById('hint'),
    btnPlay: document.getElementById('btn-play'),
    btnAgain: document.getElementById('btn-again'),
    btnMenu: document.getElementById('btn-menu'),
    endTitle: document.getElementById('end-title'),
    endSize: document.getElementById('end-size'),
    endScore: document.getElementById('end-score'),
    endEaten: document.getElementById('end-eaten'),
    endRank: document.getElementById('end-rank'),
  };

  function init() {
    Audio.init();
    setupScene();
    wireUI();
    clock = new THREE.Clock();
    requestAnimationFrame(loop);
  }

  function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd6ff);
    scene.fog = new THREE.Fog(0x9fd6ff, 80, 220);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,18,20);
    camera.lookAt(0,0,0);

    const canvas = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Lighting — daytime
    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(amb);
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6a8a4a, 0.55);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff4d8, 1.2);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 90;
    sun.shadow.camera.left=-s; sun.shadow.camera.right=s;
    sun.shadow.camera.top=s; sun.shadow.camera.bottom=-s;
    sun.shadow.camera.near=1; sun.shadow.camera.far=200;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(sun.target);

    FX.init(scene, camera, canvas, ui.floats, window.innerWidth, window.innerHeight);

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    FX.setSize(window.innerWidth, window.innerHeight);
  }

  function wireUI() {
    ui.btnPlay.addEventListener('click', ()=>{ Audio.resume(); startGame(); });
    ui.btnAgain.addEventListener('click', ()=>{ startGame(); });
    ui.btnMenu.addEventListener('click', ()=>{ toMenu(); });
  }

  function startGame() {
    // tear down previous
    if (world) { world.objects.forEach(o=>world.disposeObject(o)); }
    if (player) player.dispose();
    ais.forEach(a=>a.dispose()); ais = [];

    world = new World.World(scene, 90);
    player = new Player.Player(scene, camera, { radius:0.6, x:0, z:0 });
    ais = AI.spawnAll(scene, 5, world, player);

    timeLeft = 180;
    state = 'playing';
    ui.menu.classList.add('hidden');
    ui.endscreen.classList.add('hidden');
    ui.hint.style.display='block';
    if (ui.minimap && ui.minimap.parentElement) ui.minimap.parentElement.classList.remove('hidden');
    updateHUD();
  }

  function toMenu() {
    state = 'menu';
    ui.endscreen.classList.add('hidden');
    ui.menu.classList.remove('hidden');
    ui.hint.style.display='none';
    if (ui.minimap && ui.minimap.parentElement) ui.minimap.parentElement.classList.add('hidden');
  }

  function endGame(reason) {
    state = 'end';
    ui.hint.style.display='none';
    if (ui.minimap && ui.minimap.parentElement) ui.minimap.parentElement.classList.add('hidden');
    // ranking
    const all = [player, ...ais].filter(b=>b.alive || b.isPlayer);
    all.sort((a,b)=>b.radius - a.radius);
    const rank = all.indexOf(player) + 1;
    ui.endTitle.textContent = reason==='eaten' ? 'DEVOURED' : "TIME'S UP";
    ui.endSize.textContent = player.radius.toFixed(1);
    ui.endScore.textContent = Math.floor(player.score);
    ui.endEaten.textContent = player.eaten;
    ui.endRank.textContent = '#'+rank;
    if (rank===1) Audio.victory(); else Audio.defeat();
    ui.endscreen.classList.remove('hidden');
  }

  // World reference for HUD
  function playerRadiusRef() { return player ? player.radius : 3; }

  // ---------------- Game Loop ----------------
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (state==='playing') step(dt);
    FX.update(dt);
    // camera shake offset
    const sh = FX.consumeShakeOffset();
    if (state==='playing') {
      camera.position.x += sh.x;
      camera.position.y += sh.y;
    }
    Audio.musicTick(dt);
    renderer.render(scene, camera);
  }

  function step(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft=0; endGame('time'); return; }

    player.update(dt, world);
    sun.target.position.copy(player.pos);
    sun.position.set(player.pos.x+40, 80, player.pos.z+30);

    for (const a of ais) if (a.alive) a.update(dt, world, [player, ...ais]);

    runGravityAndEating(dt);

    // enemy off-screen / far indicators
    updateIndicators(dt);

    // AI vs AI eating (simplified)
    checkBlackholeCombat(dt);
    checkPlayerEaten();

    updateHUD();
  }

  function runGravityAndEating(dt) {
    const allBH = [player, ...ais].filter(b=>b.alive);
    const consumed = [];
    for (const bh of allBH) {
      const gr = bh.gravityRadius();
      const gs = bh.gravityStrength();
      const near = world.queryNear(bh.pos.x, bh.pos.z, gr);
      for (const o of near) {
        if (!o.alive) continue;
        const op = o.mesh.position;
        const dx = bh.pos.x - op.x, dz = bh.pos.z - op.z;
        const d = Math.sqrt(dx*dx+dz*dz);
        if (d > gr) continue;
        if (!bh.canEat(o.size)) {
          // too big to eat — slight shake only, no attraction (it "resists")
          o.shake = Math.max(o.shake, 0.3);
          continue;
        }
        const dirx = dx / Math.max(d, 0.001);
        const dirz = dz / Math.max(d, 0.001);
        // Strong pull only in the inner zone (≈1.8×radius); beyond it, the
        // object just trembles a bit so the player must actively close in
        // instead of letting a giant hole auto-vacuum the whole block.
        const innerZone = bh.radius * 1.8 + 1.0;
        if (d > innerZone) {
          o.shake = Math.min(1, o.shake + dt*1.5);
        } else {
          // inverse-square falloff: gentle far-field, fierce near-field
          const force = gs / (d*d + 0.5);
          o.shake = Math.min(1, o.shake + dt*4);
          o.vx += dirx * force * dt / Math.max(o.mass,1);
          o.vz += dirz * force * dt / Math.max(o.mass,1);
        }
        // move & rotate
        op.x += o.vx * dt; op.z += o.vz * dt;
        o.vx *= 0.96; o.vz *= 0.96;
        // visual wobble (tilt toward hole)
        const tilt = Utils.clamp(o.shake*0.2, 0, 0.25);
        o.mesh.rotation.z = -dirx * tilt;
        o.mesh.rotation.x =  dirz * tilt;
        o.mesh.rotation.y += (1 + o.shake*4) * dt;

        // eating: when center reaches near hole radius
        const eatDist = bh.radius * 0.85;
        if (d < eatDist && bh.canEat(o.size)) {
          consumed.push({ bh, o });
        }
      }
    }
    // pedestrians wandering (if not being dragged fast)
    for (const o of world.objects) {
      if (!o.alive || !o.movingPed) continue;
      if (Math.hypot(o.vx,o.vz) > 0.3) continue;
      o.pedTimer -= dt;
      if (o.pedTimer <= 0) { o.pedTimer = Utils.rand(1,3); o.pedDir += Utils.rand(-1,1); }
      const sp = 0.6;
      op2(o, dt, sp);
    }
    // apply consumptions
    for (const c of consumed) consume(c.bh, c.o);
  }

  function op2(o, dt, sp) {
    o.mesh.position.x += Math.cos(o.pedDir)*sp*dt;
    o.mesh.position.z += Math.sin(o.pedDir)*sp*dt;
    o.mesh.rotation.y = -o.pedDir + Math.PI/2;
  }

  function consume(bh, o) {
    if (!o.alive) return;
    o.alive = false;
    bh.eaten++;
    bh.score += o.score;
    const pos = o.mesh.position.clone(); pos.y = o.size * 0.3;

    if (o.def && o.def.hazard) {
      // ---- Dog poop: halve the black hole's size ----
      const newRadius = Math.max(bh.radius * 0.5, 0.4);
      const shrink = newRadius - bh.radius; // negative
      bh.setRadius(newRadius);
      FX.burst(pos, 0x8a5a2a, 26, 5, 0.15, 0.5);
      FX.shockwave(pos, 0x8a5a2a);
      if (bh.isPlayer) {
        FX.shake(1.2);
        Audio.defeat();
        FX.floatText('-50% '+o.name+'!', pos.clone().setY(1.0), '#ff6a6a');
      } else {
        Audio.suck();
      }
      world.disposeObject(o);
      // hazards do NOT respawn (keeps the map clean)
      return;
    }

    // growth proportional to size gained
    const growth = growthFor(o, bh);
    bh.grow(growth);
    FX.burst(pos, 0xffcc66, Utils.clamp(8 + o.tier*6, 8, 40), 2 + o.tier*1.2, 0.15, 0.5 + o.tier*0.1);
    FX.shockwave(pos, bh.isPlayer ? 0x7a5dff : bh.color);
    if (bh.isPlayer) {
      FX.floatText('+'+o.score+' '+o.name, pos.clone().setY(o.size*0.6+0.6), '#fff');
      FX.shake(Utils.clamp(0.15 + o.tier*0.18, 0.15, 1.2));
      if (o.tier <= 2) Audio.eat(o.tier);
      else Audio.bigEat();
      if (o.tier >= 3) Audio.growth();
    } else {
      Audio.suck();
    }
    // remove the eaten object — eaten items do NOT respawn, so the city
  // gradually empties as black holes consume everything.
    world.disposeObject(o);
  }

  function growthFor(o, bh) {
    // bigger objects feed more; diminishing returns + per-eat cap to prevent runaway.
    // AI grows a bit slower than the player overall, but still fast enough to
    // be a real threat — buffed back up so rivals are aggressive.
    const aiFactor = bh.isPlayer ? 1.0 : 0.8;
    const cap = bh.isPlayer ? 0.9 : 0.75;
    let g = Math.min(o.size * 0.30 * aiFactor / (1 + bh.radius * 0.11), cap);
    // Indigestion: when the black hole is big enough to dwarf an object (object
    // is <3% of its radius), the meal is too small to register — scaled way down.
    // Stops a late-game colossus auto-feeding off bottles/trash forever.
    if (o.size < bh.radius * 0.03) g *= 0.25;
    return g;
  }

  function checkBlackholeCombat(dt) {
    const all = [player, ...ais];
    for (let i=0;i<all.length;i++) {
      for (let j=0;j<all.length;j++) {
        if (i===j) continue;
        const a = all[i], b = all[j];
        if (!a.alive || !b.alive) continue;
        if (a.radius <= b.radius) continue; // a must be bigger to eat b
        const d = Utils.dist(a.pos.x, a.pos.z, b.pos.x, b.pos.z);
        if (d < a.radius * 0.95 && a.radius > b.radius * 1.3) {
          eatBlackhole(a, b);
          break;
        }
      }
    }
  }

  function eatBlackhole(a, b) {
    if (!b.alive) return;
    b.alive = false;
    a.score += Math.floor(b.radius * 100 + 500);
    a.eaten += 1;
    // AI-vs-AI growth: buffed so eating a rival is a real power spike for the AI too
    const growth = b.radius * (a.isPlayer ? 0.22 : 0.18) / (1 + a.radius * 0.25);
    a.grow(growth);
    const pos = b.pos.clone();
    FX.burst(pos, b.color, 36, 6, 0.2, 0.7);
    FX.shockwave(pos, a.isPlayer ? 0x7a5dff : a.color);
    if (a.isPlayer) { FX.shake(1.6); Audio.bigEat(); Audio.growth();
      FX.floatText('+'+Math.floor(b.radius*100+500)+' '+b.name, pos.clone().setY(2), '#ffd66e'); }
    else Audio.suck();
    b.dispose();
    if (!b.isPlayer) {
      // respawn AI later for continuous challenge
      setTimeout(()=>{ if (state==='playing') respawnAI(b); }, 6000);
    } else {
      endGame('eaten');
    }
  }

  function respawnAI(oldAI) {
    // create a fresh AI to keep 5 opponents
    const fresh = AI.spawnAll(scene, 1, world, player)[0];
    ais.push(fresh);
  }

  function checkPlayerEaten() { /* handled in eatBlackhole */ }

  // ---------------- HUD ----------------
  function updateHUD() {
    ui.sizeVal.textContent = player.radius.toFixed(1);
    const m = Math.floor(timeLeft/60), s = Math.floor(timeLeft%60);
    const text = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    ui.timer.textContent = text;
    ui.timer.classList.toggle('warn', timeLeft < 20);

    // leaderboard: top 6
    const all = [player, ...ais].filter(b=>b.alive || b===player);
    all.sort((a,b)=>b.radius - a.radius);
    const top = all.slice(0, 6);
    ui.leaderboard.innerHTML = top.map((b, i)=>{
      const me = b===player ? ' me' : '';
      const name = b.isPlayer ? 'You' : b.name;
      return `<li class="${me}"><span class="name">${i+1}. ${name}</span><span class="sz">${b.radius.toFixed(1)}</span></li>`;
    }).join('');

    updateMinimap();
  }

  // ---------- Minimap (player-centered, shows all black holes) ----------
  function updateMinimap() {
    const cv = ui.minimap; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0,0,W,H);

    // background
    ctx.fillStyle = '#10162a'; ctx.fillRect(0,0,W,H);

    const halfView = 36; // world units from center to edge of minimap
    const scale = (W/2) / halfView;
    const px = player.pos.x, pz = player.pos.z;
    const worldBounds = world ? world.bounds : 90;

    function toMap(wx, wz) {
      // world (x,z) relative to player -> minimap coords.
      // Map north (-Z, "up") to screen up, east (+X) to screen right.
      return { x: W/2 + (wx-px)*scale, y: H/2 + (wz-pz)*scale };
    }

    // world bounds rectangle (clipped)
    ctx.save();
    ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip();
    ctx.strokeStyle = '#3a4a6a'; ctx.lineWidth = 1;
    const tl = toMap(-worldBounds, -worldBounds);
    const br = toMap( worldBounds,  worldBounds);
    ctx.strokeRect(tl.x, tl.y, br.x-tl.x, br.y-tl.y);
    ctx.fillStyle = '#1a2238'; ctx.fillRect(tl.x, tl.y, br.x-tl.x, br.y-tl.y);
    ctx.restore();

    // frame
    ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 2;
    ctx.strokeRect(1,1,W-2,H-2);

    // draw AIs first (so player stays on top)
    for (const a of ais) {
      if (!a.alive) continue;
      const p = toMap(a.pos.x, a.pos.z);
      if (p.x<2||p.x>W-2||p.y<2||p.y>H-2) {
        // clamp to edge with arrow tip pointing inward
        const dx = p.x-W/2, dy = p.y-H/2;
        const ang = Math.atan2(dy,dx);
        const r = Math.min(W/2-6, H/2-6);
        const ex = W/2 + Math.cos(ang)*r, ey = H/2+Math.sin(ang)*r;
        ctx.save(); ctx.translate(ex,ey); ctx.rotate(ang);
        ctx.fillStyle = '#' + new THREE.Color(a.color).getHexString();
        ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(-4,4); ctx.lineTo(-4,-4); ctx.closePath(); ctx.fill();
        ctx.restore();
        continue;
      }
      const r = Utils.clamp(a.radius*scale*0.5 + 2, 2, W/3);
      ctx.fillStyle = '#' + new THREE.Color(a.color).getHexString();
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Utils.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // player dot (white)
    const pp = toMap(px, pz);
    const pr = Utils.clamp(player.radius*scale*0.5 + 2.5, 2.5, W/3);
    ctx.fillStyle = '#7a5dff';
    ctx.beginPath(); ctx.arc(pp.x, pp.y, pr, 0, Utils.TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // facing/up indicator: small "N" tick at top to orient
    ctx.fillStyle = '#ffffff66';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign='center';
    ctx.fillText('N', W/2, 11);
  }

  // ---------- Enemy off-screen indicators ----------
  const indEls = []; // pooled DOM nodes
  function indEl(i) {
    while (indEls.length <= i) {
      const el = document.createElement('div');
      el.className = 'indicator';
      el.innerHTML = '<div class="ring"></div><div class="dot"></div>';
      el.style.display = 'none';
      ui.indicators.appendChild(el);
      indEls.push(el);
    }
    return indEls[i];
  }
  function updateIndicators(dt) {
    const W = window.innerWidth, H = window.innerHeight;
    const cx = W/2, cy = H/2, pad = 60;
    let idx = 0;
    for (const a of ais) {
      const el = indEl(idx); idx++;
      if (!a.alive) { el.style.display='none'; continue; }
      const d = Utils.dist(a.pos.x, a.pos.z, player.pos.x, player.pos.z);
      // hide if too far away to matter OR if on-screen
      const p = Utils.worldToScreen(new THREE.Vector3(a.pos.x, a.radius, a.pos.z), camera, W, H);
      const onScreen = p.z < 1 && p.x > 30 && p.x < W-30 && p.y > 30 && p.y < H-30;
      if (onScreen || d > 110) { el.style.display='none'; continue; }

      // threat class
      el.classList.remove('threat','prey','neutral');
      if (a.radius > player.radius * 1.2) el.classList.add('threat');
      else if (player.radius > a.radius * 1.35) el.classList.add('prey');
      else el.classList.add('neutral');

      // project direction from screen center toward AI, clamp to edges
      let sx = p.x, sy = p.y;
      if (p.z >= 1) { // behind camera: flip through center
        sx = cx + (cx - sx); sy = cy + (cy - sy);
      }
      let dx = sx - cx, dy = sy - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      // find scale to hit safe rect (cx-pad, cy-pad)
      const marginX = (W/2 - pad), marginY = (H/2 - pad);
      const scale = Math.min(marginX / Math.abs(dx), marginY / Math.abs(dy));
      const ex = cx + dx * scale, ey = cy + dy * scale;
      el.style.display = 'block';
      el.style.left = ex + 'px';
      el.style.top = ey + 'px';
      // angle the marker so it points toward the enemy
      const ang = Math.atan2(dy, dx);
      el.style.transform = `translate(-50%,-50%) rotate(${ang}rad)`;
      const dot = el.querySelector('.dot');
      dot.style.transform = 'translate(-50%,-50%)';
      dot.textContent = a.radius.toFixed(1);
    }
    for (; idx < indEls.length; idx++) indEls[idx].style.display = 'none';
  }

  // expose minimal API
  return { init, playerRadiusRef };
})();

window.addEventListener('load', ()=> Main.init());