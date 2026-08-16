#!/usr/bin/env bash
# One-time bootstrap for the nginx + certbot Let's Encrypt setup.
#
# nginx/conf.d/app.conf references cert files under /etc/letsencrypt/live/...
# that don't exist yet on a fresh server, so nginx would refuse to start.
# This script: (1) writes a throwaway self-signed cert so nginx can boot,
# (2) starts nginx, (3) requests the real certificate from Let's Encrypt over
# the now-running HTTP-01 challenge path, (4) reloads nginx with it.
#
# Run once from the repo root on the server, after `docker network create
# rahyad_net` and before `docker compose up -d nginx` is relied on elsewhere
# (e.g. by the deploy workflow).
set -euo pipefail
cd "$(dirname "$0")/.."

domains=(rahyad.com www.rahyad.com)
email="sirmhss@gmail.com"
rsa_key_size=4096
data_path="./certbot"
staging=0 # set to 1 to test against Let's Encrypt's staging rate limits first

if [ -d "$data_path/conf/live/${domains[0]}" ]; then
  read -p "Existing certificate data found for ${domains[0]}. Replace it? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
fi

echo "### Creating dummy certificate for ${domains[0]} ..."
path="/etc/letsencrypt/live/${domains[0]}"
mkdir -p "$data_path/conf/live/${domains[0]}"
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Starting nginx ..."
docker compose up -d nginx

echo "### Deleting dummy certificate for ${domains[0]} ..."
docker compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/${domains[0]} && \
  rm -Rf /etc/letsencrypt/archive/${domains[0]} && \
  rm -Rf /etc/letsencrypt/renewal/${domains[0]}.conf" certbot

echo "### Requesting Let's Encrypt certificate for ${domains[*]} ..."
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

case "$staging" in
  1) staging_arg="--staging" ;;
  *) staging_arg="" ;;
esac

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $domain_args \
    --email $email \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "### Reloading nginx ..."
docker compose exec nginx nginx -s reload

echo "### Starting the certbot renewal loop ..."
docker compose up -d certbot
