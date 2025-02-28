#!/bin/sh
echo "window.ENV = { NEXT_PUBLIC_WS_URL: \"$NEXT_PUBLIC_WS_URL\" };" > /app/public/env-config.js
echo "NEXT_PUBLIC_WS_URL=\"$NEXT_PUBLIC_WS_URL\""
cat /app/public/env-config.js
exec node server.js