import logging
from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID

import ai
from sqlmodel import Session
from storage.crud.catalog import active_catalog, find_alias, name_key, save_alias
from storage.models.catalog import AliasKind, AliasSource, CatalogItem
from storage.models.spend import ItemMethod, ItemStatus, SpendItem

from worker.jobs.items.matching import CatalogIndex
from worker.outcome import Outcome

logger = logging.getLogger(__name__)

_CONFIDENT = 0.8


@dataclass(frozen=True)
class LineResult:
    line_id: UUID
    status: ItemStatus
    catalog_item_id: UUID | None = None
    method: ItemMethod | None = None
    category: str | None = None


def handle(
    session: Session, lines: list[SpendItem]
) -> tuple[Outcome, list[LineResult]]:
    """Resolve one bill's lines: saved answers, then string match, then the model."""
    index = CatalogIndex(active_catalog(session))
    user_id = lines[0].user_id
    merchant = lines[0].merchant
    merchant_key = name_key(merchant)
    results: list[LineResult] = []
    leftovers: list[SpendItem] = []
    for line in lines:
        result = _saved_answer(session, index, user_id, merchant_key, line)
        if result is None:
            row = index.match(cleaned=line.normalized_name, raw=line.description)
            if row is not None:
                result = _resolved(index, line, row, ItemMethod.MATCH)
        if result is None:
            leftovers.append(line)
        else:
            results.append(result)
    if not leftovers:
        return Outcome.ready(), results
    try:
        choices, _meta = ai.classify_items(
            merchant,
            [
                ai.ItemLine(
                    ref=ref,
                    text=line.description or "",
                    cleaned=line.normalized_name,
                    amount=str(line.amount),
                )
                for ref, line in enumerate(leftovers)
            ],
            catalog_prompt(index),
        )
    except ai.RetryableExtractError as exc:
        return Outcome.retry(str(exc)), []
    except ai.ExtractError as exc:
        logger.warning("item model call failed", extra={"reason": str(exc)})
        results += [LineResult(line.id, ItemStatus.FAILED) for line in leftovers]
        return Outcome.ready(), results
    by_ref = {choice.ref: choice for choice in choices}
    for ref, line in enumerate(leftovers):
        choice = by_ref.get(ref)
        result = _from_model(session, index, user_id, merchant_key, line, choice)
        results.append(result)
    return Outcome.ready(), results


def catalog_prompt(index: CatalogIndex) -> str:
    """One 'family: item, item' line per family, by slug."""
    children: dict[UUID, list[str]] = defaultdict(list)
    families: list[CatalogItem] = []
    for row in index.rows():
        if row.parent_id is None:
            families.append(row)
        else:
            children[row.parent_id].append(row.slug or "")
    return "\n".join(
        f"{family.slug}: {', '.join(sorted(children[family.id]))}"
        for family in sorted(families, key=lambda row: row.slug or "")
    )


def _saved_answer(
    session: Session,
    index: CatalogIndex,
    user_id: UUID,
    merchant_key: str,
    line: SpendItem,
) -> LineResult | None:
    lookups = []
    if line.item_code:
        lookups.append((AliasKind.CODE, merchant_key, line.item_code.lower()))
    text_key = name_key(line.description or "")
    if text_key:
        lookups += [
            (AliasKind.TEXT, merchant_key, text_key),
            (AliasKind.TEXT, "", text_key),
        ]
    for kind, merchant, key in lookups:
        alias = find_alias(
            session, user_id=user_id, kind=kind, merchant_key=merchant, key=key
        )
        if alias is None or (merchant == "" and alias.source != AliasSource.USER):
            continue
        if alias.catalog_item_id is None:
            return LineResult(line.id, ItemStatus.NOT_PRODUCT, method=ItemMethod.ALIAS)
        row = index.get(alias.catalog_item_id)
        if row is not None:
            return _resolved(index, line, row, ItemMethod.ALIAS)
    return None


def _from_model(
    session: Session,
    index: CatalogIndex,
    user_id: UUID,
    merchant_key: str,
    line: SpendItem,
    choice: ai.ItemChoice | None,
) -> LineResult:
    if choice is None or choice.confidence < _CONFIDENT:
        return LineResult(line.id, ItemStatus.NEEDS_REVIEW)
    if choice.outcome == "not_product":
        _remember(session, user_id, merchant_key, line, None)
        return LineResult(line.id, ItemStatus.NOT_PRODUCT, method=ItemMethod.MODEL)
    row = index.by_slug(choice.slug) if choice.outcome == "match" else None
    if row is None:
        return LineResult(line.id, ItemStatus.NEEDS_REVIEW)
    _remember(session, user_id, merchant_key, line, row.id)
    return _resolved(index, line, row, ItemMethod.MODEL)


def _resolved(
    index: CatalogIndex, line: SpendItem, row: CatalogItem, method: ItemMethod
) -> LineResult:
    return LineResult(
        line.id,
        ItemStatus.RESOLVED,
        catalog_item_id=row.id,
        method=method,
        category=index.category_of(row),
    )


def _remember(
    session: Session,
    user_id: UUID,
    merchant_key: str,
    line: SpendItem,
    catalog_item_id: UUID | None,
) -> None:
    """Save a confident model answer so the same text or code is free next time."""
    keys = [(AliasKind.TEXT, name_key(line.description or ""))]
    if line.item_code:
        keys.append((AliasKind.CODE, line.item_code.lower()))
    for kind, key in keys:
        if key:
            save_alias(
                session,
                user_id=user_id,
                kind=kind,
                merchant_key=merchant_key,
                key=key,
                catalog_item_id=catalog_item_id,
                source=AliasSource.MODEL,
            )
