from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import projects, modules, rules
from app.dependencies import get_db

app = FastAPI(title="ERP Backend", version="0.1.0")

# CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(modules.router, prefix="/modules", tags=["Modules"])
app.include_router(rules.router, prefix="/rules", tags=["Rules"])

# Root endpoint
@app.get("/")
async def root():
    return {"message": "ERP FastAPI backend is running"}
