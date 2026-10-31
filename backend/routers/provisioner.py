from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter


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