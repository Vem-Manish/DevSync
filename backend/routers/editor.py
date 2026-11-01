from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter

router = APIRouter()

class FileContentRequest(BaseModel):
    repo_name: str = Field(..., description="Target repository name (owner/repo or repo)")
    branch_name: str = Field(..., description="Target branch name")
    file_path: str = Field(..., description="Path to file inside repo")

class FileContentResponse(BaseModel):
    file_path: str
    branch: str
    content: str
    sha: str

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
