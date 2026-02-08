#!/usr/bin/env bash
set -e

curl -fsSL https://bun.sh/install | bash
curl -fsSL https://opencode.ai/install | bash

[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"

CONFIG="$HOME/.config/Code/User/settings.json"
[ -f "$CONFIG" ] || echo '{}' > "$CONFIG"
jq '. + {"terminal.integrated.sendKeybindingsToShell": true}' "$CONFIG" > tmp.json && mv tmp.json "$CONFIG"
