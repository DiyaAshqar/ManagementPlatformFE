#!/bin/sh
set -eu

: "${API_URL:=https://api.dev.iconic.neurocodejo.com}"
export API_URL
envsubst '${API_URL}' < /etc/nginx/templates/env.js.template > /usr/share/nginx/html/env.js
