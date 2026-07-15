import uuid

from fastapi import APIRouter, HTTPException, Response

from app.api.deps import SessionDep
from app.models.schemas import QuotationCreate, QuotationRead, QuotationUpdate
from app.repositories.customers import CustomerRepository
from app.repositories.quotations import QuotationRepository
from app.services.pdf_generation import render_document_pdf

router = APIRouter(prefix="/quotations", tags=["quotations"])


@router.get("", response_model=list[QuotationRead])
async def list_quotations(session: SessionDep, limit: int = 100, offset: int = 0):
    return await QuotationRepository(session).list(limit=limit, offset=offset)


@router.post("", response_model=QuotationRead, status_code=201)
async def create_quotation(payload: QuotationCreate, session: SessionDep):
    return await QuotationRepository(session).create(**payload.model_dump())


@router.get("/{quotation_id}", response_model=QuotationRead)
async def get_quotation(quotation_id: uuid.UUID, session: SessionDep):
    quotation = await QuotationRepository(session).get(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@router.patch("/{quotation_id}", response_model=QuotationRead)
async def update_quotation(quotation_id: uuid.UUID, payload: QuotationUpdate, session: SessionDep):
    repo = QuotationRepository(session)
    quotation = await repo.get(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return await repo.update(quotation, **payload.model_dump(exclude_unset=True))


@router.delete("/{quotation_id}", status_code=204)
async def delete_quotation(quotation_id: uuid.UUID, session: SessionDep):
    repo = QuotationRepository(session)
    quotation = await repo.get(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    await repo.delete(quotation)


@router.get("/{quotation_id}/pdf")
async def get_quotation_pdf(quotation_id: uuid.UUID, session: SessionDep):
    quotation = await QuotationRepository(session).get(quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    customer = await CustomerRepository(session).get(quotation.customer_id)
    pdf_bytes = render_document_pdf(quotation, customer)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="quotation-{quotation_id}.pdf"'},
    )
