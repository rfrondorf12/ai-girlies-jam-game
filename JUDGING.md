# What gets judged (draft checklist)

**Be aware:** the real rubric has not been written yet. This page is our best guess at what an AI judge, or a script, can check automatically. Treat it as a checklist, not a promise.

These are **technical quality** checks, not design direction or extra features to add. Your idea stays yours, and nothing here asks you to go past your starter card.

| Check | What it means | How you show it | What to tell Claude |
|---|---|---|---|
| **Loads with no errors** | The page opens and the console shows no red errors or warnings. | Open DevTools, then Console. Screenshot it clean. | "Run the game in a headless browser and fix every console error and warning." |
| **World collision** | Solid things in the world stop you or hurt you. You land on the ground, not through it. | Add a `?debug` mode that draws every collider box. Write a short test: tall obstacle blocks you, low one can be jumped, you land on the ground. | "Add one small AABB collision section with named colliders. Tall obstacles block the lane, low ones can be jumped, crate tops can be stood on. Add `?debug` to draw the boxes and a Playwright test that proves it." |
| **FPS / performance** | Runs smoothly. Target 60 FPS on a laptop and 30 FPS on a phone. | An on-screen counter (`?fps` or the F key) showing current, average and minimum FPS, draw calls and triangles. | "Add an FPS panel using renderer.info. Share materials and geometry, instance repeated props, pool spawns, cap particles. If the average is under 30 FPS for 3 seconds, lower the pixel ratio and turn off bloom and shadows automatically." |
| **Texturization** | Big surfaces have texture maps, not just flat colour. | List your textures (for example `window.__textures` or a credits file). Show a closeup screenshot. | "Give every large surface a small canvas-generated texture (noise, grime, weave, stripes, planks). Keep the toon look and keep total assets under 3 MB." |
| **Playable loop** | Start, play, lose, restart, all without reloading the page. | A title screen, a game-over screen with your score, and a key to play again. | "Make sure I can restart from game over with Space or a tap, and that the state fully resets." |
| **Mobile controls** | Your card's one action works with touch. | Tap (or swipe, for lane changes) does the action. Test it in DevTools device mode. | "Make my one action work with touch and test it at a 390x844 viewport." |
| **Progression** | The game gets harder over time, using the knob your card already has (speed, spawn rate, wave count, timing window). | A HUD with score, and difficulty you can see rising. | "Make the difficulty rise over time with the tuning knob my card already has." |
| **Readable code** | Small files, clear sections, and comments where something is tricky. | Section headers such as COLLISION, PERFORMANCE, TEXTURES. | "Group the code into named sections with a one-line comment each." |

## Show your proof in one minute
1. Open `/?fps` and play for 20 seconds. Screenshot the FPS panel.
2. Open `/?debug`. Screenshot the collider boxes around an obstacle.
3. Show a closeup of a character or prop where the texture is visible.
4. Run your test script and paste the PASS lines into your README.

## Keep an AI use log
Fill in [`devlog/AI-USE-LOG.md`](devlog/AI-USE-LOG.md) while you build: every prompt that mattered, what Claude changed, and what you checked yourself. Judges (people or AI) may ask how you used AI. That log is the canonical record.

## Honest limits
- FPS depends on the machine. Say which machine you measured on.
- A judge cannot feel how the game plays. Make the proof visible: overlays, tests and screenshots.

See the [Zombie Runner showcase](demos/zombie-runner-showcase/) for one way to hit these checks (not the only way).
