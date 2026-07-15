"""Shared "run one customer message through the graph and log it" logic.

Used by both the direct `POST /agent/message` route and the WhatsApp webhook,
so the two entry points can't drift on what logging/graph-invocation looks like.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import build_agent_graph
from app.repositories.conversations import ConversationMessageRepository
from app.repositories.notifications import NotificationRepository


async def run_agent_turn(
    session: AsyncSession, *, conversation_id: uuid.UUID, customer_id: uuid.UUID, message: str
) -> dict:
    message_repo = ConversationMessageRepository(session)
    await message_repo.create(conversation_id=conversation_id, direction="inbound", body=message)
    await NotificationRepository(session).create(
        type="customer_replied",
        title="New customer message",
        body=message[:200],
        link_type="conversation",
        link_id=conversation_id,
    )

    graph = build_agent_graph(session)
    result = await graph.ainvoke(
        {
            "conversation_id": conversation_id,
            "customer_id": customer_id,
            "customer_message": message,
        }
    )

    reply = result.get("final_reply", "")
    await message_repo.create(conversation_id=conversation_id, direction="outbound", body=reply, agent="orchestrator")

    return result
