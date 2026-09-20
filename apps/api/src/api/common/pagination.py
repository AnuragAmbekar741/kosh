from pydantic import BaseModel, Field

__all__ = ["Page", "Paginated"]


class Page(BaseModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=200)


class Paginated[T](BaseModel):
    data: list[T]
    total: int
