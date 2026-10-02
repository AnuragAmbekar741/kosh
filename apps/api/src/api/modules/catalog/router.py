from typing import Annotated

from fastapi import APIRouter, Query
from security import CurrentUserDep

from api.common.dependencies import SessionDep
from api.modules.catalog import service
from api.modules.catalog.schemas import CatalogEntry, CatalogSearchQuery

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/search")
def search(
    user: CurrentUserDep,
    session: SessionDep,
    query: Annotated[CatalogSearchQuery, Query()],
) -> list[CatalogEntry]:
    return service.search(session, user.id, query.q, query.limit)
