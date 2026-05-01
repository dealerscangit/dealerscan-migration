#!/usr/bin/env bash
# DealerScan build script
# Usage:
#   ./build.sh             # builds zip from current folder, names it after manifest version
#   ./build.sh 3.10        # bumps manifest + overlay.html version then builds

set -euo pipefail

cd "$(dirname "$0")"

# Optional version arg: bump manifest + visible label first
if [[ $# -ge 1 ]]; then
  NEW_VER="$1"
  echo "→ Bumping version to $NEW_VER"
  # manifest.json: replace "version": "X.Y" line
  /usr/bin/sed -i '' -E 's/("version": *)"[^"]+"/\1"'"$NEW_VER"'"/' manifest.json
  # overlay.html: replace "DealerScan vX.Y" footer label
  /usr/bin/sed -i '' -E 's/(DealerScan v)[0-9.]+/\1'"$NEW_VER"'/' overlay.html
fi

# Read current version from manifest
VERSION=$(/usr/bin/grep -E '"version"' manifest.json | /usr/bin/sed -E 's/.*"version": *"([^"]+)".*/\1/')
NAME=$(/usr/bin/grep -E '"name"' manifest.json | /usr/bin/head -n1 | /usr/bin/sed -E 's/.*"name": *"([^"]+)".*/\1/')

if [[ -z "$VERSION" ]]; then
  echo "✗ Could not read version from manifest.json"
  exit 1
fi

# Validate manifest is parseable JSON
if ! /usr/bin/python3 -c "import json; json.load(open('manifest.json'))" 2>/dev/null; then
  echo "✗ manifest.json is not valid JSON"
  exit 1
fi

# Verify visible version label matches manifest
if ! /usr/bin/grep -q "DealerScan v${VERSION}" overlay.html; then
  echo "⚠️  overlay.html footer does not show v${VERSION} — bump it before shipping"
fi

# Confirm this dir's manifest version matches the parent folder if it embeds one
PARENT=$(/usr/bin/basename "$PWD")
if [[ "$PARENT" == DealerScan-* && "$PARENT" != *"$VERSION"* ]]; then
  echo "⚠️  Folder '$PARENT' doesn't include version $VERSION — sanity check"
fi

OUT="../${NAME// /}-${VERSION}.zip"
echo "→ Building ${OUT}"

# Clean old DS_Store litter and build
/usr/bin/find . -name ".DS_Store" -delete 2>/dev/null || true
/usr/bin/zip -rq "$OUT" . -x "*.DS_Store" -x "build.sh" -x "CHANGELOG.md" -x "COMPLIANCE_ROADMAP.md" -x "NEXT_SESSION.md" -x ".git/*" -x ".gitignore"

SIZE=$(/bin/ls -lh "$OUT" | /usr/bin/awk '{print $5}')
echo "✓ Built $OUT ($SIZE)"
echo "  Submit this to Chrome Web Store."
