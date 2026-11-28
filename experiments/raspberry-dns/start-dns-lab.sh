#!/bin/sh
set -eu
# Service temporaire uniquement : ni enable, ni DNS/DHCP de la maison modifie.
config=/home/quiz/kuikuiz-lab/p26-20261128/dnsmasq-lab.conf
if [ "$(id -u)" -ne 0 ]; then
  echo "Executer avec sudo dans le terminal utilisateur." >&2
  exit 1
fi
if [ -n "$(ss -H -lntu 'sport = :53')" ]; then
  echo "Port 53 deja utilise : arret sans modification." >&2
  exit 1
fi
/usr/sbin/dnsmasq --test --conf-file="$config"
systemd-run --unit=kuikuiz-dns-lab --service-type=exec --collect \
  --uid=quiz --gid=quiz \
  --property=AmbientCapabilities=CAP_NET_BIND_SERVICE \
  --property=CapabilityBoundingSet=CAP_NET_BIND_SERVICE \
  --property=NoNewPrivileges=yes \
  /usr/sbin/dnsmasq --keep-in-foreground --conf-file="$config"
echo "Demarrage demande. Verification : systemctl status kuikuiz-dns-lab"
echo "Arret : sudo systemctl stop kuikuiz-dns-lab"
