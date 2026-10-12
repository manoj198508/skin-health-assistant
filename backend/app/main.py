import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.routers import auth, conversations, messages, photo
from app.tasks.cleanup import purge_expired_images

Base.metadata.create_all(bind=engine)

CLEANUP_INTERVAL_SECONDS = 3600


async def _periodic_cleanup() -> None:
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        db = SessionLocal()
        try:
            purge_expired_images(db)
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_periodic_cleanup())
    yield
    task.cancel()


app = FastAPI(title="Skin Health Assistant API", lifespan=lifespan)

_cors_origins = settings.cors_origins_list
_allow_all_origins = _cors_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # The app uses no cookies/sessions, so allowing credentials brings no benefit and
    # is incompatible with a wildcard origin anyway - only enable it for specific origins.
    allow_credentials=not _allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(photo.router)


@app.get("/health")
def health():
    return {"status": "ok"}
