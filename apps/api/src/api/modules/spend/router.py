from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status
from security import CurrentUserDep

from api.common.dependencies import SessionDep
from api.modules.spend import service
from api.modules.spend.presenter import to_public
from api.modules.spend.schemas import (
    SpendItemCreate,
    SpendItemPublic,
    SpendItemUpdate,
    SpendQuery,
    SpendSummary,
    SpendSummaryQuery,
)

router = APIRouter(prefix="/spend-items", tags=["spend"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    body: SpendItemCreate, user: CurrentUserDep, session: SessionDep
) -> SpendItemPublic:
    return to_public(service.create(session, user.id, body))


@router.get("")
def list_items(
    user: CurrentUserDep,
    session: SessionDep,
    query: Annotated[SpendQuery, Query()],
) -> list[SpendItemPublic]:
    return [
        to_public(item)
        for item in service.list_items(
            session,
            user.id,
            spent_from=query.spent_from,
            spent_to=query.spent_to,
            category=query.category,
            merchant=query.merchant,
            source=query.source,
            q=query.q,
        )
    ]


@router.get("/summary")
def get_summary(
    user: CurrentUserDep,
    session: SessionDep,
    query: Annotated[SpendSummaryQuery, Query()],
) -> SpendSummary:
    return service.summarize(
        session,
        user.id,
        spent_from=query.spent_from,
        spent_to=query.spent_to,
        category=query.category,
        source=query.source,
        q=query.q,
        period=query.period,
    )


@router.get("/{item_id}")
def get_item(
    item_id: UUID, user: CurrentUserDep, session: SessionDep
) -> SpendItemPublic:
    return to_public(service.get(session, user.id, item_id))


@router.patch("/{item_id}")
def patch_item(
    item_id: UUID,
    body: SpendItemUpdate,
    user: CurrentUserDep,
    session: SessionDep,
) -> SpendItemPublic:
    return to_public(service.update(session, user.id, item_id, body))


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(item_id: UUID, user: CurrentUserDep, session: SessionDep) -> Response:
    service.delete(session, user.id, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
