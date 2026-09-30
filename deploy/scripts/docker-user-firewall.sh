#!/usr/bin/env bash
# Restrict what the internet can reach inside Docker containers.
#
# Why: ports published by Docker (`ports:` in compose) are DNAT-ed in the nat
# table and forwarded before ufw's INPUT rules ever see them, so ufw cannot
# block them. Docker reserves the DOCKER-USER chain (filter/FORWARD, evaluated
# before Docker's own rules) for exactly this.
#
# Policy for traffic that ARRIVES ON THE EXTERNAL INTERFACE and is being
# forwarded to a container:
#   - replies to connections the containers opened (ACME, apt, ...) -> allowed
#   - new connections whose ORIGINAL destination port is 80/tcp, 443/tcp or
#     443/udp (Caddy)                                              -> allowed
#   - anything else (e.g. a Postgres port published by mistake)     -> dropped
# Container-to-container and container-to-internet traffic is not affected.
#
# Installed by bootstrap-vps.sh as /usr/local/sbin/bannersin48-docker-user-firewall
# and applied by bannersin48-docker-user.service after every docker.service
# (re)start. Idempotent: rules live in a dedicated chain that is flushed and
# rebuilt; DOCKER-USER gets exactly one jump to it.
#
#   bannersin48-docker-user-firewall [apply|remove|status]
#   EXT_IF=eth0 bannersin48-docker-user-firewall apply   # override interface
set -euo pipefail

CHAIN=BI48-EDGE
ALLOW_TCP="${ALLOW_TCP:-80 443}"
ALLOW_UDP="${ALLOW_UDP:-443}"

ext_if() {
  if [[ -n "${EXT_IF:-}" ]]; then
    printf '%s' "$EXT_IF"
    return
  fi
  ip -4 route show default | head -n 1 | sed -n 's/.* dev \([^ ]*\).*/\1/p'
}

apply_family() {
  local ipt="$1" iface="$2" port
  command -v "$ipt" >/dev/null || return 0
  # Docker creates DOCKER-USER; create it too so ordering at boot never matters.
  "$ipt" -w -N DOCKER-USER 2>/dev/null || true
  "$ipt" -w -N "$CHAIN" 2>/dev/null || true
  "$ipt" -w -F "$CHAIN"

  "$ipt" -w -A "$CHAIN" -i "$iface" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
  for port in $ALLOW_TCP; do
    "$ipt" -w -A "$CHAIN" -i "$iface" -p tcp -m conntrack --ctorigdstport "$port" --ctdir ORIGINAL -j RETURN
  done
  for port in $ALLOW_UDP; do
    "$ipt" -w -A "$CHAIN" -i "$iface" -p udp -m conntrack --ctorigdstport "$port" --ctdir ORIGINAL -j RETURN
  done
  "$ipt" -w -A "$CHAIN" -i "$iface" -j DROP
  "$ipt" -w -A "$CHAIN" -j RETURN

  if ! "$ipt" -w -C DOCKER-USER -j "$CHAIN" 2>/dev/null; then
    "$ipt" -w -I DOCKER-USER 1 -j "$CHAIN"
  fi
}

remove_family() {
  local ipt="$1"
  command -v "$ipt" >/dev/null || return 0
  while "$ipt" -w -D DOCKER-USER -j "$CHAIN" 2>/dev/null; do :; done
  "$ipt" -w -F "$CHAIN" 2>/dev/null || true
  "$ipt" -w -X "$CHAIN" 2>/dev/null || true
}

main() {
  local action="${1:-apply}" iface
  [[ $EUID -eq 0 ]] || { echo "must run as root" >&2; exit 1; }
  case "$action" in
    apply)
      iface="$(ext_if)"
      [[ -n "$iface" ]] || { echo "cannot determine the external interface; set EXT_IF" >&2; exit 1; }
      apply_family iptables "$iface"
      apply_family ip6tables "$iface"
      echo "DOCKER-USER: only tcp/${ALLOW_TCP// /,} udp/${ALLOW_UDP// /,} reach containers from $iface"
      ;;
    remove)
      remove_family iptables
      remove_family ip6tables
      ;;
    status)
      iptables -w -S DOCKER-USER
      iptables -w -S "$CHAIN"
      ;;
    *)
      echo "usage: $0 [apply|remove|status]" >&2
      exit 64
      ;;
  esac
}

main "$@"
