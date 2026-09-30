#!/usr/bin/env bash
# Disk usage alert (systemd timer bannersin48-disk-alert.timer, every 15 min).
#
# If usage of any watched filesystem is >= DISK_ALERT_THRESHOLD percent
# (default 70), log a warning to syslog and POST to ALERT_WEBHOOK_URL (both from
# secrets/ops.env). While usage stays high the webhook is repeated at most
# every 6 hours; syslog gets a line on every run.
#
#   DISK_ALERT_PATHS  space-separated mount points to check (default "/")
set -euo pipefail

ROOT="${BI48_ROOT:-/srv/bannersin48}"
STATE_DIR="${DISK_ALERT_STATE_DIR:-/var/lib/bannersin48}"
REPEAT_SECONDS=$((6 * 3600))
TAG=bannersin48-disk

if [[ -f "$ROOT/secrets/ops.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/secrets/ops.env"
  set +a
fi
THRESHOLD="${DISK_ALERT_THRESHOLD:-70}"
PATHS="${DISK_ALERT_PATHS:-/}"
[[ "$THRESHOLD" =~ ^[0-9]+$ ]] || { echo "DISK_ALERT_THRESHOLD must be an integer" >&2; exit 64; }

post_webhook() {
  local text
  [[ -n "${ALERT_WEBHOOK_URL:-}" ]] || return 0
  text="$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  # "text" for Slack-style hooks, "content" for Discord.
  curl -fsS --max-time 10 -H 'Content-Type: application/json' \
    -d "{\"text\":\"${text}\",\"content\":\"${text}\"}" \
    "$ALERT_WEBHOOK_URL" >/dev/null ||
    logger -t "$TAG" -p user.err -- "webhook POST failed"
}

mkdir -p "$STATE_DIR"
status=0
for mount in $PATHS; do
  used="$(df -P "$mount" | tail -n 1 | tr -s ' ' | cut -d' ' -f5 | tr -d '%')"
  [[ "$used" =~ ^[0-9]+$ ]] || { logger -t "$TAG" -p user.err -- "cannot read usage of $mount"; status=1; continue; }

  state="$STATE_DIR/disk-alert$(printf '%s' "$mount" | tr '/' '_').last"
  if ((used >= THRESHOLD)); then
    msg="[$(hostname)] disk usage on $mount is ${used}% (threshold ${THRESHOLD}%)"
    logger -t "$TAG" -p user.warning -- "$msg"
    echo "$msg"
    now="$(date +%s)"
    last="$(cat "$state" 2>/dev/null || echo 0)"
    [[ "$last" =~ ^[0-9]+$ ]] || last=0
    if ((now - last >= REPEAT_SECONDS)); then
      post_webhook "$msg. Check: docker system df; du -sh $ROOT/*"
      echo "$now" >"$state"
    fi
  elif [[ -f "$state" ]]; then
    msg="[$(hostname)] disk usage on $mount back to ${used}%"
    logger -t "$TAG" -p user.notice -- "$msg"
    post_webhook "$msg"
    rm -f "$state"
  fi
done
exit "$status"
