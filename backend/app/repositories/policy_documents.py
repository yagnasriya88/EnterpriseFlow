from sqlalchemy import select

from app.models.orm import PolicyDocument, PolicyDocumentChunk
from app.repositories.base import BaseRepository


class PolicyDocumentRepository(BaseRepository[PolicyDocument]):
    model = PolicyDocument


class PolicyDocumentChunkRepository(BaseRepository[PolicyDocumentChunk]):
    model = PolicyDocumentChunk

    async def list_for_document(self, policy_document_id) -> list[PolicyDocumentChunk]:
        result = await self.session.execute(
            select(PolicyDocumentChunk)
            .where(PolicyDocumentChunk.policy_document_id == policy_document_id)
            .order_by(PolicyDocumentChunk.chunk_index.asc())
        )
        return list(result.scalars().all())

    async def search_similar(self, embedding: list[float], limit: int = 5) -> list[PolicyDocumentChunk]:
        """Nearest-neighbor lookup for the Context agent's policy RAG queries."""
        result = await self.session.execute(
            select(PolicyDocumentChunk)
            .order_by(PolicyDocumentChunk.embedding.cosine_distance(embedding))
            .limit(limit)
        )
        return list(result.scalars().all())
