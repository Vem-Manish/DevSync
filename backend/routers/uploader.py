from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter

router = APIRouter()

class DirectCommitPayload(BaseModel):
    repo_name: str = Field(..., description="Target repository name (owner/repo or repo)")
    branch_name: str = Field(..., description="Target feature branch to commit into")
    file_path: str = Field(..., description="Destination file path within repo, e.g. 'src/utils.py'")
    content_base64: str = Field(..., description="Base64 encoded string of the file content")
    commit_message: str = Field(default="feat(dropzone): upload file via DevSync Mission Dropzone")

class CommitResultResponse(BaseModel):
    status: str
    file_path: str
    branch: str
    commit_sha: str
    commit_url: str

from fastapi import HTTPException, Header
import httpx

@router.post("/commit-file", response_model=CommitResultResponse)
async def commit_file_to_branch(
    payload: DirectCommitPayload,
    authorization: Optional[str] = Header(None, description="GitHub OAuth Bearer Token")
):
    """
    Directly writes or updates a file on a targeted feature branch via GitHub Contents API.
    Does not require local git checkout or local cloning.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Valid GitHub Bearer authorization token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Resolve owner if only repo name was supplied
        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            if u_res.status_code != 200:
                raise HTTPException(status_code=401, detail="Could not resolve authenticated GitHub user.")
            owner = u_res.json()["login"]
            repo_full = f"{owner}/{repo_full}"

        # 2. Check if file already exists on this branch to fetch its blob SHA
        get_file_url = f"https://api.github.com/repos/{repo_full}/contents/{payload.file_path}?ref={payload.branch_name}"
        existing_sha = None
        check_res = await client.get(get_file_url, headers=headers)
        if check_res.status_code == 200:
            existing_sha = check_res.json().get("sha")

        # 3. Create or update file on target branch
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
            raise HTTPException(status_code=put_res.status_code, detail=f"GitHub API Error: {put_res.text}")

        res_data = put_res.json()
        commit_info = res_data.get("commit", {})

        return CommitResultResponse(
            status="success",
            file_path=payload.file_path,
            branch=payload.branch_name,
            commit_sha=commit_info.get("sha", ""),
            commit_url=commit_info.get("html_url", "")
        )
