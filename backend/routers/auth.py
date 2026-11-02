import os
import base64
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

load_dotenv()

router = APIRouter()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "https://devsync-seven.vercel.app/api/auth/callback")

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
    return {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "auth_url": f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={GITHUB_REDIRECT_URI}&scope=repo,user"
    }

@router.get("/callback")
async def github_callback(code: str = Query(...)):
    """Passes authorization code back to frontend to complete session provisioning."""
    return RedirectResponse(url=f"/?code={code}")

@router.post("/token", response_model=AuthSessionResponse)
async def exchange_token(code: str = Query(...)):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth credentials not configured.")

    token_url = "https://github.com/login/oauth/access_token"
    token_payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI,
    }
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        token_response = await client.post(token_url, json=token_payload, headers=headers)
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code.")

        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "Invalid code."))

        user_res = await client.get("https://api.github.com/user", headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        })
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user profile.")

        u = user_res.json()
        return AuthSessionResponse(
            authenticated=True,
            user=UserProfile(
                username=u.get("login"),
                avatar_url=u.get("avatar_url"),
                name=u.get("name"),
                email=u.get("email")
            ),
            access_token=access_token
        )

@router.get("/projects")
async def get_user_projects(authorization: Optional[str] = Header(None)):
    """Fetches user repositories and identifies DevSync workspaces."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        u_res = await client.get("https://api.github.com/user", headers=headers)
        if u_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Unauthorized")
        current_username = u_res.json()["login"]

        repos_res = await client.get("https://api.github.com/user/repos?sort=updated&per_page=30", headers=headers)
        if repos_res.status_code != 200:
            raise HTTPException(status_code=repos_res.status_code, detail="Failed to fetch repos.")

        repos = repos_res.json()
        projects = []

        for r in repos:
            full_name = r["full_name"]
            cfg_res = await client.get(
                f"https://api.github.com/repos/{full_name}/contents/.devsync.json",
                headers=headers
            )
            if cfg_res.status_code == 200:
                try:
                    raw_content = cfg_res.json().get("content", "")
                    decoded = base64.b64decode(raw_content).decode("utf-8")
                    devsync_config = json.loads(decoded)
                except Exception:
                    devsync_config = {}

                lead_username = devsync_config.get("lead", r["owner"]["login"])
                is_lead = (current_username.lower() == lead_username.lower())
                user_role_info = devsync_config.get("members", {}).get(current_username, {})

                assigned_branch = "all" if is_lead else user_role_info.get("branch", "")
                assigned_role = "Lead Architect" if is_lead else user_role_info.get("role", "Collaborator")

                projects.append({
                    "id": r["id"],
                    "name": r["name"],
                    "full_name": full_name,
                    "description": r.get("description") or "DevSync Collaborative Workspace",
                    "html_url": r["html_url"],
                    "is_lead": is_lead,
                    "lead_username": lead_username,
                    "assigned_branch": assigned_branch,
                    "assigned_role": assigned_role,
                    "default_branch": r.get("default_branch", "main"),
                    "members": devsync_config.get("members", {})
                })

        return {"projects": projects, "current_user": current_username}

@router.get("/invitations")
async def get_user_invitations(authorization: Optional[str] = Header(None)):
    """Fetches pending repository invitations for the logged-in user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get("https://api.github.com/user/repository_invitations", headers=headers)
        if res.status_code != 200:
            return {"invitations": []}
        return {"invitations": res.json()}

@router.patch("/invitations/{invitation_id}/accept")
async def accept_invitation(invitation_id: int, authorization: Optional[str] = Header(None)):
    """Accepts a pending repository invite directly."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"https://api.github.com/user/repository_invitations/{invitation_id}",
            headers=headers
        )
        if res.status_code not in (204, 200):
            raise HTTPException(status_code=res.status_code, detail=f"Failed to accept invite: {res.text}")
        return {"status": "success", "message": "Invitation accepted"}
