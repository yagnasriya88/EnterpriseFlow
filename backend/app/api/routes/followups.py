from fastapi import APIRouter

from app.api.deps import SessionDep
from app.models.schemas import (
    FollowUpSearchRequest,
    FollowUpSearchResponse,
    FollowUpSendRequest,
    FollowUpSendResponse,
)
from app.services.followups import search_past_interactions, send_followup

router = APIRouter(prefix="/follow-ups", tags=["follow-ups"])


@router.post("/search", response_model=FollowUpSearchResponse)
async def search_follow_ups(payload: FollowUpSearchRequest, session: SessionDep) -> FollowUpSearchResponse:
    candidates = await search_past_interactions(session, payload.description)
    return FollowUpSearchResponse(candidates=candidates)


@router.post("/send", response_model=FollowUpSendResponse)
async def send_follow_up(payload: FollowUpSendRequest, session: SessionDep) -> FollowUpSendResponse:
    sent = await send_followup(
        session,
        document_type=payload.document_type,
        document_id=payload.document_id,
        conversation_id=payload.conversation_id,
        customer_id=payload.customer_id,
        message=payload.message,
    )
    return FollowUpSendResponse(sent=sent)
