---
name: jam-start
description: Use at the start of the Anthropic Game Jam, when the makers type /jam-start, say "let's start", or jam-state.md has no Handle. Confirms setup on macOS or Windows, signs in to GitHub, records solo or team and the public handle, and offers a private repo. The brief comes next, in /jam-plan.
---

# Jam Start

Get the makers from installed kit to ready-to-plan in under 15 minutes (onboarding is 11:00 to 11:30). Stay warm and brief. Do the steps in order.

## 1. Confirm setup

Detect the OS with `uname -s`: `Darwin` is macOS; `MINGW*` or `MSYS*` is Windows (Git Bash).

Collect every problem before reporting:

| Check | Command | Fix: macOS | Fix: Windows (Git Bash) |
|---|---|---|---|
| Kit installed | `.claude/settings.local.json` exists (`test -f`; never read or print it) | rerun the install command from the README | same |
| git | `git --version` | `xcode-select --install` | install Git for Windows, reopen Git Bash |
| GitHub CLI (warn only) | `gh --version` | `brew install gh` | `winget install GitHub.cli`, reopen Git Bash |
| GitHub login (warn only) | `gh auth status` | `gh auth login` | `gh auth login` |
| Local server | first that works of `python3 --version`, `py --version`, `python --version` | `xcode-select --install` | `winget install Python.Python.3.12` |
| Blender (optional) | `command -v blender`, or `/Applications/Blender.app`, or `ls "/c/Program Files/Blender Foundation"/Blender*/blender.exe` | warn only | warn only |

The gateway key was tested by the installer; you're already running on it, so it works.

GitHub login is needed to ship to the gallery, but not to build; if it fails, give the fix and carry on (`/jam-ship` has a zip fallback). If anything else required failed: list each problem with its fix in plain language, say "Run `/jam-start` again when that's done," and **stop**. Write no files.

If everything passed, say so in one line and name the preview command they'll use (from `AGENTS.md`).

## 2. Git

If `git rev-parse --show-prefix` fails or prints anything (a parent folder's repo doesn't count), run `git init -b main`. It prints an empty line only when this folder is already its own repo. If they cloned the kit instead of installing it, `origin` points at the kit repo and their work must never push there: if `git remote get-url origin` succeeds and contains `anthropic-game-jam`, run `git remote remove origin`.

**Git identity.** If `git config user.email` or `git config user.name` prints nothing, set them for this folder only (if GitHub login failed, wait until step 4 and use `<handle>` and `<handle>@users.noreply.github.com`):

Run `gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"'` and `gh api user --jq '.login'` first, then pass the printed values literally (no `$(...)`, so no permission prompt):

```bash
git config user.email "<id>+<login>@users.noreply.github.com"
git config user.name "<login>"
```

## 3. Solo or team

Ask: "Solo, or a team? If a team (up to three on this machine), give me each person's initials." Write `Team: solo` or `Team: <initials, comma-separated>` in `jam-state.md`. Initials only; no full names.

**Start the clock:** if `Start time:` is empty, set it from `date +%Y-%m-%dT%H:%M` and `Phase:` to `onboarding`. If they joined late, tell them the plan block and milestones still follow the official clock in `AGENTS.md`.

## 4. Handle

Ask for one handle for the entry: "This name shows publicly in the jam gallery next to your game. It doesn't have to be a real name."

It must match `^[a-z0-9-]{2,30}$`. If it doesn't, suggest a cleaned-up version and ask them to confirm. Write it to `jam-state.md` `Handle:` and `meta.json` `"handle"`.

## 5. Private repo (optional)

Ask: "Want a private GitHub repo for this game? It backs up your work. Local git is enough for the jam." Do nothing until they answer.

On yes:
1. `git add -A && git commit -m "start: <handle>"` (`.gitignore` keeps the key file out; confirm with `git check-ignore .claude/settings.local.json`).
2. `gh repo create <handle>-jam-game --private --source . --push`, then write the URL (`gh repo view --json url --jq .url`) to `Repo URL:`.
3. If the push fails with "push declined due to email privacy restrictions": set `git config user.email` to the noreply address above, `git commit --amend --reset-author --no-edit`, `git push -u origin main`. Retry once; if it still fails, show the error and tell them to ask Nathan.
4. If the name is taken, offer `<handle>-jam-game-2`.

On no: `git add -A && git commit -m "start: <handle>"`, and set `Repo URL: local only`.

## 6. Hand off

Commit `jam-state.md` and `meta.json` (`git add -A -- . ':!devlog' && git commit -m "docs: start state"`; "nothing to commit" is fine). Then tell them, briefly:
1. Open a second terminal. New terminals start in the home folder, so first run `cd <this folder>` (print the real path from `pwd`), then `claude --agent devlog --model claude-code/vmc/jam-cheap`. Tell it what you decide and why as you go.
2. Open a **third** terminal, `cd` the same way, start the preview server (their command from `AGENTS.md`), and leave it running; the window may stay blank. Open http://localhost:8000. They should see a cube.
3. At **11:30**, type `/jam-plan` here to research, pick a card, and plan the game.
