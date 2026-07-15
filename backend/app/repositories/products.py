from sqlalchemy import or_, select

from app.models.orm import Product
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model = Product

    async def get_by_sku(self, sku: str) -> Product | None:
        result = await self.session.execute(select(Product).where(Product.sku == sku))
        return result.scalar_one_or_none()

    async def search(self, query: str, limit: int = 5) -> list[Product]:
        """Loose name/category/sku match used by the Context agent's product lookup tool."""
        like = f"%{query}%"
        result = await self.session.execute(
            select(Product)
            .where(Product.is_active.is_(True))
            .where(or_(Product.name.ilike(like), Product.category.ilike(like), Product.sku.ilike(like)))
            .limit(limit)
        )
        matches = list(result.scalars().all())
        if matches:
            return matches

        # Whole-phrase match found nothing — likely a plural/wording mismatch
        # (e.g. "throw pillows" vs "Throw Pillow"). Fall back to matching any
        # significant word in the query against the product name.
        words = [w for w in query.split() if len(w) > 2]
        if not words:
            return []
        word_filters = [Product.name.ilike(f"%{w}%") for w in words]
        result = await self.session.execute(
            select(Product)
            .where(Product.is_active.is_(True))
            .where(or_(*word_filters))
            .limit(limit)
        )
        return list(result.scalars().all())
