# What Claude built: zombie runner showcase

Open it with `python3 -m http.server 8000 --bind 127.0.0.1`, then go to `/` (or `/?lowfx` for weak machines).

## Techniques
- **Characters (Blender, headless Python):** five rigged low-poly characters with beveled smooth parts, faces, straps, torn hems and distinct silhouettes (the brute has shoulder spikes). They have Idle, Run, Walk, Jump, Attack and Lunge clips and are 72 to 90 KB each, about 400 KB in total. Smooth shading, no UVs and frame-step-2 animation keep the files small.
- **Scene (three.js only, no extra assets):** gradient sky dome shader, moon, an instanced skyline with lit windows, and canvas-generated road and sidewalk textures with cracks and patches. Also wrecked cars, striped barricades, cones, chain fences and debris, all recycled as the road scrolls. Lamps have halos, cones and light pools, plus fog and embers.
- **Post-processing:** bloom, then a custom grading pass (split-tone, saturation and contrast, chromatic split, vignette, grain, hit flash).
- **Game feel:**
  - Camera: a lerped chase camera with FOV kicks on speed and level-up, shake, and roll when changing lanes.
  - Player: squash and stretch on jump and landing.
  - Enemies: a red telegraph ring when an enemy is in your lane.
  - Effects: star-sprite hit bursts and a shockwave ring (no gore), plus WebAudio beeps.
  - Screens: an animated CSS title and game-over screen with a webfont HUD and the best score saved in localStorage.
- **`?lowfx`:** no composer and no shadows, pixel ratio 1, fewer embers, fences and debris.

## Effort (approximate)
- Character generator v2: about 1.5 h of agent time, including 3 to 4 render-and-look loops.
- Scene, FX and game-feel patches: about 1.5 h.
- Testing and screenshot iterations: about 45 min. There were 3 visual passes: the title framing, the barricade placement, and oversized particles washing out the closeup and game-over screens.

## Needed Blender
Only the characters. Everything in the scene is built in code with three.js.

## Can a student reproduce it in the jam (11:00–4:00, Claude Code, CDN three.js, no build step)?
- **Yes:**
  - every scene, FX and game-feel item (all in `main.js`, a single file)
  - the CSS title and game-over screens, and `?lowfx`
  - a few hours of prompting gets most of the way there
- **Hard or no:** the Blender character generator needs Blender installed plus a lot of render-check iteration. Students should use the provided GLBs (or the CC0 packs) instead.
- Without real visual checks (screenshots), the agent's output looks worse. Tell students to screenshot often.

## Showcase 2 additions (judging-oriented)
- **World collision:** see the `COLLISION` section in `main.js`. It uses named AABBs for the player, obstacles and enemies.
  - Tall trucks block the lane.
  - Barricades, crates and car roofs are jumpable.
  - Crate and car tops can be stood on, and you land on the ground.
  - Enemies climb over obstacles.
  - `?debug` draws the boxes.
  - The test is `pwtest/tcol.mjs` (7 checks).
- **Performance:**
  - `?fps` or the F key shows the FPS panel: current, average and minimum FPS, draw calls and triangles.
  - Adaptive quality goes HIGH, then MEDIUM, then LOW when the 3-second average stays under 30 FPS. `?noadapt` turns this off.
  - Lamps and debris are instanced. Prop parts are merged per material. Materials and geometry are shared, spawns are pooled, scenery past the fog is culled, and buildings do not cast shadows.
  - Draw calls went from 575 to about 220 at 1280x720 with full effects.
- **Textures:** 27 or more canvas textures, all generated in code.
  - Characters: skin with grime and veins, weave, stripes, denim, metal and hair. They get box-projected UVs at load, so the GLBs stay unchanged at about 80 KB each.
  - Props: rusted paint, cracked glass, tread, planks, crate, container and concrete.
  - Also the skyline and a cratered moon.
- **Documents:** `WHAT-GETS-JUDGED.md` (student guide) and `AI-USE-LOG.md` (a template for students).
