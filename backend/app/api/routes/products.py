import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import SessionDep
from app.models.schemas import ProductCreate, ProductRead, ProductUpdate
from app.repositories.products import ProductRepository

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
async def list_products(session: SessionDep, limit: int = 100, offset: int = 0):
    return await ProductRepository(session).list(limit=limit, offset=offset)


@router.post("", response_model=ProductRead, status_code=201)
async def create_product(payload: ProductCreate, session: SessionDep):
    repo = ProductRepository(session)
    if await repo.get_by_sku(payload.sku):
        raise HTTPException(status_code=409, detail=f"Product with sku '{payload.sku}' already exists")
    return await repo.create(**payload.model_dump())


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: uuid.UUID, session: SessionDep):
    product = await ProductRepository(session).get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(product_id: uuid.UUID, payload: ProductUpdate, session: SessionDep):
    repo = ProductRepository(session)
    product = await repo.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return await repo.update(product, **payload.model_dump(exclude_unset=True))


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: uuid.UUID, session: SessionDep):
    repo = ProductRepository(session)
    product = await repo.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await repo.delete(product)
