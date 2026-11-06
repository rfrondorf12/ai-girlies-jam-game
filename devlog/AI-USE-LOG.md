# AI use log

Update this file **as you go**, each time you use AI during the jam. It is honest accounting for you, judges, and teachers: what you asked, what came back, and what you kept. Using AI is expected; hiding it is not the goal.

Log **every** AI touch: Claude Code in the build terminal, image or 3D generators, sound tools, or anything else. If something became part of your game, log it here **and** credit the file in `meta.json` (`ai_assets`, or `assets` with source and license).

The devlog agent (`claude --agent devlog`) can add rows when you report what you did. Say the tool, a short prompt or summary, and what you did with the result.

## Your log

Add one row per use (newest first). Leave blank cells as `—` if they do not apply.

| Time | Tool / model | What you asked (prompt or short summary) | What came back | Kept, changed, or rejected (why) | Game asset? |
|------|--------------|------------------------------------------|----------------|-----------------------------------|-------------|
| | | | | | |

## Worked example

You can delete this section once you understand the format. Do not copy these rows into your log.

| Time | Tool / model | What you asked (prompt or short summary) | What came back | Kept, changed, or rejected (why) | Game asset? |
|------|--------------|------------------------------------------|----------------|-----------------------------------|-------------|
| 1:05 | Image generator (ChatGPT) | Pixel sky background, purple sunset, 512 px wide | One PNG, too pink | Rejected; used a code gradient instead | No |
| 1:40 | Claude Code (Opus), build terminal | Make the cube jump on space with a little squash | Jump in `main.js` | Kept; tuned jump height after playtest | No (code only) |
| 3:10 | Meshy | Low poly tree, GLB | GLB, scale wrong | Kept after resize; checked license allows game use | Yes: `assets/tree.glb`. Meshy terms (note which tier you used) |
