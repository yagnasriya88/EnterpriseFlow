import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import Base

ModelType = TypeVar("ModelType", bound=Base)


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
