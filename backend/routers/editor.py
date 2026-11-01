import base64
from fastapi import HTTPException, Header, Query
import httpx

@router.get("/tree")
async def get_branch_tree(
    repo_name: str = Query(...),
    branch_name: str = Query(...),
    authorization: Optional[str] = Header(None)
):
    """Recursively fetches the file tree for the specified branch."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Resolve owner
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            if u_res.status_code != 200:
                raise HTTPException(status_code=401, detail="Unauthorized")
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        # Fetch git tree
        tree_url = f"https://api.github.com/repos/{repo_full}/git/trees/{branch_name}?recursive=1"
        res = await client.get(tree_url, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=f"Failed to fetch tree: {res.text}")

        items = res.json().get("tree", [])
        files = [i["path"] for i in items if i.get("type") == "blob"]
        return {"files": files, "branch": branch_name}

@router.post("/content", response_model=FileContentResponse)
async def get_file_content(payload: FileContentRequest, authorization: Optional[str] = Header(None)):
    """Fetches raw text content and blob SHA of a specific file."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        url = f"https://api.github.com/repos/{repo_full}/contents/{payload.file_path}?ref={payload.branch_name}"
        res = await client.get(url, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="File not found")

        data = res.json()
        raw_b64 = data.get("content", "").replace("\n", "")
        decoded = base64.b64decode(raw_b64).decode("utf-8", errors="replace")

        return FileContentResponse(
            file_path=payload.file_path,
            branch=payload.branch_name,
            content=decoded,
            sha=data.get("sha", "")
        )

@router.post("/save", response_model=FileSaveResponse)
async def save_file_content(payload: FileSaveRequest, authorization: Optional[str] = Header(None)):
    """Saves updated code directly into the target branch with an atomic commit."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

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
