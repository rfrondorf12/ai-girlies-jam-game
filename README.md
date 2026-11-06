# Anthropic Game Jam

Build one small browser game in a day with three.js and Claude Code: solo, or as a team of up to three on one laptop. You think and decide; Claude plans with you, then builds.

How the pieces fit together: [STACK.md](STACK.md).

## The day

| Time | What |
|---|---|
| **11:00** | Onboarding: install, key, GitHub login (`/jam-start`) |
| **11:30** | Plan: research, pick a card, write your context kit and build plan (`/jam-plan`) |
| **12:45** | Break |
| **1:00** | Build: milestones M1 to M5, two playtests |
| **3:30 PM** | Ship (`/jam-ship`) |
| **4:00 PM** | Games live in the gallery; judging until 5:30 |

## The one rule

Your game is built around **one action the player repeats**, from one starter card in [`context/STARTERS.md`](context/STARTERS.md): lane runner, jumper, shooter, dodger, or timing tapper. Each card has an **Allowed** list: the safe path for the day. Get that loop fun first; then go richer (art, juice, world, Stretch items) as far as the clock allows. Claude will nudge you when an idea gets big, and you decide. The world, the character, and the twist are yours.

## Before you come

- A laptop (macOS, or Windows with **Git Bash**; after the installs below, run every jam command in Git Bash)
- A GitHub account
- These installed:

| | macOS (Terminal) | Windows (PowerShell) |
|---|---|---|
| git | `xcode-select --install` | Git for Windows (includes Git Bash): https://git-scm.com |
| GitHub CLI (to ship) | `brew install gh`, or the .pkg from https://github.com/cli/cli/releases/latest | `winget install GitHub.cli` |
| Python 3 | comes with `xcode-select --install` | `winget install Python.Python.3.12` |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` | `irm https://claude.ai/install.ps1 \| iex` |
| Node (optional) | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| Blender (optional) | https://www.blender.org/download | same |

Then log in to GitHub: `gh auth login`. You don't need a Claude account: the jam gives you a key.

## Install (at 11:00)

You'll get a slip with a gateway key. Run this from your home folder (not Desktop or Documents if they sync to OneDrive or iCloud):

```bash
cd ~
bash <(curl -fsSL https://raw.githubusercontent.com/SchoolofCreativeTechnology/anthropic-game-jam/main/install.sh)
```

It checks your tools, downloads the kit into `anthropic-game-jam/`, and asks for the key (typing stays hidden). Paste with Cmd+V on a Mac; in Git Bash, right-click and choose Paste, or press Shift+Insert (Ctrl+V doesn't paste there). The key is saved in `.claude/settings.local.json`, which is never committed or shipped. Don't paste it anywhere else.

## Start

The installer opens Claude for you and starts `/jam-start`. To come back later (or if it didn't open):

```bash
cd ~/anthropic-game-jam
claude --agent jam-companion
```

When Claude asks whether you trust this folder, press **↓** to **Yes, I trust this folder**, then Enter (the default is No, which closes Claude). If you opened Claude yourself, type `/jam-start`. At 11:30, `/jam-plan`. At 1:00, run `/model claude-code/vmc/jam-lead` and start building.

## Your devlog

Open a **second terminal** (it starts in your home folder, so move into the kit first):

```bash
cd ~/anthropic-game-jam
claude --agent devlog --model claude-code/vmc/jam-cheap
```

Tell it what you tried, what broke, and what you decided (on a team, who decided). It keeps your devlog in your words and logs each AI use in `devlog/AI-USE-LOG.md`.

## See your game

Open a **third terminal**, run `cd ~/anthropic-game-jam`, then start the server and leave it running there:

| macOS | Windows (Git Bash) |
|---|---|
| `python3 -m http.server 8000 --bind 127.0.0.1` | `py -m http.server 8000 --bind 127.0.0.1` (if `py` isn't found: `python -m http.server 8000 --bind 127.0.0.1`) |

The window may stay blank; that's fine, leave it open. Open http://localhost:8000. Don't double-click `index.html`; it won't load.

## Playtests

After M2 (about 2:00) and M3 (about 2:45), someone from another entry plays yours for 3 minutes. Say nothing; just watch. Then ask "Tell me the story of what just happened." Tell your devlog what you saw before you change anything.

## Ship

In the build terminal: `/jam-ship` by **3:30 PM**, so your game is live by **4:00 PM** at https://stec-jam-gallery.vercel.app.

## Example demo

[Zombie Runner](demos/zombie-runner-showcase/) shows what a finished lane runner can look like. It's not a template. With your preview server running, open http://localhost:8000/demos/zombie-runner-showcase/.

For a draft of what evaluation might look at (rubric **not finalized**), see [JUDGING.md](JUDGING.md).
