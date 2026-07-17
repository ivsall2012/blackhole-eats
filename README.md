# Black Hole City

A polished casual 3D browser game where you control a black hole devouring a low-poly city. Eat small objects to grow, unlock bigger ones, hunt down rival AI black holes, and top the leaderboard before time runs out.

Built with **HTML5 + JavaScript + Three.js (WebGL)**. No backend, no bundler — just open `index.html`.

## Features

- **Procedural low-poly city** — roads, sidewalks, parks, buildings, skyscrapers, trees, cars, benches, lamps, pedestrians, and loose props scattered everywhere.
- **Physical black hole** — dark core, glowing rim, accretion disk, orbiting particles, additive glow halo, and gravity that bends/rotates nearby objects toward the singularity.
- **Growth system** — start at radius 0.5. Bottles & garbage → trees & cars → houses & shops → skyscrapers. Larger objects unlock as you grow.
- **Realistic attraction** — force scales with `gravityStrength / distance`; objects accelerate, wobble, and shrink into the hole.
- **5 AI black holes** with names, colors, and distinct behavior: wander, forage, flee bigger holes, chase smaller ones.
- **3-minute survival mode** with leaderboard, timer, size readout, floating score popups, camera shake, particle bursts, shockwaves.
- **Procedural audio** via WebAudio (ambient music + suck/eat/growth/victory/defeat SFX) — no sound files needed.
- **Optimized** — shared geometry/material caches, pooled FX particles, simple spatial queries. Targets 60 FPS with hundreds of objects.

## Controls

- **WASD** or **Arrow keys** — move
- Camera automatically follows and zooms out as you grow

## How to run

Just open `black-hole-city/index.html` in a modern desktop browser (Chrome, Edge, Firefox, Safari). An internet connection is required on first load to fetch the Three.js CDN script.

> Tip: For best results serve over a local server (`python3 -m http.server` in the `black-hole-city` folder, then open `http://localhost:8000`). Opening directly via `file://` works because Three.js r128 UMD build is loaded globally, but some browsers restrict module scripts on `file://` — this project avoids that by using the UMD build.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup, CDN loader, UI overlays |
| `style.css` | HUD, menus, floating text, animations |
| `utils.js` | Shared math/color helpers |
| `audio.js` | Procedural WebAudio music + SFX |
| `effects.js` | Particles, shockwaves, float text, camera shake |
| `objects.js` | Object definitions + low-poly mesh builders + tiers |
| `blackhole.js` | `BlackHole` base class (visuals, gravity params) |
| `player.js` | `Player` — input + camera follow + smoothing |
| `ai.js` | `AISlot` — foraging / fleeing / chasing AI |
| `world.js` | Procedural city generation + object store + spatial query |
| `main.js` | Scene, loop, gravity/eating, combat, HUD, state |

## Scoring

- Eating objects awards score (trash can +22, car +60, tree +80, house +350, skyscraper +2500…).
- Eating a rival black hole awards `radius × 100 + 500` — huge points.
- Final screen shows your final size, total score, objects eaten, and ranking.

Have fun devouring the city.