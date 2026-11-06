# Runbook

How to run and ship this game. The devlog terminal keeps this current.

## Run locally

| macOS | Windows (Git Bash) |
|---|---|
| `python3 -m http.server 8000 --bind 127.0.0.1` | `py -m http.server 8000 --bind 127.0.0.1` (or `python` instead of `py`) |

Then open http://localhost:8000.

## Where things are

- `index.html`: page and three.js import
- `main.js`: the game
- `meta.json`: title, handle, asset credits

## Ship

In the build terminal: `/jam-ship`.
