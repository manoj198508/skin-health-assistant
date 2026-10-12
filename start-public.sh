#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
TEXT_MODEL="llama3.2:latest"
VISION_MODEL="qwen2.5vl:7b"
BACKEND_PORT=8000
FRONTEND_PORT=5173

echo "== Skin Health Assistant (public / static-IP mode) =="
echo ""
echo "WARNING: this exposes the app to your whole local network, and to the internet"
echo "once you forward the ports below on your router. There is no login and no rate"
echo "limiting - anyone who reaches it can chat, upload photos, and use your Ollama"
echo "models. Only run this while you're actively sharing it, and stop it (Ctrl+C)"
echo "when you're done."
echo ""

# 1. Ollama
if ! curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
  echo "Starting Ollama..."
  nohup ollama serve > /tmp/skin_health_ollama.log 2>&1 &
  for i in $(seq 1 15); do
    curl -s http://localhost:11434/api/version >/dev/null 2>&1 && break
    sleep 1
  done
fi

for model in "$TEXT_MODEL" "$VISION_MODEL"; do
  if ! ollama list | grep -q "$model"; then
    echo "Pulling missing model $model (one-time, may take a while)..."
    ollama pull "$model"
  fi
done

# 2. Backend - bind to 0.0.0.0 so it's reachable beyond localhost, and open CORS since
# we don't know in advance which origin (LAN IP / public IP / localhost) will load the page.
cd "$BACKEND_DIR"
if [ ! -d venv ]; then
  echo "Creating backend virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi
if grep -q '^CORS_ORIGINS=' .env; then
  sed -i '' 's/^CORS_ORIGINS=.*/CORS_ORIGINS=*/' .env
else
  echo 'CORS_ORIGINS=*' >> .env
fi

echo "Starting backend on 0.0.0.0:$BACKEND_PORT ..."
nohup uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" > /tmp/skin_health_backend.log 2>&1 &

for i in $(seq 1 30); do
  curl -s http://localhost:$BACKEND_PORT/health >/dev/null 2>&1 && break
  sleep 1
done

# 3. Frontend - production build (not the dev server), served as static files bound to
# 0.0.0.0. No VITE_API_BASE_URL is set, so the built app auto-detects the backend at
# whatever host it was loaded from, on port 8000 - see src/api/client.ts.
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies (first run only)..."
  npm install
fi

echo "Building frontend for production..."
npm run build

echo "Serving frontend on 0.0.0.0:$FRONTEND_PORT ..."
# Plain `python3 -m http.server` 404s on a direct load/refresh of a client-side route
# (/chat, /photo, /chat/:id, ...) since those aren't real files on disk. serve-spa.py falls
# back to index.html for any path that isn't a real file, like a real SPA host would.
nohup python3 serve-spa.py "$FRONTEND_PORT" dist > /tmp/skin_health_frontend.log 2>&1 &

cleanup() {
  echo ""
  echo "Stopping servers..."
  lsof -ti:$BACKEND_PORT -sTCP:LISTEN | xargs kill 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT -sTCP:LISTEN | xargs kill 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

for i in $(seq 1 30); do
  curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1 && break
  sleep 1
done

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")"
PUBLIC_IP="$(curl -s --max-time 5 https://api.ipify.org || echo "unknown")"

echo ""
echo "Running locally:"
echo "  http://localhost:$FRONTEND_PORT"
echo ""
echo "Reachable from other devices on your Wi-Fi/LAN right now:"
echo "  http://$LAN_IP:$FRONTEND_PORT"
echo ""
echo "To make it reachable from the internet on your static IP ($PUBLIC_IP):"
echo "  1. Log into your router's admin page (often http://192.168.1.1 or http://192.168.0.1)."
echo "  2. Forward external TCP port $FRONTEND_PORT -> $LAN_IP:$FRONTEND_PORT"
echo "  3. Forward external TCP port $BACKEND_PORT  -> $LAN_IP:$BACKEND_PORT"
echo "  4. Share this with colleagues: http://$PUBLIC_IP:$FRONTEND_PORT"
echo ""
echo "If macOS asks whether 'python3' or a terminal app can accept incoming connections,"
echo "click Allow, or this won't be reachable from other devices."
echo ""
echo "Backend log:  /tmp/skin_health_backend.log"
echo "Frontend log: /tmp/skin_health_frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers."

wait
