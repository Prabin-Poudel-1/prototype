#!/bin/bash
# Double-click this file in Finder to start the frontend on macOS.
cd "$(dirname "$0")/frontend" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fail() { printf '\n%s\n' "$1"; read -r -p "Press Enter to close..."; exit 1; }
command -v npm >/dev/null 2>&1 || fail "Node.js/npm was not found. Install Node.js, then try again."
if [ ! -d node_modules ]; then
  fail "Dependencies are missing. Ask your team to complete the setup in README.md first."
fi
port=5173
while /usr/sbin/lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
  port=$((port + 1))
  [ "$port" -le 5190 ] || fail "No free preview port between 5173 and 5190. Close an old preview and retry."
done
url="http://127.0.0.1:$port"
printf '\nStarting Bharatpur Pulse at %s\nKeep this window open. Press Control+C to stop.\nStart PulseApplication in IntelliJ for backend features.\n\n' "$url"
npm run dev -- --port "$port" &
frontend_pid=$!
cleanup() {
  kill "$frontend_pid" 2>/dev/null
  if [ -n "${browser_wait_pid:-}" ]; then kill "$browser_wait_pid" 2>/dev/null; fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM
(
  for attempt in {1..60}; do
    kill -0 "$frontend_pid" 2>/dev/null || exit
    if /usr/bin/curl --noproxy '*' --silent --fail --max-time 1 "$url" >/dev/null 2>&1; then
      /usr/bin/open "$url"
      exit
    fi
    sleep 1
  done
) &
browser_wait_pid=$!
wait "$frontend_pid"
result=$?
[ "$result" -eq 0 ] || fail "Frontend stopped with an error. Check the messages above."
