#!/usr/bin/env bash
set -euo pipefail

# Pull an updated deck from a Claude Design handoff bundle.
#
# Usage:
#   ./scripts/pull-deck.sh <handoff-url>
#
# The URL must be an API handoff URL, not a share URL:
#   GOOD: https://api.anthropic.com/v1/design/h/<ID>
#   BAD:  https://claude.ai/design/p/<UUID>?file=...&via=share
#
# The handoff returns a gzip-compressed tar archive containing
# the project files. This script extracts it and copies the
# deck-relevant files into public/deck/.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DECK_DIR="$REPO_DIR/public/deck"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

usage() {
  echo "Usage: $0 <handoff-url>"
  echo ""
  echo "  handoff-url   An api.anthropic.com handoff URL"
  echo "                e.g. https://api.anthropic.com/v1/design/h/YhNuBmF7pm6qjWKWFBT9WA"
  echo ""
  echo "If you have a claude.ai/design/p/ share URL, you need the handoff"
  echo "URL instead. In the Claude Design UI, use 'Share > Get handoff link'"
  echo "or ask the person who sent it for the API URL."
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

URL="$1"

# Strip query params — the ?open_file=... part isn't needed for the download
URL="${URL%%\?*}"

# Validate URL format
if [[ "$URL" == *"claude.ai/design/p/"* ]]; then
  echo "ERROR: That's a share URL (claude.ai/design/p/...), which requires"
  echo "browser auth and won't work from the CLI."
  echo ""
  echo "You need the API handoff URL instead:"
  echo "  https://api.anthropic.com/v1/design/h/<ID>"
  echo ""
  echo "In Claude Design, use 'Share > Get handoff link' to get the right URL."
  exit 1
fi

if [[ "$URL" != *"api.anthropic.com/v1/design/h/"* ]]; then
  echo "WARNING: URL doesn't look like a standard handoff URL."
  echo "Expected: https://api.anthropic.com/v1/design/h/<ID>"
  echo "Proceeding anyway..."
  echo ""
fi

echo "Downloading handoff bundle..."
BUNDLE="$WORK_DIR/bundle"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$BUNDLE" "$URL")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: Download failed with HTTP $HTTP_CODE"
  if [[ "$HTTP_CODE" == "404" ]]; then
    echo "The handoff URL may have expired. Ask for a fresh one."
  elif [[ "$HTTP_CODE" == "403" ]]; then
    echo "Access denied. This URL may require authentication."
  fi
  exit 1
fi

FILE_SIZE=$(stat -c%s "$BUNDLE" 2>/dev/null || stat -f%z "$BUNDLE" 2>/dev/null)
echo "Downloaded $FILE_SIZE bytes"

# Detect file type by magic bytes
MAGIC=$(xxd -l 4 -p "$BUNDLE")
EXTRACT_DIR="$WORK_DIR/extracted"
mkdir -p "$EXTRACT_DIR"

if [[ "$MAGIC" == "1f8b"* ]]; then
  echo "Detected: gzip-compressed archive"
  # Could be .tar.gz or just .gz — try tar first
  if tar xzf "$BUNDLE" -C "$EXTRACT_DIR" 2>/dev/null; then
    echo "Extracted tar.gz archive"
  else
    echo "Not a tar — decompressing as plain gzip..."
    cp "$BUNDLE" "$WORK_DIR/bundle.gz"
    gunzip "$WORK_DIR/bundle.gz"
    # Check if the decompressed file is a tar
    INNER_MAGIC=$(xxd -l 4 -p "$WORK_DIR/bundle")
    if file "$WORK_DIR/bundle" | grep -q "tar"; then
      tar xf "$WORK_DIR/bundle" -C "$EXTRACT_DIR"
      echo "Extracted inner tar archive"
    else
      cp "$WORK_DIR/bundle" "$EXTRACT_DIR/"
      echo "Extracted single file"
    fi
  fi
elif [[ "$MAGIC" == "75737461" ]] || file "$BUNDLE" | grep -q "tar"; then
  echo "Detected: tar archive (uncompressed)"
  tar xf "$BUNDLE" -C "$EXTRACT_DIR"
  echo "Extracted tar archive"
else
  echo "WARNING: Unknown file format (magic: $MAGIC)"
  echo "Attempting tar extraction anyway..."
  if tar xf "$BUNDLE" -C "$EXTRACT_DIR" 2>/dev/null; then
    echo "Tar extraction succeeded"
  elif tar xzf "$BUNDLE" -C "$EXTRACT_DIR" 2>/dev/null; then
    echo "Gzip tar extraction succeeded"
  else
    echo "ERROR: Could not extract the bundle. File type:"
    file "$BUNDLE"
    exit 1
  fi
fi

echo ""
echo "Extracted contents:"
find "$EXTRACT_DIR" -type f | sort | while read -r f; do
  REL="${f#$EXTRACT_DIR/}"
  SIZE=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null)
  printf "  %-60s %s\n" "$REL" "$(numfmt --to=iec "$SIZE" 2>/dev/null || echo "${SIZE}B")"
done

# Look for deck files — the handoff may have them at the root or in a subdirectory
# Common patterns: index.html, slides/, assets/, *.jsx, *.css, *.js
DECK_ROOT=""
if [[ -f "$EXTRACT_DIR/index.html" ]]; then
  DECK_ROOT="$EXTRACT_DIR"
elif [[ -d "$EXTRACT_DIR/deck" && -f "$EXTRACT_DIR/deck/index.html" ]]; then
  DECK_ROOT="$EXTRACT_DIR/deck"
else
  # Search for index.html containing deck-stage (our custom element)
  FOUND=$(grep -rl "deck-stage" "$EXTRACT_DIR" --include="*.html" 2>/dev/null | head -1 || true)
  if [[ -n "$FOUND" ]]; then
    DECK_ROOT="$(dirname "$FOUND")"
  fi
fi

if [[ -z "$DECK_ROOT" ]]; then
  echo ""
  echo "WARNING: Could not auto-detect deck root directory."
  echo "Extracted files are in: $EXTRACT_DIR"
  echo "You'll need to copy the right files to $DECK_DIR manually."
  echo ""
  echo "To keep the extracted files, press Ctrl+C now."
  echo "Otherwise they'll be cleaned up on exit."
  read -r -p "Press Enter to exit..."
  exit 1
fi

echo ""
echo "Deck root: $DECK_ROOT"
echo ""

# Copy deck files, preserving directory structure
# Exclude node_modules, .git, package.json etc — just the actual deck assets
COPIED=0
while IFS= read -r -d '' f; do
  REL="${f#$DECK_ROOT/}"
  # Skip non-deck files
  case "$REL" in
    node_modules/*|.git/*|package*.json|tsconfig*|*.md|.prettierrc*) continue ;;
  esac
  DEST="$DECK_DIR/$REL"
  mkdir -p "$(dirname "$DEST")"
  cp "$f" "$DEST"
  COPIED=$((COPIED + 1))
done < <(find "$DECK_ROOT" -type f -print0)

echo "Copied $COPIED files to $DECK_DIR"
echo ""

# Check for large images that could benefit from optimization
LARGE_IMAGES=()
while IFS= read -r -d '' img; do
  SIZE=$(stat -c%s "$img" 2>/dev/null || stat -f%z "$img" 2>/dev/null)
  if [[ "$SIZE" -gt 1048576 ]]; then  # > 1MB
    LARGE_IMAGES+=("$img ($((SIZE / 1048576))MB)")
  fi
done < <(find "$DECK_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -print0)

if [[ ${#LARGE_IMAGES[@]} -gt 0 ]]; then
  echo "NOTE: Found ${#LARGE_IMAGES[@]} large image(s) that could be optimized:"
  for img in "${LARGE_IMAGES[@]}"; do
    echo "  $img"
  done
  echo ""
  echo "Consider running image optimization with sharp (from the repo dir):"
  echo "  cd $REPO_DIR && node -e \"...\" # see previous optimization runs"
fi

echo ""
echo "Done. Review the changes with:"
echo "  cd $REPO_DIR && git diff --stat"
