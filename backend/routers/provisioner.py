from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Header
import httpx


router = APIRouter()


class TeammateAssignment(BaseModel):
    username: str = Field(..., description="GitHub username of collaborator")
    role: str = Field(..., description="Assigned role title")
    branch_name: str = Field(..., description="Feature branch name to cut")
    assigned_files: List[str] = Field(
        default_factory=list,
        description="Target files/folders"
    )


class ProvisionRequest(BaseModel):
    repo_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Target repository name"
    )
    description: Optional[str] = "Engineered with DevSync Collaborative Suite"
    is_private: bool = False
    tech_stack: str = Field(
        default="FastAPI + Vanilla JS",
        description="Selected framework preset"
    )
    collaborators: List[TeammateAssignment] = Field(
        ...,
        min_items=1,
        description="List of team assignments"
    )


class ProvisionResult(BaseModel):
    status: str
    repo_url: str
    default_branch: str
    branches_created: List[str]
    assignments: List[Dict[str, str]]

@router.post("/scaffold", response_model=ProvisionResult)
async def scaffold_project(
    payload: ProvisionRequest,
    authorization: Optional[str] = Header(
        None,
        description="Bearer token from GitHub OAuth"
    )
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Valid GitHub Bearer authorization token required."
        )

    token = authorization.split("Bearer ")[1].strip()

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:

        # 1. Create Repository
        repo_payload = {
            "name": payload.repo_name,
            "description": payload.description,
            "private": payload.is_private,
            "auto_init": True,
        }

        create_res = await client.post(
            "https://api.github.com/user/repos",
            json=repo_payload,
            headers=headers,
        )

        if create_res.status_code == 422:
            raise HTTPException(
                status_code=422,
                detail="Repository name already exists or is unavailable."
            )

        if create_res.status_code not in (200, 201):
            raise HTTPException(
                status_code=create_res.status_code,
                detail=f"Failed to create repo: {create_res.text}"
            )

        repo_data = create_res.json()
        owner = repo_data["owner"]["login"]
        repo_name = repo_data["name"]
        default_branch = repo_data.get("default_branch", "main")
        repo_html_url = repo_data["html_url"]

        # 2. Get base commit SHA of default branch
        ref_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo_name}/git/ref/heads/{default_branch}",
            headers=headers,
        )

        if ref_res.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail="Could not resolve default branch reference."
            )

        base_sha = ref_res.json()["object"]["sha"]

        # 3. Create isolated teammate branches
        created_branches = []
        assignment_summary = []

        for member in payload.collaborators:
            clean_branch = member.branch_name.strip().replace(" ", "-")

            branch_ref_payload = {
                "ref": f"refs/heads/{clean_branch}",
                "sha": base_sha,
            }

            branch_res = await client.post(
                f"https://api.github.com/repos/{owner}/{repo_name}/git/refs",
                json=branch_ref_payload,
                headers=headers,
            )

            if branch_res.status_code in (200, 201):
                created_branches.append(clean_branch)

            assignment_summary.append({
                "username": member.username,
                "role": member.role,
                "branch": clean_branch,
            })

            if member.username.lower() != owner.lower():
                await client.put(
                    f"https://api.github.com/repos/{owner}/{repo_name}/collaborators/{member.username}",
                    headers=headers,
                    json={"permission": "push"},
                )

    return ProvisionResult(
        status="success",
        repo_url=repo_html_url,
        default_branch=default_branch,
        branches_created=created_branches,
        assignments=assignment_summary,
    )