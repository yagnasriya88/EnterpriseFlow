import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import SessionDep
from app.models.schemas import CustomerCreate, CustomerRead, CustomerUpdate
from app.repositories.customers import CustomerRepository

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerRead])
async def list_customers(session: SessionDep, limit: int = 100, offset: int = 0):
    return await CustomerRepository(session).list(limit=limit, offset=offset)


@router.post("", response_model=CustomerRead, status_code=201)
async def create_customer(payload: CustomerCreate, session: SessionDep):
    repo = CustomerRepository(session)
    if await repo.get_by_phone_number(payload.phone_number):
        raise HTTPException(status_code=409, detail="Customer with this phone_number already exists")
    return await repo.create(**payload.model_dump())


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(customer_id: uuid.UUID, session: SessionDep):
    customer = await CustomerRepository(session).get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerRead)
async def update_customer(customer_id: uuid.UUID, payload: CustomerUpdate, session: SessionDep):
    repo = CustomerRepository(session)
    customer = await repo.get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return await repo.update(customer, **payload.model_dump(exclude_unset=True))


@router.delete("/{customer_id}", status_code=204)
async def delete_customer(customer_id: uuid.UUID, session: SessionDep):
    repo = CustomerRepository(session)
    customer = await repo.get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    await repo.delete(customer)
