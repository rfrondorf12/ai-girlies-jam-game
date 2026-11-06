# Build Plan

Drafted by Imra and approved by Reese Frondorf for team ai-girlies.

**Approved by:** Reese Frondorf, team ai-girlies

## The game in one line

> An 8-panel comic action runner where an abstract hero jumps, stomps, and slashes through contrasting monsters to complete and ink a full comic strip.

## The one action

> Jump/stomp on heads (`Space`) or slash (`/`) while moving through 8 escalating comic panels.

## Card

> Starter Card 2: Jumper / Runner (extended with stomp and slash interactions).

## Done means (3 to 5 checks you can play)

- [ ] Player moves left/right, jumps/stomps with `Space`, and slashes with `/` (sword sound effect).
- [ ] 3 randomized worlds on play:
  - World 1: Ink Drop vs Scissors & Erasers (warm newsprint).
  - World 2: The Worm vs Robins & Blue Jays (garden soil).
  - World 3: Crescent Moon vs Shooting Stars & Suns (midnight sky).
- [ ] 8-panel progression: panel clears upon surviving/defeating monsters, ramping difficulty from panel 1 to 8.
- [ ] Panel inking transition: unfinished sketch turns into bold ink as each panel is beaten.
- [ ] Victory screen: displays the completed 8-panel comic strip in full, with final score and restart.

## Milestones

| Milestone | By | Done when (your words) |
|---|---|---|
| M1 gray box | 1:15 | Single panel working with move, jump, and slash hitbox hitting a test target. |
| M2 loop | 1:45 | Monster spawning, stomp collision, slash kill, and 8-panel counter cycling. |
| M3 feel | 2:30 | Audio synthesis (sword slash, stomp, hit, victory) and comic inking visual transition. |
| M4 look | 3:15 | All 3 world themes, protagonists, and monster designs rendering cleanly. |
| M5 ship | 3:45 | Full 8-panel comic summary screen verified, repo pushed to GitHub, live on Vercel before 4:00 PM. |

## Tasks

| Milestone | Task | Files | Owner | Check |
|---|---|---|---|---|
| M1 | Player movement, gravity, jump, and slash action | `main.js`, `tuning.js` | Claude Code | Player controls feel responsive |
| M2 | Monster spawning, stomp on head, slash collision, panel 1-8 clear logic | `main.js` | Claude Code | Can beat all 8 panels |
| M3 | Synthesize Web Audio SFX (slash, jump, hit) and panel ink transitions | `main.js` | Claude Code | Audio plays on `/` slash and jump |
| M4 | Add the 3 worlds: Ink Drop, Worm, Crescent Moon + their respective monsters | `main.js` | Claude Code | Random world selected each run |
| M5 | Build the end comic strip viewer, test full run, deploy to Vercel | `index.html`, `main.js` | Reese / Claude Code | Live on Vercel by 4:00 PM |

## File map

- `index.html`: Canvas container and game viewport
- `main.js`: Main loop, input handling, combat, world rendering, comic strip viewer
- `tuning.js`: Player speed, jump height, monster spawn counts, difficulty curve

## Tuning knobs

- Player movement speed and jump velocity
- Slash duration and hitbox reach
- Monster speed and spawn rate multiplier per panel (1 through 8)

## Assets plan (the card's safe budget)

- Procedural 2D comic art drawn via Canvas / 2D WebGL (halftone dots, newsprint, bold outlines) see references included in [[brainstorming]] and [[LOOK]]
- Web Audio API procedural synthesis for sound effects (no external audio files needed)

## Cut list

- Dialogue trees and branching narrative choices
- Inventory, shops, or multiple weapon pickups
- Hand-drawn level geometry beyond the 8 panel format

## Stretch (only after M4)

- Downloadable comic strip image export
- Additional hazard types
