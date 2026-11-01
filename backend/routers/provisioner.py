import base64
import json
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header
import httpx

router = APIRouter()


# --- Pydantic Data Contracts & Schemas ---

class TeammateAssignment(BaseModel):
    username: str = Field(..., description="GitHub username of the collaborator")
    role: str = Field(..., description="Assigned role title, e.g. 'Studio Editor'")
    branch_name: str = Field(..., description="Feature branch name to cut, e.g. 'feat/code-editor'")
    assigned_files: List[str] = Field(default_factory=list, description="Target domain files or folders")


class ProvisionRequest(BaseModel):
    repo_name: str = Field(..., min_length=2, max_length=100, description="Target repository name")
    description: Optional[str] = "Engineered with DevSync Collaborative Suite"
    is_private: bool = False
    tech_stack: str = Field(default="FastAPI + Vanilla JS", description="Selected framework preset")
    collaborators: List[TeammateAssignment] = Field(..., min_items=1, description="List of team assignments")


class ProvisionResult(BaseModel):
    status: str
    repo_url: str
    default_branch: str
    branches_created: List[str]
    assignments: List[Dict[str, str]]


class AddCollaboratorPayload(BaseModel):
    repo_name: str = Field(..., description="Repository full name (owner/repo) or short name")
    username: str = Field(..., description="GitHub username to invite")
    role: str = Field(..., description="Role title assigned to collaborator")
    branch_name: str = Field(..., description="Feature branch to provision for this collaborator")


# --- Endpoint 1: Complete Project Scaffolding & Initial Branch Matrix ---

@router.post("/scaffold", response_model=ProvisionResult)
async def scaffold_project(
    payload: ProvisionRequest,
    authorization: Optional[str] = Header(None, description="Bearer token from GitHub OAuth")
):
    """
    Automates project repository creation, provisions the default main branch,
    initializes the .devsync.json team roster manifest, creates isolated feature branches,
    and dispatches official GitHub collaborator invitations.
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
        # 1. Create Repository on GitHub
        repo_payload = {
            "name": payload.repo_name,
            "description": payload.description,
            "private": payload.is_private,
            "auto_init": True,
        }
        create_res = await client.post("https://api.github.com/user/repos", json=repo_payload, headers=headers)
        if create_res.status_code == 422:
            raise HTTPException(status_code=422, detail="Repository name already exists or is unavailable.")
        if create_res.status_code not in (200, 201):
            raise HTTPException(status_code=create_res.status_code, detail=f"Failed to create repo: {create_res.text}")

        repo_data = create_res.json()
        owner = repo_data["owner"]["login"]
        repo_name = repo_data["name"]
        default_branch = repo_data.get("default_branch", "main")
        repo_html_url = repo_data["html_url"]

        # 2. Get base commit SHA of default branch
        ref_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo_name}/git/ref/heads/{default_branch}",
            headers=headers
        )
        if ref_res.status_code != 200:
            raise HTTPException(status_code=500, detail="Could not resolve default branch reference.")
        base_sha = ref_res.json()["object"]["sha"]

        # 3. Build .devsync.json manifest
        devsync_manifest = {
            "project_name": repo_name,
            "lead": owner,
            "tech_stack": payload.tech_stack,
            "members": {}
        }

        created_branches = []
        assignment_summary = []

        # 4. Provision isolated feature branches and send invites
        for member in payload.collaborators:
            clean_branch = member.branch_name.strip().replace(" ", "-")
            devsync_manifest["members"][member.username.strip()] = {
                "role": member.role.strip(),
                "branch": clean_branch,
                "assigned_files": member.assigned_files
            }

            # Cut dedicated Git branch reference from base commit SHA
            branch_ref_payload = {"ref": f"refs/heads/{clean_branch}", "sha": base_sha}
            b_res = await client.post(
                f"https://api.github.com/repos/{owner}/{repo_name}/git/refs",
                json=branch_ref_payload,
                headers=headers
            )
            if b_res.status_code in (200, 201):
                created_branches.append(clean_branch)

            assignment_summary.append({
                "username": member.username.strip(),
                "role": member.role.strip(),
                "branch": clean_branch
            })

            # Send official collaborator invite if collaborator is not the repository owner
            if member.username.strip().lower() != owner.lower():
                await client.put(
                    f"https://api.github.com/repos/{owner}/{repo_name}/collaborators/{member.username.strip()}",
                    headers=headers,
                    json={"permission": "push"}
                )

        # 5. Commit .devsync.json directly to the root of the main branch
        config_b64 = base64.b64encode(json.dumps(devsync_manifest, indent=2).encode("utf-8")).decode("utf-8")
        await client.put(
            f"https://api.github.com/repos/{owner}/{repo_name}/contents/.devsync.json",
            headers=headers,
            json={
                "message": "chore(devsync): initialize repository team architecture & role matrix",
                "content": config_b64,
                "branch": default_branch
            }
        )

        return ProvisionResult(
            status="success",
            repo_url=repo_html_url,
            default_branch=default_branch,
            branches_created=created_branches,
            assignments=assignment_summary
        )


# --- Endpoint 2: On-Demand Invites for Existing Projects ---

@router.post("/invite")
async def invite_collaborator_to_project(
    payload: AddCollaboratorPayload,
    authorization: Optional[str] = Header(None, description="Bearer token from GitHub OAuth")
):
    """
    Invites a collaborator to an existing project repository, creates their feature branch,
    and updates the .devsync.json manifest on main with their assigned role and branch.
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
        # 1. Resolve current user identity
        u_res = await client.get("https://api.github.com/user", headers=headers)
        if u_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Could not resolve authenticated user.")
        current_user = u_res.json()["login"]

        repo_full = payload.repo_name.strip()
        if "/" not in repo_full:
            repo_full = f"{current_user}/{repo_full}"

        # 2. Get base branch SHA (main)
        ref_res = await client.get(f"https://api.github.com/repos/{repo_full}/git/ref/heads/main", headers=headers)
        if ref_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Could not resolve main branch reference.")
        base_sha = ref_res.json()["object"]["sha"]

        # 3. Provision the collaborator's feature branch
        clean_branch = payload.branch_name.strip().replace(" ", "-")
        await client.post(
            f"https://api.github.com/repos/{repo_full}/git/refs",
            json={"ref": f"refs/heads/{clean_branch}", "sha": base_sha},
            headers=headers
        )

        # 4. Dispatch GitHub collaborator invitation
        target_username = payload.username.strip()
        invite_res = await client.put(
            f"https://api.github.com/repos/{repo_full}/collaborators/{target_username}",
            headers=headers,
            json={"permission": "push"}
        )
        if invite_res.status_code not in (201, 204):
            raise HTTPException(status_code=invite_res.status_code, detail=f"Failed to invite: {invite_res.text}")

        # 5. Read, update, and commit .devsync.json on main
        cfg_res = await client.get(f"https://api.github.com/repos/{repo_full}/contents/.devsync.json", headers=headers)
        if cfg_res.status_code == 200:
            cfg_data = cfg_res.json()
            manifest = json.loads(base64.b64decode(cfg_data["content"]).decode("utf-8"))
            if "members" not in manifest:
                manifest["members"] = {}

            manifest["members"][target_username] = {
                "role": payload.role.strip(),
                "branch": clean_branch,
                "assigned_files": []
            }

            new_b64 = base64.b64encode(json.dumps(manifest, indent=2).encode("utf-8")).decode("utf-8")
            await client.put(
                f"https://api.github.com/repos/{repo_full}/contents/.devsync.json",
                headers=headers,
                json={
                    "message": f"chore(devsync): add @{target_username} to team roster",
                    "content": new_b64,
                    "sha": cfg_data["sha"],
                    "branch": "main"
                }
            )

        return {
            "status": "success",
            "message": f"Official GitHub invitation sent to @{target_username} for branch '{clean_branch}'."
        }