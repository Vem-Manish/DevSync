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
