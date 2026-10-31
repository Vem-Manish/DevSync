import os
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Environment Credentials
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/callback")

# --- Schemas ---
class UserProfile(BaseModel):
    username: str
    avatar_url: str
    name: Optional[str] = None
    email: Optional[str] = None

class AuthSessionResponse(BaseModel):
    authenticated: bool
    user: Optional[UserProfile] = None
    access_token: Optional[str] = None

@router.get("/config")
def get_auth_config():
    """Exposes only public client identifiers needed by the frontend."""
    return {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "auth_url": f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo,user"
    }