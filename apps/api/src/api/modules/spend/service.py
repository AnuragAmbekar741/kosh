from datetime import date
from uuid import UUID

from sqlmodel import Session
from storage.crud.spend import (
    create_spend_item,
    delete_spend_item,
    get_spend_item,
    list_spend_items,
    update_spend_item,
)
from storage.models.spend import SpendItem, SpendSource, SpendStatus

from api.common.errors import NotFoundError
from api.modules.spend.schemas import SpendItemCreate, SpendItemUpdate


def create(session: Session, user_id: UUID, body: SpendItemCreate) -> SpendItem:
    return create_spend_item(
        session,
        user_id=user_id,
        merchant=body.merchant,
        description=body.description,
        amount=body.amount,
        currency=body.currency,
        spent_at=body.spent_at,
        category=body.category,
        source=SpendSource.MANUAL,
        status=SpendStatus.CONFIRMED,
    )


def list_items(
    session: Session,
    user_id: UUID,
    *,
    spent_from: date | None,
    spent_to: date | None,
    category: str | None,
    merchant: str | None,
    source: str | None,
) -> list[SpendItem]:
    return list_spend_items(
        session,
        user_id=user_id,
        spent_from=spent_from,
        spent_to=spent_to,
        category=category,
        merchant=merchant,
        source=source,
    )


def get(session: Session, user_id: UUID, item_id: UUID) -> SpendItem:
    item = get_spend_item(session, user_id=user_id, item_id=item_id)
    if item is None:
        raise NotFoundError
    return item


def update(
    session: Session, user_id: UUID, item_id: UUID, body: SpendItemUpdate
) -> SpendItem:
    item = get(session, user_id, item_id)
    fields = body.model_dump(exclude_unset=True)
    return update_spend_item(
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


def delete(session: Session, user_id: UUID, item_id: UUID) -> None:
    delete_spend_item(session, get(session, user_id, item_id))
