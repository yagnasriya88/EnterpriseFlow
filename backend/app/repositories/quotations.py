from app.models.orm import Quotation
from app.repositories.base import BaseRepository, search_delivered_documents


class QuotationRepository(BaseRepository[Quotation]):
    model = Quotation

    async def search_delivered(self, query: str, limit: int = 5) -> list[Quotation]:
        """Past quotations the customer actually received, matching `query` — see
        search_delivered_documents() for the matching rules. Used by the follow-up
        feature to find a past interaction from a staff-written description."""
        return await search_delivered_documents(self.session, Quotation, query, limit)
