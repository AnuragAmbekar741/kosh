from typing import get_args

from ai import Category as ExtractedCategory
from storage.models.spend import Category


def test_extraction_and_storage_categories_match() -> None:
    assert list(get_args(ExtractedCategory)) == [
        category.value for category in Category
    ]
