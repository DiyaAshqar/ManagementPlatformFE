#!/bin/sh
set -eu

: "${API_URL:=https://api.dev.iconic.neurocodejo.com}"
: "${DEPLOYED_AT:=$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
export API_URL
export DEPLOYED_AT
envsubst '${API_URL} ${DEPLOYED_AT}' < /etc/nginx/templates/env.js.template > /usr/share/nginx/html/env.js
