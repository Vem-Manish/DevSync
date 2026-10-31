import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

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


@router.post("/token", response_model=AuthSessionResponse)
async def exchange_token(code: str = Query(..., description="Temporary code returned from GitHub authorization")):
    """
    Exchanges temporary GitHub authorization code for an OAuth access token,
    then retrieves user details from the GitHub API.
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth credentials not configured in backend environment."
        )

    # 1. Exchange temporary code for access token
    token_url = "https://github.com/login/oauth/access_token"
    token_payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI,
    }
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, json=token_payload, headers=headers)
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code.")

        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            error_desc = token_data.get("error_description", "Invalid authorization code.")
            raise HTTPException(status_code=400, detail=error_desc)

        # 2. Fetch authenticated user profile
        user_url = "https://api.github.com/user"
        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        }
        user_res = await client.get(user_url, headers=auth_headers)
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user profile from GitHub.")

        user_info = user_res.json()
        profile = UserProfile(
            username=user_info.get("login"),
            avatar_url=user_info.get("avatar_url"),
            name=user_info.get("name"),
            email=user_info.get("email"),
        )

        return AuthSessionResponse(
            authenticated=True,
            user=profile,
            access_token=access_token
        )