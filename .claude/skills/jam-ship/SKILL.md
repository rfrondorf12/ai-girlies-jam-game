---
name: jam-ship
description: Use when the makers type /jam-ship or say they're ready to ship or publish their Anthropic Game Jam game. Checks the game and devlog are complete, confirms public-gallery consent, and opens a pull request adding the game to SchoolofCreativeTechnology/jam-gallery.
---

# Jam Ship

Get the game into the public gallery. Nathan merges PRs from **3:30 PM**, so shipping by then means it's live by **4:00 PM**.

Gallery repo: `SchoolofCreativeTechnology/jam-gallery`. Gallery site: https://stec-jam-gallery.vercel.app. (One place each; if Nathan says the gallery moved, use what he says.)

Do the steps in order. Stop at the first step that fails. Tell them up front: shipping runs several `gh` and `git` commands. Most are pre-approved in `.claude/settings.json`; if Claude Code asks permission for one, they should read it and choose Yes.

## 1. Check it's ready

Read `meta.json`, `jam-state.md`, and `devlog/DEVLOG.md`, and list the files in the project (`git ls-files`, plus untracked files from `git status --porcelain`). Collect **every** gap before reporting:

- `meta.json`: `title`, `handle`, `description` are non-empty; `handle` matches `^[a-z0-9-]{2,30}$`.
- Assets: every file except `index.html`, `meta.json`, `.js`/`.css` files, dotfiles (`.gitignore` and the like), and the kit files (`context/`, `devlog/`, `.claude/`, `assets-packs/`, `demos/`, `docs/`, `facilitator/`, `dist/`, `assets/blender/` (Blender scripts), `jam-state.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `STACK.md`, `JUDGING.md`, `install.sh`) must be listed in `meta.json` `assets` (with non-empty `source` and `license`) or in `ai_assets` (plain path strings only; an object there doesn't count). Name each unlisted file.
- `DEVLOG.md`: `## Reflection` and `## AI Use Disclosure` each have the makers' own content, not just the template's italic prompt, and no leftover "Draft" label or `[to confirm ...]` placeholder (send them to the devlog terminal to finish it).
- `devlog/AI-USE-LOG.md` exists. If **Your log** has no real entries yet (only the blank template row), **warn** them to update it in the devlog terminal. This does **not** block shipping by itself.
- `index.html` exists and still loads `main.js`.
- **`JUDGING.md` self-check (non-blocking):** Read the checklist. Warn if they have likely gaps (console not checked, no real collision when the game needs it, restart loop missing, no thought given to FPS on a weak laptop). Suggest fixes; do **not** block ship on this list alone.

If anything **blocking** is missing: list every gap with how to fix it (asset credits and title in this terminal; reflection and disclosure in the devlog terminal), and **stop**. Do not fork, copy, or open anything. Report the AI use log warning and `JUDGING.md` warnings separately; they do not block.

## 2. Consent

Ask exactly: "Your game and devlog will be published to a public gallery under the handle `<handle>`. The devlog shows your initials, not your names; the pull request shows your GitHub login. OK to publish?" On a team, every member at the machine must say yes. Continue only on a clear yes. Anything else: stop, and say they can run `/jam-ship` again later.

## 3. Open the pull request

Work in `dist/ship/` inside the jam folder (gitignored). Every command below runs **from the jam folder**, with `git -C dist/ship/jam-gallery`; don't `cd` away and don't rely on shell variables between commands.

```bash
gh auth status                                   # stop with "run gh auth login" if this fails (or use the zip below)
gh api repos/SchoolofCreativeTechnology/jam-gallery/contents/games/<handle> >/dev/null 2>&1 && echo TAKEN
gh api user --jq .login                           # <login>, used below
```

If `TAKEN` (and this isn't a re-ship): the handle is used. Ask for a new handle, update `meta.json` and `jam-state.md`, and repeat this step.

**First ship:**

```bash
rm -rf dist/ship && mkdir -p dist/ship
gh repo fork SchoolofCreativeTechnology/jam-gallery --clone=false     # fine if the fork already exists
gh repo clone <login>/jam-gallery dist/ship/jam-gallery     # also adds the upstream remote
git -C dist/ship/jam-gallery fetch upstream
git -C dist/ship/jam-gallery switch -C game/<handle> upstream/main
git -C dist/ship/jam-gallery config user.name "<login>"
git -C dist/ship/jam-gallery config user.email "<id>+<login>@users.noreply.github.com"   # values from gh api user --jq '.id' and '.login'; no $(...)
mkdir -p dist/ship/jam-gallery/games/<handle>
```

The gallery commit uses their GitHub login and noreply address, never their personal email.

Copy into `dist/ship/jam-gallery/games/<handle>/`: `index.html`, `meta.json`, every `.js` and `.css` file of the game (not the kit folders `assets-packs/`, `demos/`, `docs/`, `facilitator/`, `dist/`, `.claude/`), every asset listed in `meta.json` (including any the game loads from `assets-packs/`), and `devlog/DEVLOG.md` (as `DEVLOG.md`). Keep the relative folder layout so paths in the code still work. **Never copy `.claude/`** (it holds the gateway key).

**Key check, before committing:** `grep -rlE 'vck_[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}' dist/ship/jam-gallery/games/<handle>` must print nothing. If it prints a file, stop: remove the key from that file in the jam folder (it must never be in game code or the devlog), then copy again.

```bash
git -C dist/ship/jam-gallery add games/<handle>
git -C dist/ship/jam-gallery commit -m "game: <handle>"
git -C dist/ship/jam-gallery push -u origin game/<handle>
gh pr create -R SchoolofCreativeTechnology/jam-gallery --head <login>:game/<handle> --title "game: <handle>" --body "<title>: <description>"
```

**Shipping again** (`Gallery PR:` already has a URL, e.g. after a failed check): skip the `TAKEN` check. If `dist/ship/jam-gallery` still exists, reuse it; otherwise clone and switch as above but use `git -C dist/ship/jam-gallery fetch origin` and `switch -C game/<handle> origin/game/<handle>`. Delete `dist/ship/jam-gallery/games/<handle>` (so files removed since the last ship go too), copy, run the key check, commit, then `git -C dist/ship/jam-gallery push --force -u origin game/<handle>`. Skip `gh pr create`; the open PR updates itself and its check re-runs.

**If `gh` can't work for this entry** (no GitHub account, login fails, fork blocked): build a zip instead and stop. Delete `dist/zip` first, copy the same files into `dist/zip/games/<handle>/`, run the key check on that folder, then `python3 -m zipfile -c dist/<handle>.zip dist/zip/games` (Windows: `py -m zipfile`; Git Bash has no `zip`). Show them where it is (macOS: `open dist`; Windows: `explorer.exe dist`) and tell them to bring `dist/<handle>.zip` to Nathan (AirDrop, USB stick, or however he says); he opens the PR with `facilitator/ship-from-zip.sh`. Set `Gallery PR: zip to Nathan`.

## 4. Done

- Write the PR URL into `jam-state.md` `Gallery PR:` and set `Phase: shipped`. Commit: `git add -A -- . ':!devlog' && git commit -m "ship: <handle>"`. Push only if `git remote` lists a remote.
- Tell them: the PR is open; the gallery check runs automatically; once Nathan merges, the game appears at https://stec-jam-gallery.vercel.app (direct link: https://stec-jam-gallery.vercel.app/games/<handle>/). If the check fails, show them `gh pr checks <url>` and fix what it names.
- Mention that if they want the game on their own URL too, Nathan can walk them through connecting Vercel to their repo after the jam.
- Suggest a last devlog entry about shipping.
- **Shared or lab machine:** offer `gh auth logout` so the next person can't act as them. Their call.
