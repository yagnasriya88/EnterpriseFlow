import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.runner import run_agent_turn
from app.api.deps import SessionDep
from app.repositories.conversations import ConversationRepository

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentMessageRequest(BaseModel):
    conversation_id: uuid.UUID
    customer_id: uuid.UUID
    message: str


class AgentMessageResponse(BaseModel):
    reply: str
    intent: str
    document_type: str | None = None
    document_id: uuid.UUID | None = None
    total: float | None = None
    requires_human_approval: bool = False


@router.post("/message", response_model=AgentMessageResponse)
async def handle_message(payload: AgentMessageRequest, session: SessionDep) -> AgentMessageResponse:
    """Runs one customer message through the Intake -> Context -> Generate -> Review -> Approval graph."""
    conversation = await ConversationRepository(session).get(payload.conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await run_agent_turn(
        session, conversation_id=payload.conversation_id, customer_id=payload.customer_id, message=payload.message
    )

    reply = result.get("final_reply", "")
    document = result.get("document")
    approval = result.get("approval")
    return AgentMessageResponse(
        reply=reply,
        intent=result["intake"].intent,
        document_type=document.document_type if document else None,
        document_id=result.get("document_id"),
        total=document.total if document else None,
        requires_human_approval=approval.requires_human if approval else False,
    )
