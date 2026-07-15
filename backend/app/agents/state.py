import uuid
from typing import TypedDict

from app.agents.schemas import ApprovalDecision, ContextBundle, GeneratedDocument, IntakeResult, ReviewResult


class AgentState(TypedDict, total=False):
    conversation_id: uuid.UUID
    customer_id: uuid.UUID
    customer_message: str

    intake: IntakeResult
    context: ContextBundle
    document: GeneratedDocument
    document_id: uuid.UUID
    review: ReviewResult
    review_attempts: int
    approval: ApprovalDecision

    final_reply: str
