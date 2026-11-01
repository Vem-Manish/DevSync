import base64
import json
import re
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header, Query
import httpx

router = APIRouter()


class CreatePRRequest(BaseModel):
    repo_name: str
    title: str
    head_branch: str
    base_branch: str = "main"
    body: Optional[str] = "Engineered with DevSync Collaborative Suite"


class PRSummaryResponse(BaseModel):
    pr_number: int
    title: str
    html_url: str
    state: str
    head_branch: str
    base_branch: str
    mergeable: Optional[bool] = None


class MergePRRequest(BaseModel):
    repo_name: str
    pr_number: int
    commit_title: Optional[str] = "Merge feature branch into main via DevSync Desk"


# ----------------- FEATURE 1: PRE-FLIGHT CODE & SECRET LINTER -----------------

@router.get("/preflight")
async def preflight_linter(
        repo_name: str = Query(...),
        branch_name: str = Query(...),
        authorization: Optional[str] = Header(None)
):
    """Audits a feature branch against 'main' for leaked keys and debug lines."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        comp_url = f"https://api.github.com/repos/{repo_full}/compare/main...{branch_name}"
        comp_res = await client.get(comp_url, headers=headers)
        if comp_res.status_code != 200:
            raise HTTPException(status_code=comp_res.status_code, detail="Failed to compare branch against main.")

        files = comp_res.json().get("files", [])
        secret_findings = []
        debug_findings = []

        secret_patterns = [
            (r'ghp_[A-Za-z0-9_]{36}', "GitHub Personal Token"),
            (r'sk-[A-Za-z0-9]{32,}', "OpenAI/API Secret Key"),
            (r'(?i)(client_secret|app_secret|password)\s*[:=]\s*["\'][^"\']+["\']', "Hardcoded Password/Secret")
        ]

        for f in files:
            patch = f.get("patch", "")
            filename = f.get("filename", "")

            # Check added lines
            for line in patch.split("\n"):
                if line.startswith("+") and not line.startswith("+++"):
                    for pat, name in secret_patterns:
                        if re.search(pat, line):
                            secret_findings.append({"file": filename, "type": name, "snippet": line[:60]})

                    if "console.log(" in line or "print(" in line:
                        debug_findings.append({"file": filename, "snippet": line.strip()[:60]})

        passed_security = len(secret_findings) == 0
        passed_cleanliness = len(debug_findings) == 0

        return {
            "branch": branch_name,
            "passed_security": passed_security,
            "passed_cleanliness": passed_cleanliness,
            "secret_findings": secret_findings,
            "debug_findings": debug_findings,
            "total_files": len(files)
        }


# ----------------- FEATURE 2: PLAIN ENGLISH DIFF EXPLAINER -----------------

@router.get("/diff-summary")
async def explain_diff(
        repo_name: str = Query(...),
        pr_number: int = Query(...),
        authorization: Optional[str] = Header(None)
):
    """Converts unified Git patches into plain-English changes for beginners."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        files_res = await client.get(f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}/files",
                                     headers=headers)
        if files_res.status_code != 200:
            raise HTTPException(status_code=files_res.status_code, detail="Could not read PR files.")

        files = files_res.json()
        explanations = []

        for f in files:
            fname = f.get("filename", "")
            status = f.get("status", "modified")
            adds = f.get("additions", 0)
            dels = f.get("deletions", 0)
            patch = f.get("patch", "")

            # Look for function definitions or updates
            funcs = re.findall(r'\+ *(?:def|function|async def|const|let) +([a-zA-Z0-9_]+)', patch)

            desc = ""
            if status == "added":
                desc = f"Brand new file created (+{adds} lines)."
            elif status == "removed":
                desc = f"File deleted (-{dels} lines)."
            else:
                if funcs:
                    desc = f"Modified existing logic (+{adds}/-{dels}) and introduced: {', '.join(funcs[:3])}."
                else:
                    desc = f"General updates and refactoring (+{adds} additions, -{dels} deletions)."

            explanations.append({
                "filename": fname,
                "status": status,
                "summary": desc
            })

        return {"pr_number": pr_number, "explanations": explanations}


# ----------------- FEATURE 3: GIT VISUALIZER GRAPH -----------------

@router.get("/branch-graph")
async def get_branch_graph(
        repo_name: str = Query(...),
        authorization: Optional[str] = Header(None)
):
    """Returns branches, recent commit counts, and lead status for visual plotting."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")

    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        # Fetch branches
        branches_res = await client.get(f"https://api.github.com/repos/{repo_full}/branches", headers=headers)
        if branches_res.status_code != 200:
            return {"nodes": []}

        branches = branches_res.json()
        nodes = []

        for b in branches:
            bname = b["name"]
            # Compare to main
            ahead = 0
            behind = 0
            if bname != "main":
                comp = await client.get(f"https://api.github.com/repos/{repo_full}/compare/main...{bname}",
                                        headers=headers)
                if comp.status_code == 200:
                    cdata = comp.json()
                    ahead = cdata.get("ahead_by", 0)
                    behind = cdata.get("behind_by", 0)

            nodes.append({
                "branch": bname,
                "is_main": bname == "main",
                "latest_commit_sha": b["commit"]["sha"][:7],
                "ahead_by": ahead,
                "behind_by": behind
            })

        return {"nodes": nodes}


# ----------------- PREVIOUS EXISTING ROUTES -----------------

@router.get("/radar")
async def collision_radar(repo_name: str = Query(...), authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")
    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        cfg_res = await client.get(f"https://api.github.com/repos/{repo_full}/contents/.devsync.json", headers=headers)
        if cfg_res.status_code != 200:
            return {"collisions": [], "monitored_branches": 0}

        try:
            cfg = json.loads(base64.b64decode(cfg_res.json()["content"]).decode("utf-8"))
        except Exception:
            return {"collisions": [], "monitored_branches": 0}

        members = cfg.get("members", {})
        branch_file_map = {}
        collisions = []

        for author, info in members.items():
            branch = info.get("branch")
            if not branch:
                continue

            comp_res = await client.get(f"https://api.github.com/repos/{repo_full}/compare/main...{branch}",
                                        headers=headers)
            if comp_res.status_code == 200:
                files = comp_res.json().get("files", [])
                for f in files:
                    f_name = f.get("filename")
                    if f_name in branch_file_map:
                        existing = branch_file_map[f_name]
                        collisions.append({
                            "file": f_name,
                            "branch_a": existing["branch"],
                            "author_a": existing["author"],
                            "branch_b": branch,
                            "author_b": author
                        })
                    else:
                        branch_file_map[f_name] = {"branch": branch, "author": author}

        return {"collisions": collisions, "monitored_branches": len(members), "collision_count": len(collisions)}


@router.post("/create-pr", response_model=PRSummaryResponse)
async def create_pull_request(payload: CreatePRRequest, authorization: Optional[str] = Header(None)):
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
        body = {"title": payload.title, "head": payload.head_branch, "base": payload.base_branch, "body": payload.body}
        res = await client.post(url, headers=headers, json=body)
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
async def get_pr_status(repo_name: str = Query(...), pr_number: int = Query(...),
                        authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub Bearer token required.")
    token = authorization.split("Bearer ")[1].strip()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_full = repo_name.strip()
        if "/" not in repo_full:
            u_res = await client.get("https://api.github.com/user", headers=headers)
            repo_full = f"{u_res.json()['login']}/{repo_full}"

        res = await client.get(f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}", headers=headers)
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
                    raise HTTPException(
                        status_code=403,
                        detail=f"Forbidden: Only the Project Lead (@{lead}) has permission to merge into main."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        url = f"https://api.github.com/repos/{repo_full}/pulls/{payload.pr_number}/merge"
        res = await client.put(url, headers=headers,
                               json={"commit_title": payload.commit_title, "merge_method": "merge"})
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=f"Merge failed: {res.text}")
        return {"status": "merged", "data": res.json()}