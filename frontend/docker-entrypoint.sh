#!/bin/sh
set -e

# Substitute only $BACKEND_URL — all other nginx $variables are left intact.
envsubst '${BACKEND_URL}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
