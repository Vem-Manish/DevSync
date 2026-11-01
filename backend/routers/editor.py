import fnmatch
import base64
import json
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header, Query
import httpx

router = APIRouter()

class FileContentRequest(BaseModel):
    repo_name: str
    branch_name: str
    file_path: str

class FileContentResponse(BaseModel):
    file_path: str
    branch: str
    content: str
    sha: str
    read_only: bool

class FileSaveRequest(BaseModel):
    repo_name: str
    branch_name: str
    file_path: str
    content: str
    sha: str
    commit_message: Optional[str] = "refactor: update code via DevSync Studio Editor"

class FileSaveResponse(BaseModel):
    status: str
    commit_sha: str
    commit_url: str

def check_file_ownership(file_path: str, allowed_paths: list) -> bool:
    if not allowed_paths:
        return True
    for pattern in allowed_paths:
        if fnmatch.fnmatch(file_path, pattern) or file_path.startswith(pattern.rstrip("*")):
            return True
    return False

@router.get("/tree")
async def get_branch_tree(
    repo_name: str = Query(...),
    branch_name: str = Query(...),
    authorization: Optional[str] = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        tree_url = f"https://api.github.com/repos/{repo_full}/git/trees/{branch_name}?recursive=1"
        res = await client.get(tree_url, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=f"Failed to fetch tree: {res.text}")

        items = res.json().get("tree", [])
        files = [i["path"] for i in items if i.get("type") == "blob"]
        return {"files": files, "branch": branch_name}

@router.post("/content", response_model=FileContentResponse)
async def get_file_content(payload: FileContentRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        u_res = await client.get("https://api.github.com/user", headers=headers)
        current_user = u_res.json()["login"]

        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            repo_full = f"{current_user}/{repo_full}"

        url = f"https://api.github.com/repos/{repo_full}/contents/{payload.file_path}?ref={payload.branch_name}"
        res = await client.get(url, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="File not found.")

        data = res.json()
        raw_b64 = data.get("content", "").replace("\n", "")
        decoded = base64.b64decode(raw_b64).decode("utf-8", errors="replace")

        read_only = False
        cfg_res = await client.get(f"https://api.github.com/repos/{repo_full}/contents/.devsync.json", headers=headers)
        if cfg_res.status_code == 200:
            try:
                cfg = json.loads(base64.b64decode(cfg_res.json()["content"]).decode("utf-8"))
                lead = cfg.get("lead", "")
                if current_user.lower() != lead.lower():
                    member_info = cfg.get("members", {}).get(current_user, {})
                    assigned = member_info.get("branch")
                    if payload.branch_name != assigned:
                        read_only = True
                    elif not check_file_ownership(payload.file_path, member_info.get("assigned_files", [])):
                        read_only = True
            except Exception:
                pass

        return FileContentResponse(
            file_path=payload.file_path,
            branch=payload.branch_name,
            content=decoded,
            sha=data.get("sha", ""),
            read_only=read_only
        )

@router.post("/save", response_model=FileSaveResponse)
async def save_file_content(payload: FileSaveRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        u_res = await client.get("https://api.github.com/user", headers=headers)
        current_user = u_res.json()["login"]

        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            repo_full = f"{current_user}/{repo_full}"

        cfg_res = await client.get(f"https://api.github.com/repos/{repo_full}/contents/.devsync.json", headers=headers)
        if cfg_res.status_code == 200:
            try:
                cfg = json.loads(base64.b64decode(cfg_res.json()["content"]).decode("utf-8"))
                lead = cfg.get("lead", "")
                if current_user.lower() != lead.lower():
                    member_info = cfg.get("members", {}).get(current_user, {})
                    assigned = member_info.get("branch")
                    if payload.branch_name != assigned:
                        raise HTTPException(
                            status_code=403,
                            detail=f"Read-Only: You can only save modifications to your assigned branch '{assigned}'."
                        )
                    allowed = member_info.get("assigned_files", [])
                    if not check_file_ownership(payload.file_path, allowed):
                        raise HTTPException(
                            status_code=403,
                            detail=f"File Boundary Violation: '{payload.file_path}' is outside your authorized file path boundary."
                        )
            except HTTPException:
                raise
            except Exception:
                pass

        url = f"https://api.github.com/repos/{repo_full}/contents/{payload.file_path}"
        encoded_content = base64.b64encode(payload.content.encode("utf-8")).decode("utf-8")

        body = {
            "message": payload.commit_message,
            "content": encoded_content,
            "sha": payload.sha,
            "branch": payload.branch_name
        }

        res = await client.put(url, headers=headers, json=body)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail=f"Save failed: {res.text}")

        c_info = res.json().get("commit", {})
        return FileSaveResponse(
            status="success",
            commit_sha=c_info.get("sha", ""),
            commit_url=c_info.get("html_url", "")
        )