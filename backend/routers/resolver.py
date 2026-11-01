from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter

router = APIRouter()

class CreatePRRequest(BaseModel):
    repo_name: str = Field(..., description="Target repository name (owner/repo or repo)")
    title: str = Field(..., description="PR Title")
    head_branch: str = Field(..., description="Teammate feature branch to merge from")
    base_branch: str = Field(default="main", description="Target base branch")
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
