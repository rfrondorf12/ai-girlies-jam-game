# AI use log

Update this file **as you go**, each time you use AI during the jam. It is honest accounting for you, judges, and teachers: what you asked, what came back, and what you kept. Using AI is expected; hiding it is not the goal.

Log **every** AI touch: Claude Code in the build terminal, image or 3D generators, sound tools, or anything else. If something became part of your game, log it here **and** credit the file in `meta.json` (`ai_assets`, or `assets` with source and license).

The devlog agent (`claude --agent devlog`) can add rows when you report what you did. Say the tool, a short prompt or summary, and what you did with the result.

## Your log

Add one row per use (newest first). Leave blank cells as `—` if they do not apply.

| Time | Tool / model | What you asked (prompt or short summary) | What came back | Kept, changed, or rejected (why) | Game asset? |
|------|--------------|------------------------------------------|----------------|-----------------------------------|-------------|
| 14:05 | Claude Code (jam-companion), build terminal | HTML/CSS to load the Ka Blam font for the game text, to fix illegible text | Font applied; text comes out with a black fill and still can't be read | Kept for now (KR picked the font); still unresolved | No (font, not AI; add to `meta.json` with source and license) |
| 13:48 | Claude Code (jam-companion), build terminal | Space, Up, and W jump; add a double jump (a second jump on a quick second press) | Jump keys and double jump in the game | Kept; double jump works and the second jump is twice as high | No (code only) |
| 12:43 | Imra (Gemini 3.8 Flash) | Populate context files: CONCEPT, LOOK, MECHANIC, SCOPE, STARTERS | Detailed context kit files defining comic runner loop, 3 worlds, controls, audio plan, scope boundaries, and Card 2 selection | Kept; fully fleshed out context folder for Claude Code build terminal | No (documentation) |
| 12:30 | Imra (Gemini 3.8 Flash) | Ideation scoping: turn brainstorming notes into shippable jam mechanics, 3 world concepts, combat rules, and build plan | 8-panel comic action runner design, 3 contrasting worlds (Ink Drop, Worm, Crescent Moon), stomp/slash combat, and scoped BUILD-PLAN | Kept; finalized scope to protect 4:00 PM deadline and populated BUILD-PLAN.md | No (planning) |
| 11:39 | ChatGPT 6.1 sol light and 5.6 sol (image tool) | Make 20 mockups of the comic hero and the world (ideation chat) | 20 mockups, zipped as `outputs/comic-mockups.zip`. Strongest picks: 01 Red Wedge, 02 Ink Drop, 13 Ink Comet | Used as visual references only; the art in the game is drawn in code by Claude Code | No (reference only; not in the shipped game) |

## Worked example

You can delete this section once you understand the format. Do not copy these rows into your log.

| Time | Tool / model | What you asked (prompt or short summary) | What came back | Kept, changed, or rejected (why) | Game asset? |
|------|--------------|------------------------------------------|----------------|-----------------------------------|-------------|
| 1:05 | Image generator (ChatGPT) | Pixel sky background, purple sunset, 512 px wide | One PNG, too pink | Rejected; used a code gradient instead | No |
| 1:40 | Claude Code (Opus), build terminal | Make the cube jump on space with a little squash | Jump in `main.js` | Kept; tuned jump height after playtest | No (code only) |
| 3:10 | Meshy | Low poly tree, GLB | GLB, scale wrong | Kept after resize; checked license allows game use | Yes: `assets/tree.glb`. Meshy terms (note which tier you used) |
