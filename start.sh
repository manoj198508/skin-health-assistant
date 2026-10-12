#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
TEXT_MODEL="llama3.2:latest"
VISION_MODEL="qwen2.5vl:7b"

echo "== Skin Health Assistant =="

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

# 2. Backend
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

echo "Starting backend on http://localhost:8000 ..."
nohup uvicorn app.main:app --port 8000 > /tmp/skin_health_backend.log 2>&1 &
BACKEND_PID=$!

for i in $(seq 1 30); do
  curl -s http://localhost:8000/health >/dev/null 2>&1 && break
  sleep 1
done

# 3. Frontend
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies (first run only)..."
  npm install
fi
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "Starting frontend on http://localhost:5173 ..."
npm run dev > /tmp/skin_health_frontend.log 2>&1 &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "Stopping servers..."
  # npm run dev backgrounds the npm wrapper, not the Vite server it spawns,
  # so killing by port is what actually frees both.
  lsof -ti:8000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
  lsof -ti:5173 -sTCP:LISTEN | xargs kill 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

for i in $(seq 1 30); do
  curl -s http://localhost:5173 >/dev/null 2>&1 && break
  sleep 1
done
open http://localhost:5173 2>/dev/null || true

echo ""
echo "Running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Backend log:  /tmp/skin_health_backend.log"
echo "  Frontend log: /tmp/skin_health_frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers."

wait
