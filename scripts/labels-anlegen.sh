#!/usr/bin/env bash
# Legt die Labels aus labels.json im Repo an (oder aktualisiert sie).
# Voraussetzung: GitHub CLI (gh) ist installiert und eingeloggt, jq ist installiert.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
jq -c '.[]' labels.json | while read -r l; do
  name=$(jq -r .name <<<"$l")
  color=$(jq -r .color <<<"$l")
  desc=$(jq -r .description <<<"$l")
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force
  echo "ok: $name"
done
