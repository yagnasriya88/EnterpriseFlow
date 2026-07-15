"""Seed the products table from synthetic_products_500.csv.

Usage (from backend/): python -m scripts.seed_products
Upserts by sku, so it's safe to re-run.
"""

import asyncio
import csv
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal
from app.models.orm import Product

CSV_PATH = Path(__file__).resolve().parents[2] / "synthetic_products_500.csv"


def _parse_row(row: dict) -> dict:
    return {
        "sku": row["sku"],
        "name": row["name"],
        "description": row["description"] or None,
        "price": float(row["price"]),
        "cost": float(row["cost"]) if row["cost"] else None,
        "category": row["category"] or None,
        "stock_quantity": int(row["stockQuantity"]),
        "weight_grams": int(row["weightGrams"]) if row["weightGrams"] else None,
        "is_active": row["isActive"].strip().lower() == "true",
    }


async def seed(session: AsyncSession) -> tuple[int, int]:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = [_parse_row(r) for r in csv.DictReader(f)]

    existing = await session.execute(select(Product.sku))
    existing_skus = set(existing.scalars().all())

    created = 0
    updated = 0
    for fields in rows:
        if fields["sku"] in existing_skus:
            result = await session.execute(select(Product).where(Product.sku == fields["sku"]))
            product = result.scalar_one()
            for key, value in fields.items():
                setattr(product, key, value)
            updated += 1
        else:
            session.add(Product(**fields))
            created += 1

    await session.commit()
    return created, updated


async def main() -> None:
    async with SessionLocal() as session:
        created, updated = await seed(session)
    print(f"Seeded products: {created} created, {updated} updated (source: {CSV_PATH.name})")


if __name__ == "__main__":
    asyncio.run(main())
