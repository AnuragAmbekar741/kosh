from storage.models.spend import SpendItem

from api.modules.spend.schemas import SpendItemPublic


def to_public(item: SpendItem) -> SpendItemPublic:
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
