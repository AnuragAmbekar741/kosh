from uuid import UUID

from pydantic import BaseModel, EmailStr

__all__ = ["UserPublic"]


class UserPublic(BaseModel):
    id: UUID
    name: str
    email: EmailStr
