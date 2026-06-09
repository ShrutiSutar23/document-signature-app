from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth

# Create all tables in database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Document Signature App", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "Document Signature API is running ✅"}