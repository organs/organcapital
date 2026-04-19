from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import cash, assets, needs, chat

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Organ Capital Treasury API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cash.router)
app.include_router(assets.router)
app.include_router(needs.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {"firm": "Organ Capital", "service": "Treasury Management API", "version": "1.0.0"}
