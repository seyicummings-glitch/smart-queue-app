#!/bin/bash

APP_DIR="/c/Users/hp/Downloads/Queue Management System (Copy)/SmartQueueApp"
BACKEND_DIR="$APP_DIR/backend"
VENV_ACTIVATE="$APP_DIR/.venv/Scripts/activate"
API_TS="$APP_DIR/lib/api.ts"
READY_FLAG="$APP_DIR/.sqms_ready"
DJANGO_LOG="/tmp/sqms_django.log"
TUNNEL_LOG="/tmp/sqms_tunnel.log"

# Find cloudflared
if [ -f "$APP_DIR/cloudflared.exe" ]; then
  CLOUDFLARED="$APP_DIR/cloudflared.exe"
else
  CLOUDFLARED="cloudflared"
fi

# ── Clean up old state ───────────────────────────────
rm -f "$READY_FLAG"
pkill -f "manage.py runserver" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
sleep 1

echo ""
echo "================================================"
echo "   SmartQueueApp — Starting Services"
echo "================================================"
echo ""

# ── 1. Activate virtual environment ─────────────────
source "$VENV_ACTIVATE"
echo "[1/3] Virtual environment activated"

# ── 2. Start Django (auto-retry up to 3 times) ──────
echo "[2/3] Starting Django..."
cd "$BACKEND_DIR"

DJANGO_PID=""
DJANGO_READY=false

for attempt in 1 2 3; do
  [ $attempt -gt 1 ] && echo "  Retrying Django (attempt $attempt)..."
  PYTHONUNBUFFERED=1 python manage.py runserver 0.0.0.0:8000 --noreload > "$DJANGO_LOG" 2>&1 &
  DJANGO_PID=$!

  for i in $(seq 1 20); do
    sleep 1
    if grep -q "Starting development server" "$DJANGO_LOG" 2>/dev/null; then
      DJANGO_READY=true
      break 2
    fi
    if ! kill -0 $DJANGO_PID 2>/dev/null; then
      break
    fi
  done
  kill $DJANGO_PID 2>/dev/null
done

if [ "$DJANGO_READY" = false ]; then
  echo ""
  echo "  ERROR: Django failed to start."
  echo "  Last log:"
  tail -20 "$DJANGO_LOG"
  exit 1
fi
echo "       Django running  →  http://127.0.0.1:8000"

# ── 3. Start Cloudflare tunnel (auto-retry up to 3 times) ──
echo "[3/3] Starting Cloudflare tunnel..."
cd "$APP_DIR"

TUNNEL_PID=""
URL=""

for attempt in 1 2 3; do
  [ $attempt -gt 1 ] && echo "  Retrying tunnel (attempt $attempt)..."
  kill $TUNNEL_PID 2>/dev/null
  > "$TUNNEL_LOG"
  "$CLOUDFLARED" tunnel --url http://127.0.0.1:8000 > "$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  for i in $(seq 1 30); do
    sleep 1
    URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
    [ -n "$URL" ] && break 2
    if ! kill -0 $TUNNEL_PID 2>/dev/null; then
      break
    fi
  done
done

if [ -z "$URL" ]; then
  echo ""
  echo "  ERROR: Could not get tunnel URL after 3 attempts."
  echo "  Last log:"
  tail -10 "$TUNNEL_LOG"
  kill $DJANGO_PID 2>/dev/null
  exit 1
fi

echo "       Tunnel active   →  $URL"

# ── 4. Update TUNNEL_BASE_URL in lib/api.ts ──────────────────────────────────
sed -i "s|const TUNNEL_BASE_URL = '[^']*';|const TUNNEL_BASE_URL = '${URL}/api';|g" "$API_TS"
echo "       lib/api.ts updated  → ${URL}/api  ✓"

# ── 5. Signal ready for Windows launcher ─────────────
echo "$URL" > "$READY_FLAG"

# ── 6. Start watchdog (restarts services if they die) ─
echo "Starting watchdog..."
nohup bash "$APP_DIR/watchdog.sh" > /dev/null 2>&1 &
disown
echo "       Watchdog running  (log: /tmp/sqms_watchdog.log)"

echo ""
echo "================================================"
echo "  Django   :  http://127.0.0.1:8000"
echo "  App URL  :  ${URL}/api  ← phone uses this"
echo "  Watchdog :  monitoring every 30s"
echo "  Status   :  EVERYTHING IS RUNNING"
echo "================================================"
echo ""
echo "  Press Ctrl+C to stop everything"
echo ""

cleanup() {
  echo ""
  echo "Stopping services..."
  kill $DJANGO_PID $TUNNEL_PID 2>/dev/null
  rm -f "$READY_FLAG"
  echo "Done."
  exit 0
}
trap cleanup INT TERM

wait
