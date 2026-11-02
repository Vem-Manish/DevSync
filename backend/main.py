import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

# Base directory paths
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

# Ensure both project root and backend are on sys.path for local runs and Vercel execution
for path in (BASE_DIR, BACKEND_DIR):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

# Load environment variables if .env exists
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Import all routers with fallback support for both pathing models
try:
    from backend.routers import auth, provisioner, uploader, editor, resolver
except ModuleNotFoundError:
    from routers import auth, provisioner, uploader, editor, resolver

app = FastAPI(
    title="DevSync — Collaborative Engineering Suite",
    description="Backend API orchestration engine for DevSync",
    version="1.0.0"
)

# Register all 5 routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(provisioner.router, prefix="/api/provision", tags=["Provisioner"])
app.include_router(uploader.router, prefix="/api/uploader", tags=["Dropzone"])
app.include_router(editor.router, prefix="/api/editor", tags=["Studio Editor"])
app.include_router(resolver.router, prefix="/api/resolver", tags=["Conflict Resolver"])

# Mount frontend static directories only when they physically exist (local development)
frontend_dir = BASE_DIR / "frontend"

if frontend_dir.exists():
    css_dir = frontend_dir / "css"
    if css_dir.exists():
        app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")

    js_dir = frontend_dir / "js"
    if js_dir.exists():
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")

    assets_dir = frontend_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_index():
        index_file = frontend_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse({"status": "DevSync API online", "service": "backend"})
else:
    # On Vercel, the frontend service serves index.html; backend returns service status
    @app.get("/")
    async def api_health():
        return JSONResponse({"status": "DevSync API online", "service": "backend"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, app_dir=str(BACKEND_DIR))
