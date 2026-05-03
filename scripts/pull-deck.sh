#!/usr/bin/env bash
set -euo pipefail

# Pull an updated deck from a Claude Design handoff bundle.
#
# Usage:
#   ./scripts/pull-deck.sh <handoff-url-or-token>
#   ./scripts/pull-deck.sh pOQA1IcwmGUnBxD6TG7hXA          # bare token
#   ./scripts/pull-deck.sh https://api.anthropic.com/v1/design/h/pOQA1IcwmGUnBxD6TG7hXA
#
# To get a fresh token from your browser console (on any claude.ai page):
#
#   fetch('/design/anthropic.omelette.api.v1alpha.OmeletteService/MintHandoffToken',
#     {method:'POST', headers:{'connect-protocol-version':'1','content-type':'application/proto',
#     'x-organization-uuid':'fc486e58-57e8-4477-b7cd-9d8341e1dfdb'},
#     body:new Uint8Array([0x0a,0x24,...new TextEncoder().encode('019dea98-5a96-714f-83d2-4067d2999030'),0x10,0x01])
#   }).then(r=>r.arrayBuffer()).then(b=>{let a=new Uint8Array(b);
#     let i=0;while(i<a.length){if(a[i]===0x0a){let len=a[i+1];
#     console.log('Token:',new TextDecoder().decode(a.slice(i+2,i+2+len)));break}i++}})
#
# The handoff returns a gzip-compressed tar archive containing
# the project files. This script extracts it and copies the
# deck-relevant files into public/deck/.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DECK_DIR="$REPO_DIR/public/deck"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# SNOCAP deck project UUID (stable, doesn't change)
PROJECT_UUID="019dea98-5a96-714f-83d2-4067d2999030"

usage() {
  echo "Usage: $0 <handoff-url-or-token>"
  echo ""
  echo "  Accepts:"
  echo "    - Full URL: https://api.anthropic.com/v1/design/h/<TOKEN>"
  echo "    - Bare token: pOQA1IcwmGUnBxD6TG7hXA"
  echo ""
  echo "  To get a token, run this in your browser console on claude.ai:"
  echo ""
  echo "    fetch('/design/anthropic.omelette.api.v1alpha.OmeletteService/MintHandoffToken',"
  echo "      {method:'POST',headers:{'connect-protocol-version':'1','content-type':'application/proto',"
  echo "      'x-organization-uuid':'fc486e58-57e8-4477-b7cd-9d8341e1dfdb'},"
  echo "      body:new Uint8Array([0x0a,0x24,...new TextEncoder().encode('$PROJECT_UUID'),0x10,0x01])"
  echo "    }).then(r=>r.arrayBuffer()).then(b=>{let a=new Uint8Array(b);"
  echo "      let i=0;while(i<a.length){if(a[i]===0x0a){let len=a[i+1];"
  echo "      console.log('Token:',new TextDecoder().decode(a.slice(i+2,i+2+len)));break}i++}})"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

INPUT="$1"

# Strip query params
INPUT="${INPUT%%\?*}"

# Detect input format and normalize to a full handoff URL
if [[ "$INPUT" == *"claude.ai/design/p/"* ]]; then
  echo "ERROR: That's a share URL (requires browser auth)."
  echo "Run the browser console snippet above to get a handoff token."
  exit 1
elif [[ "$INPUT" == *"api.anthropic.com/v1/design/h/"* ]]; then
  URL="$INPUT"
elif [[ "$INPUT" =~ ^[A-Za-z0-9_-]{15,30}$ ]]; then
  # Bare token ID — construct the full URL
  URL="https://api.anthropic.com/v1/design/h/$INPUT"
  echo "Bare token detected, using: $URL"
else
  echo "WARNING: Unrecognized format. Trying as URL..."
  URL="$INPUT"
fi

echo "Downloading handoff bundle..."
BUNDLE="$WORK_DIR/bundle"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$BUNDLE" "$URL")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: Download failed with HTTP $HTTP_CODE"
  if [[ "$HTTP_CODE" == "404" ]]; then
    echo "The handoff token may have expired. Mint a fresh one."
  elif [[ "$HTTP_CODE" == "403" ]]; then
    echo "Access denied."
  fi
  exit 1
fi

FILE_SIZE=$(stat -c%s "$BUNDLE" 2>/dev/null || stat -f%z "$BUNDLE" 2>/dev/null)
echo "Downloaded $FILE_SIZE bytes"

# Detect file type by magic bytes
MAGIC=$(od -A n -t x1 -N 2 "$BUNDLE" | tr -d ' ')
EXTRACT_DIR="$WORK_DIR/extracted"
mkdir -p "$EXTRACT_DIR"

if [[ "$MAGIC" == "1f8b"* ]]; then
  echo "Detected: gzip-compressed archive"
  if tar xzf "$BUNDLE" -C "$EXTRACT_DIR" 2>/dev/null; then
    echo "Extracted tar.gz archive"
  else
    echo "Not a tar — decompressing as plain gzip..."
    cp "$BUNDLE" "$WORK_DIR/bundle.gz"
    gunzip "$WORK_DIR/bundle.gz"
    if file "$WORK_DIR/bundle" | grep -q "tar"; then
      tar xf "$WORK_DIR/bundle" -C "$EXTRACT_DIR"
      echo "Extracted inner tar archive"
    else
      cp "$WORK_DIR/bundle" "$EXTRACT_DIR/"
      echo "Extracted single file"
    fi
  fi
elif file "$BUNDLE" 2>/dev/null | grep -q "tar"; then
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

# Look for deck files
DECK_ROOT=""
if [[ -f "$EXTRACT_DIR/index.html" ]]; then
  DECK_ROOT="$EXTRACT_DIR"
elif [[ -d "$EXTRACT_DIR/deck" && -f "$EXTRACT_DIR/deck/index.html" ]]; then
  DECK_ROOT="$EXTRACT_DIR/deck"
else
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

# Copy deck files, skipping Claude Design working files
COPIED=0
while IFS= read -r -d '' f; do
  REL="${f#$DECK_ROOT/}"
  case "$REL" in
    node_modules/*|.git/*|package*.json|tsconfig*|*.md|.prettierrc*) continue ;;
    uploads/*|_ref/*) continue ;;  # Claude Design working files
  esac
  DEST="$DECK_DIR/$REL"
  mkdir -p "$(dirname "$DEST")"
  cp "$f" "$DEST"
  COPIED=$((COPIED + 1))
done < <(find "$DECK_ROOT" -type f -print0)

echo "Copied $COPIED files to $DECK_DIR"
echo ""

# Check for large images
LARGE_COUNT=0
LARGE_SIZE=0
while IFS= read -r -d '' img; do
  SIZE=$(stat -c%s "$img" 2>/dev/null || stat -f%z "$img" 2>/dev/null)
  if [[ "$SIZE" -gt 1048576 ]]; then
    LARGE_COUNT=$((LARGE_COUNT + 1))
    LARGE_SIZE=$((LARGE_SIZE + SIZE))
  fi
done < <(find "$DECK_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -print0)

if [[ "$LARGE_COUNT" -gt 0 ]]; then
  echo "NOTE: $LARGE_COUNT images over 1MB (total ~$((LARGE_SIZE / 1048576))MB)."
  echo "Run image optimization before committing."
fi

echo ""
echo "Done. Review the changes with:"
echo "  cd $REPO_DIR && git diff --stat"
