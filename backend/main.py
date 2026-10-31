import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DevSync — Collaborative Git Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Placeholder router includes (uncomment as teammates finish PRs)
# from backend.routers import auth, provisioner, uploader, editor, resolver
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(provisioner.router, prefix="/api/provision", tags=["Provisioner"])
# app.include_router(uploader.router, prefix="/api/uploader", tags=["Uploader"])
# app.include_router(editor.router, prefix="/api/editor", tags=["Editor"])
# app.include_router(resolver.router, prefix="/api/resolver", tags=["Resolver"])

@app.get("/api/health")
def health_check():
    return {"status": "online", "project": "DevSync", "version": "1.0.0"}

# Serve frontend static assets
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)