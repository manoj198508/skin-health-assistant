# Secure Cloud Deployment (Student Demo)

This guide publishes your app with an HTTPS cloud link using:

- **Frontend**: Vercel (React/Vite)
- **Backend API**: Render (FastAPI)
- **AI provider**: OpenAI-compatible API (instead of local Ollama)

> This is an educational app. Keep all medical disclaimers visible in the UI.

---

## 1) Prepare environment variables

### Backend (`Render`)

Use `backend/.env.example` as reference and set these in Render:

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY=...` (required)
- `OPENAI_BASE_URL=` (optional for OpenAI-compatible providers)
- `OPENAI_TEXT_MODEL=gpt-4o-mini`
- `OPENAI_VISION_MODEL=gpt-4o-mini`
- `CORS_ORIGINS=https://<your-frontend>.vercel.app`
- `IMAGE_TTL_HOURS=24`
- `MAX_IMAGE_MB=8`

### Frontend (`Vercel`)

Set:

- `VITE_API_BASE_URL=https://<your-backend>.onrender.com`

---

## 2) Deploy backend to Render

1. Push this repository to GitHub.
2. In Render, create **New Web Service** from this repo.
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables listed above.
7. Deploy and verify:
   - `https://<your-backend>.onrender.com/health` returns `{ "status": "ok" }`

You can also use the included `render.yaml` blueprint.

---

## 3) Deploy frontend to Vercel

1. Import repo into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework preset: `Vite`.
4. Add `VITE_API_BASE_URL` env var to your Render backend URL.
5. Deploy.

The included `frontend/vercel.json` adds SPA route rewrites and basic security headers.

---

## 4) Security checklist (must-do)

- Keep `OPENAI_API_KEY` only in backend env vars.
- Keep uploaded images private and short-lived (`IMAGE_TTL_HOURS`).
- Restrict upload types and file size (already enforced in backend).
- Set exact `CORS_ORIGINS` (never `*` in cloud).
- Add API rate limiting (recommended next enhancement).
- Keep medical safety wording in every image assessment response.

---

## 5) Important limitation

`start.sh` / `start-public.sh` are for local Ollama use. Cloud deployments should use `AI_PROVIDER=openai` unless you are hosting your own GPU-backed Ollama service.

---

## 6) Quick verification flow

1. Open frontend cloud URL.
2. Create a chat question.
3. Upload a JPG/PNG/WEBP image under max size.
4. Confirm analysis is hedged (non-diagnostic wording).
5. Ask follow-up question in same photo conversation.
