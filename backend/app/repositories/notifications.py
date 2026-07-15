from sqlalchemy import select

from app.models.orm import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    async def list(self, limit: int = 100, offset: int = 0, unread_only: bool = False) -> list[Notification]:
        query = select(Notification).order_by(Notification.created_at.desc()).limit(limit).offset(offset)
        if unread_only:
            query = query.where(Notification.is_read.is_(False))
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def unread_count(self) -> int:
        result = await self.session.execute(select(Notification).where(Notification.is_read.is_(False)))
        return len(result.scalars().all())
