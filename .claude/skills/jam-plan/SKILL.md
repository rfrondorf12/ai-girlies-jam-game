---
name: jam-plan
description: Use in the Anthropic Game Jam plan block (11:30 to 12:45), when the makers type /jam-plan or jam-state.md Phase is onboarding or plan. Walks them through research, picking a starter card, writing the context kit in their own words, and approving a one-page BUILD-PLAN.md before any game code exists.
---

# Jam Plan

The plan block runs **11:30 to 12:45** (break at 12:45, build from 1:00). The makers think and decide; you ask, find, and write down. No game code in this block.

Set `Phase: plan` in `jam-state.md`. Keep moving: if a step runs long, write what they have and go on; they can revisit it.

## 1. Research (about 15 min)

- Show the five cards in `context/STARTERS.md` in one short list (name and action only).
- Offer the showcase at http://localhost:8000/demos/zombie-runner-showcase/ (with the preview server running). It shows what a finished card looks like; it's not a template.
- Ask what games they love that use one action. Look at `context/references/`; for each file, ask what it's there for and note their answer for LOOK. If it's empty, say they can drop screenshots or links (`links.md`) in any time. Images and links only.

## 2. Ideate (about 20 min)

- They pick **one card**. Write it to `jam-state.md` `Card:`.
- Then ask, one at a time: the **world** (where is this?), the **character** (who or what does the player control?), and the **twist** (what makes it theirs?).
- Once those four are chosen, give one cue: **Devlog:** "We picked ___ because ___." (They paste it, in their words, into the devlog terminal.)
- If they're stuck: offer up to **three one-line seeds within their card**, ask which sparks something and what they'd change, then step back. Never develop, rank, or pick for them.
- Nudge, don't block: if an idea goes past the card, name the one action it hangs on, suggest Stretch, and mention the clock in one line. Their call; write down what they choose. Richer art, juice, and world are fine; push back (still their call) only on what breaks the one-action loop: menus, saves, multiplayer, long narrative trees.

## 3. Context kit (about 20 min)

Go through `context/CONCEPT.md`, `MECHANIC.md`, `LOOK.md`, `SCOPE.md`, one section at a time:

- Ask the section's question in your own plain words. Point at the example only if they're unsure what size of answer fits.
- Write their answer after the `>`, in their words. Tidy spelling; don't upgrade the idea or add detail.
- MECHANIC's one action is the card's action. SCOPE's In list starts from the card's Allowed list plus anything past it they chose to keep in after the nudge; Stretch is the card's Stretch plus what they chose to defer, in their words. What they defer goes in Stretch, not Out (Out is only what they chose to drop); a cheaper version you suggested goes in only if they picked it.
- On a team, if members disagree, ask them to decide and note whose call it was.
- Vague answer: one follow-up, then write what they said and move on.

Commit: `git add -A -- . ':!devlog' && git commit -m "docs: context kit"`.

## 4. Build plan (about 20 min)

Draft `context/BUILD-PLAN.md` from the context kit and the card, using the template's sections. Rules for the draft:

- Every line comes from their kit or their card. Don't add features, levels, or look ideas they didn't say, and don't drop ones they chose.
- **Done means:** 3 to 5 checks they can play ("I can switch lanes with A/D", "hitting a car ends the run").
- **Milestones:** M1 to M5 with the times from `AGENTS.md`; ask them to say "done when" for each in their words.
- **Tasks:** small tasks per milestone, each with the files it touches, owner (`jam-builder` for code, `jam-helper` for credits, Blender scripts, and checks), and a check. Tasks in the same milestone that run in parallel must touch different files.
- **File map:** `index.html`, `main.js`, `tuning.js`, plus a few small modules (for example `player.js`, `spawner.js`, `ui.js`).
- **Tuning knobs:** the numbers they'll want to tune (speed, gap, spawn rate, timing window).
- **Assets plan:** the card's safe budget is about 3 models and 3 sounds; if they want more, name the build-time cost and write down what they choose.
- **Cut list** and **Stretch**.

Read it back to them **section by section**. They edit; you apply only their edits. When they approve, write their initials and the time on the **Approved by** line, set `Phase: m1` in `jam-state.md`, commit (`git add -A -- . ':!devlog' && git commit -m "docs: build plan approved"`), and tell them:

1. **Devlog:** "Our plan: ___. Whose call: ___." Tell the devlog terminal in your own words. From here on, before each change tell it what you expect, and after playing it tell it what you saw; I'll cue you.
2. Break at 12:45. At **1:00**, run `/model claude-code/vmc/jam-lead` in this terminal, then say "build M1".
