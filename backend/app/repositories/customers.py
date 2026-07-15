from sqlalchemy import select

from app.models.orm import Customer
from app.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    model = Customer

    async def get_by_phone_number(self, phone_number: str) -> Customer | None:
        result = await self.session.execute(select(Customer).where(Customer.phone_number == phone_number))
        return result.scalar_one_or_none()
