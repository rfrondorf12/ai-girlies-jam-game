# Anthropic Game Jam

Onboarding **11:00**, jam to **4:00 PM**. Each entry (solo, or a team of up to three on one machine) builds one small three.js browser game with Claude Code. The makers think and decide; Claude plans with them, then builds. The game idea, the decisions, and the record of those decisions belong to the makers.

Claude Code runs on jam models through a capped gateway key (set up by `install.sh`, stored in `.claude/settings.local.json`). The models are small and cheap, so keep the core small: one repeatable action from your starter card. Around that loop, the game can be as rich as the makers choose once it's fun.

## Sessions

- **Build terminal:** `claude --agent jam-companion`. Plans with the makers, then builds and coaches. `/jam-start`, then `/jam-plan`, then `/jam-ship` at the end.
- **Devlog terminal:** a second terminal in the same folder, `claude --agent devlog --model claude-code/vmc/jam-cheap`. The makers tell it what happened and why; it writes that down and commits `devlog/`.

## Models

The kit names four virtual models; Nathan decides what each points to and can change it mid-jam.

| Model | Used by |
|---|---|
| `claude-code/vmc/jam-guide` | build terminal, onboarding and plan block (default) |
| `claude-code/vmc/jam-lead` | build terminal, build block: at **1:00** run `/model claude-code/vmc/jam-lead` |
| `claude-code/vmc/jam-build` | `jam-builder` subagent |
| `claude-code/vmc/jam-cheap` | `jam-helper` subagent and the devlog terminal |

## The day (official jam clock)

Everyone follows the same clock, even if they started late. `Start time` in `jam-state.md` is when *this entry* started.

| Clock | Block | Outcome |
|---|---|---|
| 11:00 to 11:30 | Onboarding | Kit installed, key works, GitHub login, handle (`/jam-start`) |
| 11:30 to 12:45 | Plan (`/jam-plan`) | `context/` filled and `context/BUILD-PLAN.md` approved |
| 12:45 to 1:00 | Break | |
| 1:00 to 3:30 | Build, test, ship | M1 to M5, two playtests, `/jam-ship` by 3:30 |
| 3:30 to 4:00 | Gallery | Nathan merges; games go live |

| By | Milestone | Done when |
|---|---|---|
| 1:30 | M1 gray box | The one action works with plain shapes; restart works |
| 2:00 | M2 loop | Fail, score, restart in under 2 seconds. **Playtest 1** |
| 2:45 | M3 feel | Tuning numbers live in `tuning.js`; feedback on the action and on failure. **Playtest 2** |
| 3:15 | M4 look | Models, textures, sound around the card's safe budget; gameplay frozen |
| 3:30 | M5 ship | `JUDGING.md` self-check, `/jam-ship` |

`Phase` in `jam-state.md` is one of `onboarding`, `plan`, `m1`, `m2`, `m3`, `m4`, `ship`, `shipped`.

## Playtests

The makers can't see their own game's problems; a fresh player can. After M2 and M3, someone from another entry plays for about 3 minutes with **no explanation**. The makers say nothing: no tips, no laughing, no "oh, that's a bug." The build terminal stays quiet too. Afterward the makers ask only "Tell me the story of what just happened," then "Where were you bored or stuck?" Never "What should I change?": the makers decide the change. The story goes to the devlog before anything gets changed. Nathan pairs entries.

## Iterating: one change per loop

Each loop is one change. Before building it, the makers say what they expect it to do; after playing it, what actually happened. The devlog records both.

## The jam constraint

Every game is built around **one repeatable core action**, from one starter card in `context/STARTERS.md`. The card's **Allowed** list is the safe jam-day path; **Stretch** waits until the core loop is fun (after M4). This is Nathan's guidance, and agents coach it rather than enforce it:

- **Nudge, don't block.** When an idea gets big, name the one simple dynamic, suggest deferring the extra to Stretch, and remind them of the clock. Then build what the makers choose once they've decided clearly.
- **Richer is fine.** Better art, more juice, a richer world, and more enemies after M4 are all OK while the loop stays one action. Never refuse something only because it is "beyond the card."
- **What actually breaks a jam game** is complexity that breaks the one-action loop: menus, saves, multiplayer, long narrative trees. Say so plainly when an idea heads there.

The makers choose the card, the world, the character, the twist, and how far past the skeleton to go.

## Rules for every agent in this repo

1. **The idea is the makers'.** Never invent the game concept or write content into `context/` or `context/BUILD-PLAN.md` they did not say or approve. You may offer up to three one-line seeds within their card when asked, then step back.
2. **File ownership.** The build session owns game code (`index.html`, `main.js`, `tuning.js`, other `.js`/`.css`, assets, `meta.json`), `context/`, and `jam-state.md`. The devlog session owns `devlog/`. Never write the other's files.
3. **No build step.** Plain HTML and ES modules. three.js comes from the import map in `index.html`, pinned to 0.186.1. No `npm install`.
4. **Assets.** Every downloaded file goes in `meta.json` `assets` with its `source` and `license`. Every file Claude creates (texture, model, sound) goes in `ai_assets`.
5. **Preview locally** with a server in a **third terminal** (never in a Claude terminal), never by double-clicking `index.html`:
   - macOS: `python3 -m http.server 8000 --bind 127.0.0.1`
   - Windows (Git Bash): `py -m http.server 8000 --bind 127.0.0.1` (or `python -m http.server 8000 --bind 127.0.0.1`)
   Then open http://localhost:8000.
6. **Mac and Windows.** Makers use both. Give the Windows (Git Bash) variant whenever a command differs. Detect the OS with `uname -s` (`Darwin` or `MINGW*`/`MSYS*`); on Windows use GNU tools (`sed -i`, not `sed -i ''`) and `py` (or `python`) if `python3` is missing. Git's "LF will be replaced by CRLF" warnings on Windows are harmless; ignore them.
7. **No secrets.** Never read, print, or edit `.claude/settings.local.json` (it holds the gateway key). No keys in any file, commit, or message.

## Files

- `context/`: STARTERS (the cards), CONCEPT, MECHANIC, LOOK, SCOPE, BUILD-PLAN. The brief for every build.
- `JUDGING.md`: draft checklist of likely technical checks (rubric not finalized).
- `devlog/DEVLOG.md`: timestamped entries, reflection, AI use disclosure (summary).
- `devlog/AI-USE-LOG.md`: running log of each AI use during the jam.
- `devlog/RUNBOOK.md`: how to run and ship this game.
- `jam-state.md`: team, handle, start time, phase (the milestone being worked on), card, repo URL, gallery PR.
- `meta.json`: title, handle, description, asset credits. Shipped to the gallery.

Gallery: https://stec-jam-gallery.vercel.app (source: https://github.com/SchoolofCreativeTechnology/jam-gallery).
