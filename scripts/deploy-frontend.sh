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

# Propagate the updated index.html into every SPA route directory so
# direct-URL visitors always get the latest asset hashes.
#
# Route directories are derived from src/App.jsx route declarations, so new
# pages (e.g. /odometer-reports) are auto-synced on every deploy.
APP_ROUTES_FILE="${ROOT_DIR}/src/App.jsx"
ROUTE_DIRS=()

if [[ -f "${APP_ROUTES_FILE}" ]]; then
  while IFS= read -r route; do
    route="${route#/}"
    [[ -z "${route}" ]] && continue

    IFS='/' read -r -a parts <<< "${route}"
    normalized_parts=()
    for part in "${parts[@]}"; do
      [[ -z "${part}" || "${part}" == "*" || "${part}" == :* ]] && continue
      normalized_parts+=("${part}")
    done

    [[ ${#normalized_parts[@]} -eq 0 ]] && continue
    normalized="$(IFS='/'; echo "${normalized_parts[*]}")"
    ROUTE_DIRS+=("${normalized}")
  done < <(grep -oE 'path="/[^"]*"' "${APP_ROUTES_FILE}" | sed -E 's/^path="//;s/"$//')
fi

# Fallback to the currently known route list if App.jsx parsing yields nothing.
if [[ ${#ROUTE_DIRS[@]} -eq 0 ]]; then
  ROUTE_DIRS=(
    checklist clients forgot-password
    "fuel-requisitions" "fuel-requisitions/new"
    inspections invoices job-cards leads
    "lease-allocations" "lease-calendar" login
    long-term-leasing parks payments
    proforma-invoices quotations reset-password
    roles-permissions route-distances safari-allocations
    settings users vehicle-availability vehicle-services vehicles odometer-reports
  )
fi

declare -A _seen=()
for dir in "${ROUTE_DIRS[@]}"; do
  [[ -z "${dir}" ]] && continue
  if [[ -z "${_seen[${dir}]+x}" ]]; then
    _seen["${dir}"]=1
    mkdir -p "${TARGET_DIR}/${dir}"
    cp -f "${TARGET_DIR}/index.html" "${TARGET_DIR}/${dir}/index.html"
  fi
done

echo "Deploy complete."
echo "  Source: ${DIST_DIR}"
echo "  Target: ${TARGET_DIR}"
