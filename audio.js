// audio.js — procedural WebAudio sound, no external files
const Audio = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let enabled = false;
  let musicTimer = 0;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
      enabled = true;
    } catch(e) { enabled = false; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, dur, type='sine', vol=0.5, dest=sfxGain, glide=null) {
    if (!enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol=0.5, filterFreq=800) {
    if (!enabled) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate*dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=filterFreq;
    const g = ctx.createGain(); g.gain.value=vol;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  // ---- SFX ----
  function suck() { tone(420, 0.18, 'sawtooth', 0.18, sfxGain, 140); }
  function eat(tier) {
    const base = 300 + tier*70;
    tone(base, 0.12, 'triangle', 0.35, sfxGain, base*1.8);
    setTimeout(()=>tone(base*1.5,0.1,'sine',0.2,sfxGain),60);
  }
  function growth() {
    tone(180,0.5,'sine',0.3,sfxGain,520);
    setTimeout(()=>tone(360,0.4,'sine',0.25,sfxGain,720),120);
  }
  function bigEat() {
    noise(0.35,0.4,1400);
    tone(120,0.4,'sawtooth',0.4,sfxGain,380);
    setTimeout(()=>tone(600,0.25,'square',0.2),180);
  }
  function victory() {
    [0,1,2,3].forEach(i=>setTimeout(()=>tone(440*(1+i*0.25),0.4,'triangle',0.3),i*120));
  }
  function defeat() {
    tone(330,0.6,'sawtooth',0.35,sfxGain,110);
    setTimeout(()=>tone(220,0.7,'sawtooth',0.35,sfxGain,70),200);
  }

  // ---- Ambient music: slow evolving pad ----
  let musicIdx = 0;
  const scale = [220,247,277,330,370,415,494]; // A minor-ish pentatonic
  function musicTick(dt) {
    if (!enabled) return;
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 1.1 + Math.random()*1.2;
    const n = scale[musicIdx % scale.length];
    musicIdx++;
    tone(n, 1.6, 'sine', 0.5, musicGain, n*1.01);
    if (Math.random()<0.4) tone(n*2, 1.8, 'triangle', 0.25, musicGain);
    if (Math.random()<0.25) tone(scale[(musicIdx+3)%scale.length]*0.5, 2.0, 'sine', 0.3, musicGain);
  }

  return { init, resume, suck, eat, growth, bigEat, victory, defeat,
    musicTick, set enabled(v){enabled=v;}, get enabled(){return enabled;} };
})();