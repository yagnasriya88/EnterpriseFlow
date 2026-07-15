import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import SessionDep
from app.models.schemas import NotificationRead
from app.repositories.notifications import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
async def list_notifications(session: SessionDep, limit: int = 50, offset: int = 0, unread_only: bool = False):
    return await NotificationRepository(session).list(limit=limit, offset=offset, unread_only=unread_only)


@router.get("/unread-count")
async def unread_count(session: SessionDep):
    return {"count": await NotificationRepository(session).unread_count()}


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_read(notification_id: uuid.UUID, session: SessionDep):
    repo = NotificationRepository(session)
    notification = await repo.get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return await repo.update(notification, is_read=True)
