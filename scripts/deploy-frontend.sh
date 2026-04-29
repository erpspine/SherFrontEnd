#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
TARGET_DIR="${DEPLOY_TARGET_DIR:-${ROOT_DIR}/../public}"

if [[ ! -d "${DIST_DIR}" ]]; then
  echo "Build output not found at ${DIST_DIR}. Run npm run build first."
  exit 1
fi

mkdir -p "${TARGET_DIR}" "${TARGET_DIR}/assets"

if command -v rsync >/dev/null 2>&1; then
  # Keep unrelated webroot content untouched while replacing only build-owned assets.
  rsync -a --delete "${DIST_DIR}/assets/" "${TARGET_DIR}/assets/"
  rsync -a --exclude "assets" --exclude "index.html" "${DIST_DIR}/" "${TARGET_DIR}/"
else
  rm -rf "${TARGET_DIR}/assets"
  cp -R "${DIST_DIR}/assets" "${TARGET_DIR}/assets"
  cp -f "${DIST_DIR}"/* "${TARGET_DIR}/" 2>/dev/null || true
fi

cp -f "${DIST_DIR}/index.html" "${TARGET_DIR}/index.html"

echo "Deploy complete."
echo "  Source: ${DIST_DIR}"
echo "  Target: ${TARGET_DIR}"
