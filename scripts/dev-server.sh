#!/usr/bin/env bash
# Daemonize the Next.js dev server (double-fork, detach all IO)
cd /home/z/my-project
LOG=/home/z/my-project/dev.log

# Kill any stale server on port 3000
fuser -k 3000/tcp 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

(
  # First fork
  setsid bash -c '
    cd /home/z/my-project
    exec bun run dev > /home/z/my-project/dev.log 2>&1 < /dev/null
  ' &
  # Second fork — reparent to init
  exit 0
) > /dev/null 2>&1 < /dev/null

# Wait for readiness
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "DEV SERVER UP (attempt $i): HTTP $code"
    exit 0
  fi
  sleep 1
done
echo "FAILED: last code = $code"
exit 1
