#!/usr/bin/env bash
# Rebuild public/deck/ from a Claude Design project download.
#
# The download comes from kernelbot, which holds the Design credential:
#   bun src/local/design/publish-artifact.ts <projectId> --out <dir>
# publishes the deck to its claude.ai artifact and leaves the unzipped
# download at <dir>/raw (its report prints the exact path as "download"), so
# the site and the artifact are built from the same bytes. A bare
#   bun src/local/design/oauth.ts download <projectId> deck.zip
# works too; pass the zip.
#
# Design is the source of truth: public/deck/ is replaced wholesale and git
# diff shows what changed. Left out of the site copy: _ref/ and uploads/
# (Design working files), CLAUDE.md, .thumbnail, deck.pdf (CI renders it), and
# any file over 15 MB, which the claude.ai artifact copy cannot hold either.
#
# Usage: scripts/pull-deck.sh <download dir | project.zip>
set -euo pipefail

src="${1:?usage: scripts/pull-deck.sh <download dir | project.zip>}"
repo="$(cd "$(dirname "$0")/.." && pwd)"
dest="$repo/public/deck"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if [[ -f "$src" ]]; then
  unzip -q "$src" -d "$tmp/zip"
  src="$tmp/zip"
fi
[[ -d "$src" ]] || { echo "pull-deck: $src is neither a directory nor a zip" >&2; exit 2; }
# The zip may wrap everything in one directory; the deck root is inside it.
while [[ $(find "$src" -mindepth 1 -maxdepth 1 | wc -l) -eq 1 && -d $(find "$src" -mindepth 1 -maxdepth 1) ]]; do
  src="$(find "$src" -mindepth 1 -maxdepth 1)"
done
[[ -f "$src/index.html" ]] || { echo "pull-deck: no index.html at $src — not a deck download" >&2; exit 2; }

cp -R "$src" "$tmp/deck"
rm -rf "$tmp/deck/_ref" "$tmp/deck/uploads" "$tmp/deck/CLAUDE.md" "$tmp/deck/.thumbnail" "$tmp/deck/deck.pdf"
find "$tmp/deck" -type f -size +15M -print -delete | sed "s#^$tmp/deck/#pull-deck: dropped (over 15 MB): #"
rm -rf "$dest"
mv "$tmp/deck" "$dest"

# Design re-adds the em dash the site title deliberately drops (3ec939f).
sed -i.bak 's#<title>SNØCAP US II, LP — Pitch Deck</title>#<title>SNØCAP US II, LP - Pitch Deck</title>#' "$dest/index.html"
rm -f "$dest/index.html.bak"

cd "$repo"
npx prettier --write --log-level warn 'public/deck/**/*.{html,css,js,jsx}'
npm run --silent verify-deck

echo "pull-deck: public/deck rebuilt from $src."
git status --short public/deck | tail -20
