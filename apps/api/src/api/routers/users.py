from fastapi import APIRouter
from security import CurrentUserDep

from api.schemas import UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
def me(user: CurrentUserDep) -> UserPublic:
    return UserPublic(id=user.id, name=user.name, email=user.email)
