from app.models.orm import Quotation
from app.repositories.base import BaseRepository


class QuotationRepository(BaseRepository[Quotation]):
    model = Quotation
