#!/usr/bin/env bash
# Anthropic Game Jam kit installer (macOS and Windows Git Bash).
#
# Usage, from your home folder (not a OneDrive or iCloud synced folder):
#   cd ~
#   bash <(curl -fsSL https://raw.githubusercontent.com/SchoolofCreativeTechnology/anthropic-game-jam/main/install.sh)
#
# It checks your tools, downloads the kit into ./anthropic-game-jam, asks for the
# gateway key on your slip (typing is hidden), and tests the key. Run it again
# to fix a mistyped key: it keeps the kit and only asks for the key.
#
# Facilitator overrides (env): JAM_REPO, JAM_REF, JAM_SOURCE (local checkout,
# for dry runs), JAM_GATEWAY_KEY (skip the prompt), JAM_DIR (target folder).
set -euo pipefail

main() {
REPO="${JAM_REPO:-SchoolofCreativeTechnology/anthropic-game-jam}"
REF="${JAM_REF:-main}"
DIR="${JAM_DIR:-anthropic-game-jam}"
GATEWAY="https://ai-gateway.vercel.sh/claude-code"
MODEL="claude-code/vmc/jam-guide"

case "$(uname -s)" in
  Darwin) os=mac ;;
  MINGW*|MSYS*|CYGWIN*) os=win ;;
  *) os=other ;;
esac

say() { printf '%s\n' "$*"; }

# Claude Code's native installer puts claude in ~/.local/bin but doesn't always add
# that to PATH. Use it from there now; add it for new terminals once the tool check passes.
newterm=no
if ! command -v claude >/dev/null 2>&1 && { [ -x "$HOME/.local/bin/claude" ] || [ -x "$HOME/.local/bin/claude.exe" ]; }; then
  export PATH="$HOME/.local/bin:$PATH"
  newterm=yes
fi
fix() { if [ "$os" = win ]; then say "    fix: $2"; else say "    fix: $1"; fi; }

# 1. Tools. Collect every problem, then stop before writing anything.
missing=0
need() { # name, check command, mac fix, windows fix
  if ! eval "$2" >/dev/null 2>&1 </dev/null; then say "  missing: $1"; fix "$3" "$4"; missing=1; fi
}
say "Checking your tools..."
need git "git --version" "xcode-select --install" "install Git for Windows from https://git-scm.com, then reopen Git Bash"
need "Python 3" "python3 --version || py --version || python --version" "xcode-select --install" "winget install Python.Python.3.12, then reopen Git Bash"
need "Claude Code" "claude --version" "curl -fsSL https://claude.ai/install.sh | bash" "in PowerShell: irm https://claude.ai/install.ps1 | iex, then reopen Git Bash"
need curl "curl --version" "comes with macOS" "comes with Git Bash"
need tar "tar --version" "comes with macOS" "comes with Git Bash"
if [ "$missing" -ne 0 ]; then
  say ""
  say "Install what's missing, then run this command again. Nothing was written."
  exit 1
fi
if command -v gh >/dev/null 2>&1 </dev/null; then say "  GitHub CLI: found"; else
  say "  GitHub CLI (gh): not found (you can build without it; needed to ship to the gallery)"
  fix "download the macOS .pkg from https://github.com/cli/cli/releases/latest" "winget install GitHub.cli, then reopen Git Bash"
fi
command -v node >/dev/null 2>&1 </dev/null && say "  Node: found" || say "  Node: not found (optional; Claude checks code with it when it's there)"
blender=no
for b in blender /Applications/Blender.app/Contents/MacOS/Blender "/c/Program Files/Blender Foundation"/Blender*/blender.exe; do
  if [ -x "$b" ] || command -v "$b" >/dev/null 2>&1; then blender=yes; break; fi
done
if [ "$blender" = yes ]; then say "  Blender: found"; else say "  Blender: not found (optional; you can still make the game)"; fi
say "  All required tools found."
if [ "$newterm" = yes ]; then
  case "$os:${SHELL:-}" in
    win:*) rc="$HOME/.bashrc" ;;
    mac:*bash) rc="$HOME/.bash_profile" ;;
    *) rc="$HOME/.zshrc" ;;
  esac
  grep -qsF '.local/bin' "$rc" || printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$rc"
  # Git Bash warns on every new window if .bashrc exists without a profile that loads it.
  if [ "$os" = win ] && ! [ -e "$HOME/.bash_profile" ] && ! [ -e "$HOME/.bash_login" ] && ! [ -e "$HOME/.profile" ]; then
    printf 'test -f ~/.bashrc && . ~/.bashrc\n' > "$HOME/.bash_profile"
  fi
fi

# 2. The kit. A rerun with the kit already here skips the download.
# Rerun from inside the kit folder: use it, don't nest a second kit inside.
if [ -z "${JAM_DIR:-}" ] && [ -f AGENTS.md ] && [ -f .claude/agents/jam-companion.md ]; then DIR=.; fi
if [ -f "$DIR/AGENTS.md" ] && [ -f "$DIR/.claude/agents/jam-companion.md" ]; then
  say "  Kit already in $DIR/; keeping it."
elif [ -e "$DIR" ]; then
  say "A folder named $DIR already exists here and isn't the kit. Move it, or run this from another folder."
  exit 1
else
  mkdir "$DIR"
  if [ -n "${JAM_SOURCE:-}" ]; then
    git -C "$JAM_SOURCE" archive HEAD | tar -x -C "$DIR"
  # GitHub archives honor export-ignore, so facilitator files stay out.
  elif ! curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$DIR" --strip-components=1; then
    rm -rf "$DIR"
    say "Could not download the kit. Check your internet connection and try again."
    exit 1
  fi
  say "  Kit downloaded into $DIR/"
fi
cd "$DIR"
grep -qxF '.claude/settings.local.json' .gitignore 2>/dev/null || printf '.claude/settings.local.json\n' >> .gitignore
mkdir -p .claude

# 3. The gateway key. Under curl | bash, stdin is this script, so read from the terminal.
key="${JAM_GATEWAY_KEY:-}"
tries=0
while :; do
  if [ -z "$key" ]; then
    if ! { : < /dev/tty; } 2>/dev/null; then
      say "Can't read the key here (no terminal). Run this in Terminal or Git Bash directly."
      exit 1
    fi
    tries=$((tries + 1))
    [ "$tries" -le 3 ] || { say "Three tries used. Check the key on your slip, then run the install command again."; exit 1; }
    printf 'Paste the gateway key from your slip, then press Enter.\n(Mac: Cmd+V. Git Bash: right-click > Paste, or Shift+Insert. Nothing shows while you paste.)\nKey: '
    IFS= read -rs key < /dev/tty || key=""
    printf '\n'
    key="$(printf '%s' "$key" | tr -d '[:space:][:cntrl:]')"
    [ -n "$key" ] && say "  Got a key ending in ${key: -4}." || say "  Nothing was pasted. Try again."
  fi
  case "$key" in
    vck_*) ;;
    *) [ -n "$key" ] && say "That doesn't look like a gateway key (it starts with vck_). Try again."; key=""; continue ;;
  esac
  case "$key" in *[!A-Za-z0-9_-]*) say "The key has unexpected characters. Try again."; key=""; continue ;; esac

  # One tiny request, the same way Claude Code calls. The key goes in on stdin (-H @-), never on the command line.
  code=$(printf 'authorization: Bearer %s\n' "$key" | curl -s -o /dev/null -w '%{http_code}' -H @- \
    -H 'content-type: application/json' -H 'anthropic-version: 2023-06-01' \
    "$GATEWAY/v1/messages" \
    -d "{\"model\":\"$MODEL\",\"max_tokens\":5,\"messages\":[{\"role\":\"user\",\"content\":\"Say OK\"}]}" || true)
  case "$code" in
    200) say "  Key works."; break ;;
    401) say "  The gateway rejected that key (401). Check it against your slip and try again."; key=""; [ -z "${JAM_GATEWAY_KEY:-}" ] || exit 1; continue ;;
    402) say "  This key's budget is used up (402). Ask Nathan for another slip."; exit 1 ;;
    403) say "  The gateway blocked the model (403). Ask Nathan."; exit 1 ;;
    000|"") say "  Could not reach the gateway to test the key; saving it anyway. Check your internet."; break ;;
    *) say "  The gateway answered HTTP $code; saving the key anyway. Tell Nathan this number."; break ;;
  esac
done

umask 077
cat > .claude/settings.local.json <<EOF
{
  "model": "$MODEL",
  "env": {
    "ANTHROPIC_BASE_URL": "$GATEWAY",
    "ANTHROPIC_AUTH_TOKEN": "$key",
    "ANTHROPIC_API_KEY": "",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1",
    "ENABLE_TOOL_SEARCH": "true",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-code/vmc/jam-lead",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-code/vmc/jam-build",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-code/vmc/jam-cheap"
  }
}
EOF
umask 022
key=""

# Fresh Claude Code installs show a login screen before the folder's settings
# (with the gateway key) load. Mark first-run onboarding done so Claude goes
# straight to the trust prompt. Only adds missing fields; skips an unreadable file.
cfg="${CLAUDE_CONFIG_DIR:-$HOME}/.claude.json"
for py in python3 py python; do
  if "$py" --version >/dev/null 2>&1 </dev/null; then
    "$py" - "$cfg" <<'PY' || true
import json, os, sys
p = sys.argv[1]
try:
    d = json.load(open(p)) if os.path.exists(p) else {}
except Exception:
    sys.exit(0)
if d.get("hasCompletedOnboarding") and d.get("theme"):
    sys.exit(0)
d.setdefault("hasCompletedOnboarding", True)
d.setdefault("theme", "dark")
tmp = p + ".jam-tmp"
with open(tmp, "w") as f:
    json.dump(d, f, indent=2)
os.replace(tmp, p)
PY
    break
  fi
done

# 4. Open Claude in the kit and start /jam-start, so there's nothing to type.
#    Only when this script's input is the terminal (bash <(curl ...)); under
#    curl | bash it isn't, and Claude can't take over the terminal, so print the steps.
#    JAM_NO_LAUNCH=1 (facilitator dry runs) also prints the steps.
say ""
if [ -z "${JAM_NO_LAUNCH:-}" ] && [ -t 0 ]; then
  say "Done. Opening Claude now."
  say "When it asks whether you trust this folder, press the down arrow to \"Yes, I trust this folder\", then Enter."
  say "(The default is No, which closes Claude.) Then it starts /jam-start for you."
  say ""
  if claude --agent jam-companion "/jam-start"; then
    say ""
    say "To come back to Claude later: cd ~/$(basename "$PWD") && claude --agent jam-companion"
    exit 0
  fi
  say ""
  say "Claude didn't open. Start it yourself:"
else
  say "Done. Next:"
fi
[ "$newterm" = yes ] && say "  Open a new terminal window first (Claude Code was added to your PATH)."
[ "$DIR" = . ] || say "  cd $DIR"
say "  claude --agent jam-companion"
say "  When Claude asks whether you trust this folder, press the down arrow to Yes, then Enter."
say "Then type /jam-start"
}

main "$@"
