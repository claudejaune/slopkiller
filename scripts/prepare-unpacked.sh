#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUT_DIR="$REPO_ROOT/dist/extension"

REQUIRED_FILES="
manifest.json
popup.html
popup.js
content-script.js
ai-slop-detector.js
test-page.html
test-page.js
icons/icon16.png
icons/icon48.png
icons/icon128.png
"

for file in $REQUIRED_FILES; do
  if [ ! -f "$REPO_ROOT/$file" ]; then
    echo "Error: required file not found: $file" >&2
    exit 1
  fi
done

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/icons"

cp "$REPO_ROOT/manifest.json" "$OUT_DIR/"
cp "$REPO_ROOT/popup.html" "$OUT_DIR/"
cp "$REPO_ROOT/popup.js" "$OUT_DIR/"
cp "$REPO_ROOT/content-script.js" "$OUT_DIR/"
cp "$REPO_ROOT/ai-slop-detector.js" "$OUT_DIR/"
cp "$REPO_ROOT/test-page.html" "$OUT_DIR/"
cp "$REPO_ROOT/test-page.js" "$OUT_DIR/"
cp "$REPO_ROOT/icons/icon16.png" "$OUT_DIR/icons/"
cp "$REPO_ROOT/icons/icon48.png" "$OUT_DIR/icons/"
cp "$REPO_ROOT/icons/icon128.png" "$OUT_DIR/icons/"

echo "Prepared unpacked extension at: $OUT_DIR"
echo "Files copied: manifest.json popup.html popup.js content-script.js ai-slop-detector.js test-page.html test-page.js icons/*"
