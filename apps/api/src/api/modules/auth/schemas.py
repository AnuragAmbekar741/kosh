from pydantic import BaseModel, EmailStr, Field

from api.modules.users.schemas import UserPublic

__all__ = [
    "AccessTokenResponse",
    "GoogleAuthRequest",
    "LoginRequest",
    "RegisterRequest",
]


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=1)


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
