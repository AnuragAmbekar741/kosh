from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from security import CurrentUserDep
from sqlmodel import Session
from storage.crud.spend import (
    create_spend_item,
    delete_spend_item,
    get_spend_item,
    list_spend_items,
    update_spend_item,
)
from storage.database import get_session
from storage.models.spend import SpendSource, SpendStatus

from api.schemas.spend import SpendItemCreate, SpendItemPublic, SpendItemUpdate

router = APIRouter(prefix="/spend-items", tags=["spend"])
SessionDep = Annotated[Session, Depends(get_session)]


def _public(item) -> SpendItemPublic:
    return SpendItemPublic(
        id=item.id,
        merchant=item.merchant,
        description=item.description,
        amount=item.amount,
        currency=item.currency,
        spent_at=item.spent_at,
        category=item.category,
        source=item.source,
        status=item.status,
        document_id=item.document_id,
        line_index=item.line_index,
        user_edited=item.user_edited,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    body: SpendItemCreate, user: CurrentUserDep, session: SessionDep
) -> SpendItemPublic:
    item = create_spend_item(
        session,
        user_id=user.id,
        merchant=body.merchant,
        description=body.description,
        amount=body.amount,
        currency=body.currency,
        spent_at=body.spent_at,
        category=body.category,
        source=SpendSource.MANUAL,
        status=SpendStatus.CONFIRMED,
    )
    return _public(item)


@router.get("")
def list_items(
    user: CurrentUserDep,
    session: SessionDep,
    spent_from: Annotated[date | None, Query()] = None,
    spent_to: Annotated[date | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    merchant: Annotated[str | None, Query()] = None,
    source: Annotated[str | None, Query()] = None,
) -> list[SpendItemPublic]:
    items = list_spend_items(
        session,
        user_id=user.id,
        spent_from=spent_from,
        spent_to=spent_to,
        category=category,
        merchant=merchant,
        source=source,
    )
    return [_public(item) for item in items]


@router.get("/{item_id}")
def get_item(
    item_id: UUID, user: CurrentUserDep, session: SessionDep
) -> SpendItemPublic:
    item = get_spend_item(session, user_id=user.id, item_id=item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _public(item)


@router.patch("/{item_id}")
def patch_item(
    item_id: UUID,
    body: SpendItemUpdate,
    user: CurrentUserDep,
    session: SessionDep,
) -> SpendItemPublic:
    item = get_spend_item(session, user_id=user.id, item_id=item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    fields = body.model_dump(exclude_unset=True)
    updated = update_spend_item(
        session,
        item,
        merchant=fields.get("merchant"),
        description=fields.get("description"),
        amount=fields.get("amount"),
        currency=fields.get("currency"),
        spent_at=fields.get("spent_at"),
        category=fields.get("category"),
        clear_description="description" in fields and fields["description"] is None,
        clear_category="category" in fields and fields["category"] is None,
        mark_edited=True,
    )
    return _public(updated)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(item_id: UUID, user: CurrentUserDep, session: SessionDep) -> Response:
    item = get_spend_item(session, user_id=user.id, item_id=item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    delete_spend_item(session, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
