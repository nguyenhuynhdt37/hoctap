from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr


class GitHubStartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    authorize_url: str


class GitHubExchangeRequest(BaseModel):
    code: SecretStr = Field(description="One-time GitHub login code")
    code_verifier: SecretStr = Field(description="RFC 7636 PKCE verifier, 43–128 characters")


class GitHubExchangeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: Literal["DPoP"]
    expires_in: int
    session_id: str
    expired_at: datetime
    message: str
    redirect_to: str


class GitHubConnectFinishRequest(BaseModel):
    handle: SecretStr = Field(min_length=43, max_length=43)
