from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

__all__ = [
    "AccessTokenResponse",
    "LoginRequest",
    "RegisterRequest",
    "UserPublic",
]


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: UUID
    name: str
    email: EmailStr


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
