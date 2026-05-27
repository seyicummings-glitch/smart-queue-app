#!/bin/bash
# watchdog.sh — Keeps Django + Cloudflare tunnel alive automatically.
# Uses PowerShell for process checks/kills (works on Windows) and
# curl with full path for Django health check.

APP_DIR="/c/Users/hp/Downloads/Queue Management System (Copy)/SmartQueueApp"
LOCK_FILE="/tmp/sqms_watchdog.pid"
LOG_FILE="/tmp/sqms_watchdog.log"
CURL="/mingw64/bin/curl"
CHECK_INTERVAL=30      # seconds between health checks
RESTART_COOLDOWN=120   # seconds to wait after a restart

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ── Prevent duplicate instances ───────────────────────────────────────────────
# Use PowerShell to check if our previous watchdog PID is still a bash process
if [ -f "$LOCK_FILE" ]; then
  old_pid=$(cat "$LOCK_FILE" 2>/dev/null)
  if [ -n "$old_pid" ]; then
    still_running=$(powershell.exe -Command \
      "if (Get-Process -Id $old_pid -ErrorAction SilentlyContinue) { 'yes' } else { 'no' }" \
      2>/dev/null | tr -d '\r\n')
    if [ "$still_running" = "yes" ]; then
      exit 0   # already running
    fi
  fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' INT TERM EXIT

log "=========================================="
log "  SQMS Watchdog started  (PID $$)"
log "  Checks every ${CHECK_INTERVAL}s"
log "=========================================="

# ── Health checks ─────────────────────────────────────────────────────────────

is_django_up() {
  # Any HTTP response (even 404) means Django is alive
  local code
  code=$("$CURL" -s --connect-timeout 4 --max-time 6 \
    -o /dev/null -w "%{http_code}" \
    http://127.0.0.1:8000/ 2>/dev/null)
  [ -n "$code" ] && [ "$code" != "000" ]
}

is_tunnel_up() {
  local result
  result=$(powershell.exe -Command \
    "if (Get-Process cloudflared -ErrorAction SilentlyContinue) { 'yes' } else { 'no' }" \
    2>/dev/null | tr -d '\r\n')
  [ "$result" = "yes" ]
}

# ── Kill services using PowerShell (works on Windows) ────────────────────────
kill_services() {
  powershell.exe -Command \
    "Stop-Process -Name python,cloudflared -Force -ErrorAction SilentlyContinue" \
    2>/dev/null
}

# ── Restart both services ─────────────────────────────────────────────────────
restart_all() {
  log ">>> RESTARTING: $1"
  kill_services
  sleep 2
  cd "$APP_DIR" || { log "ERROR: cannot cd to APP_DIR"; return; }
  nohup bash start-dev.sh > /tmp/sqms_restart.log 2>&1 &
  log ">>> start-dev.sh launched (PID $!) — cooling down ${RESTART_COOLDOWN}s..."
  sleep "$RESTART_COOLDOWN"
  log ">>> Cooldown done. Resuming health checks."
}

# ── Main loop ─────────────────────────────────────────────────────────────────
while true; do
  sleep "$CHECK_INTERVAL"

  reason=""
  is_django_up || reason="Django is DOWN"
  is_tunnel_up || reason="${reason:+$reason + }Tunnel is DOWN"

  if [ -n "$reason" ]; then
    log "PROBLEM DETECTED — $reason"
    restart_all "$reason"
  fi
done
