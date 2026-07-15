import uuid
from typing import Generic, TypeVar

from sqlalchemy import Text, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import Base

ModelType = TypeVar("ModelType", bound=Base)

# Full operator sentences ("Follow up with the customer who asked for...") carry
# instructional filler that would otherwise cause bogus ILIKE matches once the
# whole-phrase tier falls back to per-word OR'ing — unlike ProductRepository.search()'s
# callers, which already pass clean product phrases.
_FOLLOWUP_STOPWORDS = {
    "follow", "up", "with", "the", "customer", "who", "asked", "for",
    "please", "quote", "quotation", "invoice", "order", "a", "an", "and", "that",
}


async def search_delivered_documents(session: AsyncSession, model: type[ModelType], query: str, limit: int = 5) -> list[ModelType]:
    """Loose text match over a Quotation/Invoice's `items` JSONB blob, restricted to
    documents the customer actually received (status approved/sent, customer_message set —
    a pending_approval document was never shown to the customer). Mirrors
    ProductRepository.search()'s two-tier ILIKE pattern (whole-phrase, then
    per-significant-word fallback), plus a stopword filter for the fallback tier.
    """
    items_text = cast(model.items, Text)
    base_query = select(model).where(model.status.in_(["approved", "sent"])).where(model.customer_message.is_not(None))

    like = f"%{query}%"
    result = await session.execute(base_query.where(items_text.ilike(like)).order_by(model.created_at.desc()).limit(limit))
    matches = list(result.scalars().all())
    if matches:
        return matches

    words = [w for w in query.lower().split() if len(w) > 2 and w not in _FOLLOWUP_STOPWORDS]
    if not words:
        return []
    word_filters = [items_text.ilike(f"%{w}%") for w in words]
    result = await session.execute(base_query.where(or_(*word_filters)).order_by(model.created_at.desc()).limit(limit))
    return list(result.scalars().all())


class BaseRepository(Generic[ModelType]):
    """Thin CRUD wrapper shared by every entity repository."""

    model: type[ModelType]

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, limit: int = 100, offset: int = 0) -> list[ModelType]:
        result = await self.session.execute(
            select(self.model).limit(limit).offset(offset).order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, id: uuid.UUID) -> ModelType | None:
        return await self.session.get(self.model, id)

    async def create(self, **fields) -> ModelType:
        obj = self.model(**fields)
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: ModelType, **fields) -> ModelType:
        for key, value in fields.items():
            if value is not None:
                setattr(obj, key, value)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.session.delete(obj)
        await self.session.commit()
