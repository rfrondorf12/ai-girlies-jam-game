# Runbook

How to run and ship this game. The devlog terminal keeps this current.

## Run locally

| macOS | Windows (Git Bash) |
|---|---|
| `python3 -m http.server 8000 --bind 127.0.0.1` | `py -m http.server 8000 --bind 127.0.0.1` (or `python` instead of `py`) |

Then open http://localhost:8000.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move left / right | Left / Right arrow, or A / D | Hold left or right half of the screen |
| Jump (press again in the air to double jump) | Space, Up arrow, or W | Tap |
| Slash | `/` | Two-finger tap |
| Pause / resume | P or Escape | — |
| Restart | R (also after game over) | — |

Debug overlays (optional): add `?fps` or `?debug` to the URL, e.g. http://localhost:8000/?fps.

## Where things are

- `index.html`: page and three.js import
- `main.js`: the game (input, physics, panels, SFX)
- `worlds.js`: the three world looks and backgrounds
- `tuning.js`: tuning numbers (gravity, jump, slash, SFX)
- `assets/fonts/KaBlam.ttf`: Ka Blam font, free for personal use; commercial use needs contact at contact@imagex-fonts.com (see `meta.json`)
- `meta.json`: title, handle, asset credits

## Ship

In the build terminal: `/jam-ship`.
