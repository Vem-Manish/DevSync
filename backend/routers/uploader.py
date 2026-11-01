import fnmatch
import json
import base64
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header
import httpx

router = APIRouter()

class DirectCommitPayload(BaseModel):
    repo_name: str
    branch_name: str
    file_path: str
    content_base64: str
    commit_message: str = "feat(dropzone): upload file via DevSync Mission Dropzone"

class CommitResultResponse(BaseModel):
    status: str
    file_path: str
    branch: str
    commit_sha: str
    commit_url: str

def check_file_ownership(file_path: str, allowed_paths: list) -> bool:
    if not allowed_paths:
        return True
    for pattern in allowed_paths:
        if fnmatch.fnmatch(file_path, pattern) or file_path.startswith(pattern.rstrip("*")):
            return True
    return False

@router.post("/commit-file", response_model=CommitResultResponse)
async def commit_file_to_branch(payload: DirectCommitPayload, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Valid GitHub Bearer authorization token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        u_res = await client.get("https://api.github.com/user", headers=headers)
        if u_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Could not resolve user profile.")
        current_user = u_res.json()["login"]

        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            repo_full = f"{current_user}/{repo_full}"

        # Guardrail & Branch Ownership Check
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
                            detail=f"Branch Locked: You are restricted to your assigned branch '{assigned}'."
                        )

                    allowed = member_info.get("assigned_files", [])
                    if not check_file_ownership(payload.file_path, allowed):
                        raise HTTPException(
                            status_code=403,
                            detail=f"File Boundary Violation: Path '{payload.file_path}' is outside your authorized ownership boundary ({allowed})."
                        )
            except HTTPException:
                raise
            except Exception:
                pass

        get_file_url = f"https://api.github.com/repos/{repo_full}/contents/{payload.file_path}?ref={payload.branch_name}"
        existing_sha = None
        check_res = await client.get(get_file_url, headers=headers)
        if check_res.status_code == 200:
            existing_sha = check_res.json().get("sha")

        put_file_url = f"https://api.github.com/repos/{repo_full}/contents/{payload.file_path}"
        body = {
            "message": payload.commit_message,
            "content": payload.content_base64,
            "branch": payload.branch_name
        }
        if existing_sha:
            body["sha"] = existing_sha

        put_res = await client.put(put_file_url, headers=headers, json=body)
        if put_res.status_code not in (200, 201):
            raise HTTPException(status_code=put_res.status_code, detail=f"Commit failed: {put_res.text}")

        res_data = put_res.json()
        commit_info = res_data.get("commit", {})

        return CommitResultResponse(
            status="success",
            file_path=payload.file_path,
            branch=payload.branch_name,
            commit_sha=commit_info.get("sha", ""),
            commit_url=commit_info.get("html_url", "")
        )