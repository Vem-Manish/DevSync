import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Ensure the root project directory ('DevSync') and 'backend' are in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "backend"))

load_dotenv(BASE_DIR / ".env")

# Import all routers using relative path safety
try:
    from backend.routers import auth, provisioner, uploader, editor, resolver
except ModuleNotFoundError:
    from routers import auth, provisioner, uploader, editor, resolver

app = FastAPI(
    title="DevSync — Collaborative Engineering Suite",
    description="Backend API orchestration engine for DevSync",
    version="1.0.0"
)

# Register All 5 Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(provisioner.router, prefix="/api/provision", tags=["Provisioner"])
app.include_router(uploader.router, prefix="/api/uploader", tags=["Dropzone"])
app.include_router(editor.router, prefix="/api/editor", tags=["Studio Editor"])
app.include_router(resolver.router, prefix="/api/resolver", tags=["Conflict Resolver"])

# Mount static assets
frontend_dir = BASE_DIR / "frontend"
app.mount("/css", StaticFiles(directory=str(frontend_dir / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(frontend_dir / "js")), name="js")
if (frontend_dir / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")

@app.get("/")
async def serve_index():
    return FileResponse(str(frontend_dir / "index.html"))

if __name__ == "__main__":
    import uvicorn
    # Use direct app object reference with reload_dirs to bypass module resolution issues on Windows
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, app_dir=str(BASE_DIR / "backend"))