#!/usr/bin/env bash
set -euo pipefail

SOURCE_APP_DIR="${SOURCE_APP_DIR:-$(pwd)}"
SOURCE_DB_PATH="${LLM_WIKI_DB_PATH:-${SOURCE_APP_DIR}/data/llm-wiki.sqlite}"
INSTALL_APP_DIR="/opt/ai-trend-news"
INSTALL_DATA_DIR="/var/lib/ai-trend-news"
SERVICE_USER="ai-trend-news"
SERVICE_GROUP="ai-trend-news"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
NGINX_SNIPPET_DIR="${NGINX_SNIPPET_DIR:-/etc/nginx/snippets}"

if [[ ! "${SOURCE_APP_DIR}" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "${SOURCE_APP_DIR}" == *"/../"* ]]; then
  echo "SOURCE_APP_DIR must be a simple absolute path without spaces or traversal" >&2
  exit 1
fi

if [[ ! "${SOURCE_DB_PATH}" =~ ^/[A-Za-z0-9._/-]+$ ]] || [[ "${SOURCE_DB_PATH}" == *"/../"* ]]; then
  echo "LLM_WIKI_DB_PATH must be a simple absolute path without spaces or traversal" >&2
  exit 1
fi

if [[ ! -f "${SOURCE_DB_PATH}" ]]; then
  echo "LLM Wiki database does not exist: ${SOURCE_DB_PATH}" >&2
  exit 1
fi

if [[ ! -r "${SOURCE_DB_PATH}" ]]; then
  echo "LLM Wiki database is not readable: ${SOURCE_DB_PATH}" >&2
  exit 1
fi

cd "${SOURCE_APP_DIR}"
npm run build

if ! getent group "${SERVICE_GROUP}" >/dev/null 2>&1; then
  sudo groupadd --system "${SERVICE_GROUP}"
fi

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  sudo useradd --system --gid "${SERVICE_GROUP}" --home-dir /nonexistent --shell /usr/sbin/nologin "${SERVICE_USER}"
fi

sudo install -d -o root -g root -m 0755 "${INSTALL_APP_DIR}"
sudo cp -a "${SOURCE_APP_DIR}/dist" "${SOURCE_APP_DIR}/node_modules" "${SOURCE_APP_DIR}/config" \
  "${SOURCE_APP_DIR}/package.json" "${SOURCE_APP_DIR}/package-lock.json" "${INSTALL_APP_DIR}/"
sudo chown -R root:root "${INSTALL_APP_DIR}"
sudo chmod -R go-w "${INSTALL_APP_DIR}"

snapshot_tmp="$(mktemp --suffix=.sqlite)"
published_tmp=""
cleanup() {
  rm -f "${snapshot_tmp}"
  if [[ -n "${published_tmp}" ]]; then
    sudo rm -f "${published_tmp}"
  fi
}
trap cleanup EXIT
node "${SOURCE_APP_DIR}/scripts/gce/snapshot-wiki.mjs" "${SOURCE_DB_PATH}" "${snapshot_tmp}"

sudo install -d -o root -g "${SERVICE_GROUP}" -m 0750 "${INSTALL_DATA_DIR}"
published_tmp="${INSTALL_DATA_DIR}/.llm-wiki.$$.sqlite"
sudo install -o root -g "${SERVICE_GROUP}" -m 0640 "${snapshot_tmp}" "${published_tmp}"
sudo mv -f "${published_tmp}" "${INSTALL_DATA_DIR}/llm-wiki.sqlite"
published_tmp=""

sudo -u "${SERVICE_USER}" test -r "${INSTALL_APP_DIR}/dist/src/cli.js"
sudo -u "${SERVICE_USER}" test -r "${INSTALL_DATA_DIR}/llm-wiki.sqlite"

sudo install -m 0644 "${SOURCE_APP_DIR}/scripts/gce/ai-trend-news.service.template" "${SYSTEMD_DIR}/ai-trend-news.service"
sudo install -m 0644 "${SOURCE_APP_DIR}/scripts/gce/ai-trend-news.nginx.conf" "${NGINX_SNIPPET_DIR}/ai-trend-news.conf"

sudo systemctl daemon-reload
sudo systemctl enable ai-trend-news.service
sudo systemctl restart ai-trend-news.service

echo "Include ${NGINX_SNIPPET_DIR}/ai-trend-news.conf inside the existing nginx server block."
echo "Then run: sudo nginx -t && sudo systemctl reload nginx"
echo "Re-run this installer after a completed writer cycle to publish a new integrity-checked DB snapshot."
