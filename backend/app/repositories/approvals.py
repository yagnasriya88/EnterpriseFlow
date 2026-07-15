from app.models.orm import Approval
from app.repositories.base import BaseRepository


class ApprovalRepository(BaseRepository[Approval]):
    model = Approval
