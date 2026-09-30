#!/usr/bin/env bash
# One-time (idempotent) host setup for the Banners In 48 VPS.
# Ubuntu 24.04, already hardened (SSH keys only, ufw 22/80/443, fail2ban,
# unattended-upgrades). Run from the repo checkout:
#
#   sudo /srv/bannersin48/app/deploy/scripts/bootstrap-vps.sh
#
# What it does:
#   1. Docker Engine + buildx + compose plugin from Docker's official apt repo
#      (signing key fingerprint verified); `deploy` added to the docker group.
#   2. /etc/docker/daemon.json: json-file logs (20m x 5, compressed), live-restore.
#   3. journald capped at 500M.
#   4. DOCKER-USER firewall (only 80/443 reach containers from the internet),
#      re-applied on every docker start by a systemd unit.
#   5. /srv/bannersin48/{app,secrets,storage,backups,pgdata} with owners/modes.
#   6. restic, plus systemd timers for the nightly backup and the disk alert.
#
# Safe to re-run (e.g. after pulling changes to deploy/systemd or this script).
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
ROOT="${BI48_ROOT:-/srv/bannersin48}"
APP_UID=1000 # `node` user in the api image
PG_UID=999   # `postgres` user in the postgres:16 Debian image
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
# Docker's Release signing key (https://docs.docker.com/engine/install/ubuntu/).
DOCKER_GPG_FPR=9DC858229FC7DD38854AE2D88D81803C0EBFCD88

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'bootstrap-vps.sh: %s\n' "$*" >&2; exit 1; }

# Write $1 from stdin only if the content changed. Returns 0 if it changed.
install_if_changed() {
  local dest="$1" mode="${2:-0644}" tmp
  tmp="$(mktemp)"
  cat >"$tmp"
  if [[ -f "$dest" ]] && cmp -s "$tmp" "$dest"; then
    rm -f "$tmp"
    return 1
  fi
  install -D -m "$mode" -o root -g root "$tmp" "$dest"
  rm -f "$tmp"
  echo "wrote $dest"
  return 0
}

preflight() {
  [[ $EUID -eq 0 ]] || die "run with sudo"
  id "$DEPLOY_USER" >/dev/null 2>&1 || die "user '$DEPLOY_USER' does not exist"
  # shellcheck disable=SC1091
  . /etc/os-release
  if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
    echo "WARNING: tested on Ubuntu 24.04, this is ${PRETTY_NAME:-unknown}" >&2
  fi
  export DEBIAN_FRONTEND=noninteractive
}

install_docker() {
  log "Docker Engine"
  local pkg codename fpr sources
  for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    if dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed'; then
      apt-get remove -y "$pkg"
    fi
  done

  apt-get update -q
  apt-get install -y -q ca-certificates curl gnupg

  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -s /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc.tmp
    mv /etc/apt/keyrings/docker.asc.tmp /etc/apt/keyrings/docker.asc
  fi
  chmod a+r /etc/apt/keyrings/docker.asc
  fpr="$(gpg --show-keys --with-colons /etc/apt/keyrings/docker.asc 2>/dev/null | grep '^fpr:' | head -n 1 | cut -d: -f10)"
  if [[ "$fpr" != "$DOCKER_GPG_FPR" ]]; then
    rm -f /etc/apt/keyrings/docker.asc
    die "Docker apt key fingerprint mismatch (got '$fpr'); aborting"
  fi

  # shellcheck disable=SC1091
  codename="$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"
  sources="Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${codename}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
"
  install_if_changed /etc/apt/sources.list.d/docker.sources <<<"$sources" || true

  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  if ! id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx docker; then
    usermod -aG docker "$DEPLOY_USER"
    echo "added $DEPLOY_USER to the docker group (log out and back in to use it)"
  fi
}

configure_docker() {
  log "Docker daemon config"
  if install_if_changed /etc/docker/daemon.json 0644 <<'JSON'; then
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5",
    "compress": "true"
  },
  "live-restore": true
}
JSON
    systemctl restart docker
  fi
  systemctl enable --now docker.service containerd.service
}

configure_journald() {
  log "journald cap"
  if install_if_changed /etc/systemd/journald.conf.d/bannersin48.conf 0644 <<'CONF'; then
[Journal]
SystemMaxUse=500M
CONF
    systemctl restart systemd-journald
  fi
}

configure_firewall() {
  log "DOCKER-USER firewall"
  install -m 0755 -o root -g root "$SCRIPT_DIR/docker-user-firewall.sh" /usr/local/sbin/bannersin48-docker-user-firewall
  install -m 0644 -o root -g root "$DEPLOY_DIR/systemd/bannersin48-docker-user.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable bannersin48-docker-user.service
  systemctl restart bannersin48-docker-user.service
  /usr/local/sbin/bannersin48-docker-user-firewall status
  if command -v ufw >/dev/null; then
    ufw status | head -n 1 || true
  fi
}

create_dirs() {
  log "Directories under $ROOT"
  install -d -m 0750 -o root -g "$DEPLOY_USER" "$ROOT"
  # Repo checkout (git clone target); deploy owns it.
  install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$ROOT/app"
  # Env files, mode 600 each (gen-secrets.sh).
  install -d -m 0700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$ROOT/secrets"
  # Artwork, written by the api container as uid 1000.
  install -d -m 0750 -o "$APP_UID" -g "$APP_UID" "$ROOT/storage"
  # Dumps written by backup.sh (root); readable by the deploy group for restores.
  install -d -m 0750 -o root -g "$DEPLOY_USER" "$ROOT/backups" "$ROOT/backups/db"
  # Postgres data directory; the container keeps it owned by postgres (999).
  install -d -m 0700 -o "$PG_UID" -g "$PG_UID" "$ROOT/pgdata"
  # Lock file for deploy.sh.
  touch "$ROOT/.deploy.lock"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/.deploy.lock"
  install -d -m 0755 /var/lib/bannersin48 /var/cache/restic
}

install_timers() {
  log "restic + systemd timers"
  apt-get install -y -q restic
  local unit
  for unit in bannersin48-backup.service bannersin48-backup.timer \
    bannersin48-disk-alert.service bannersin48-disk-alert.timer; do
    install -m 0644 -o root -g root "$DEPLOY_DIR/systemd/$unit" /etc/systemd/system/
  done
  # The backup / disk-alert units run the scripts from the checkout as root.
  # `deploy` owns the checkout, but it already has passwordless sudo and the
  # docker group, so this grants it nothing new.
  systemctl daemon-reload
  systemctl enable --now bannersin48-backup.timer bannersin48-disk-alert.timer
  systemctl list-timers 'bannersin48-*' --no-pager
}

main() {
  preflight
  install_docker
  configure_docker
  configure_journald
  configure_firewall
  create_dirs
  install_timers
  log "Done"
  cat <<EOF
Docker $(docker --version | cut -d' ' -f3 | tr -d ,), $(docker compose version --short 2>/dev/null || echo 'compose ?').
Next (as $DEPLOY_USER, after logging out and back in for the docker group):
  $ROOT/app/deploy/scripts/gen-secrets.sh --email you@yourdomain
  $ROOT/app/deploy/scripts/deploy.sh
EOF
}

main "$@"
