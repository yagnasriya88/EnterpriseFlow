from sqlalchemy import select

from app.models.orm import Conversation, ConversationMessage
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    model = Conversation

    async def get_active_for_customer(self, customer_id, channel: str = "whatsapp") -> Conversation | None:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.customer_id == customer_id, Conversation.channel == channel, Conversation.status == "active")
            .order_by(Conversation.created_at.desc())
        )
        return result.scalars().first()


class ConversationMessageRepository(BaseRepository[ConversationMessage]):
    model = ConversationMessage

    async def list_for_conversation(self, conversation_id) -> list[ConversationMessage]:
        result = await self.session.execute(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at.asc())
        )
        return list(result.scalars().all())
