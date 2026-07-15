from app.models.orm import Invoice
from app.repositories.base import BaseRepository, search_delivered_documents


class InvoiceRepository(BaseRepository[Invoice]):
    model = Invoice

    async def search_delivered(self, query: str, limit: int = 5) -> list[Invoice]:
        """Past invoices the customer actually received, matching `query` — see
        search_delivered_documents() for the matching rules. Used by the follow-up
        feature to find a past interaction from a staff-written description."""
        return await search_delivered_documents(self.session, Invoice, query, limit)
