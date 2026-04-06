from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from .routers.tasks import router as task_router
from .routers.users import router as user_router
from .routers.auth import router as auth_router
from .routers.twofa import router as twofa_router
from .models import Base
from .database import engine
from fastapi.middleware.cors import CORSMiddleware
from .middlewares.log_middleware import MyAdvancedMiddleware

origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",      # VS Code Live Server
    "http://127.0.0.1:5500",      # VS Code Live Server
    "http://localhost:8080",      # Python http.server
    "http://127.0.0.1:8080",      # Python http.server
]


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
app.add_middleware(MyAdvancedMiddleware)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app.include_router(task_router)
app.include_router(user_router)
app.include_router(auth_router)
app.include_router(twofa_router)