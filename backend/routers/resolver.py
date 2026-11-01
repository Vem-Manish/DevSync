from fastapi import HTTPException, Header, Query
import httpx

@router.post("/create-pr", response_model=PRSummaryResponse)
async def create_pull_request(payload: CreatePRRequest, authorization: Optional[str] = Header(None)):
    """Automates GitHub PR generation from an isolated feature branch into main."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        url = f"https://api.github.com/repos/{repo_full}/pulls"
        body = {
            "title": payload.title,
            "head": payload.head_branch,
            "base": payload.base_branch,
            "body": payload.body
        }

        res = await client.post(url, headers=headers, json=body)
        if res.status_code == 422:
            raise HTTPException(status_code=422, detail="A Pull Request already exists for this branch or no diff found.")
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=res.status_code, detail=f"Failed to create PR: {res.text}")

        data = res.json()
        return PRSummaryResponse(
            pr_number=data["number"],
            title=data["title"],
            html_url=data["html_url"],
            state=data["state"],
            head_branch=payload.head_branch,
            base_branch=payload.base_branch,
            mergeable=data.get("mergeable")
        )

@router.get("/status")
async def get_pr_status(repo_name: str = Query(...), pr_number: int = Query(...), authorization: Optional[str] = Header(None)):
    """Checks whether a PR has conflicts or is cleanly mergeable."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        url = f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}"
        res = await client.get(url, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="PR not found")

        data = res.json()
        return {
            "pr_number": data["number"],
            "mergeable": data.get("mergeable"),
            "mergeable_state": data.get("mergeable_state"),
            "additions": data.get("additions", 0),
            "deletions": data.get("deletions", 0),
            "changed_files": data.get("changed_files", 0)
        }

@router.put("/merge")
async def merge_pull_request(payload: MergePRRequest, authorization: Optional[str] = Header(None)):
    """Executes 1-click merge into main upon clean verification."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        url = f"https://api.github.com/repos/{repo_full}/pulls/{payload.pr_number}/merge"
        res = await client.put(url, headers=headers, json={"commit_title": payload.commit_title, "merge_method": "merge"})
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=f"Merge failed: {res.text}")

        return {"status": "merged", "data": res.json()}
