import uuid

from fastapi import APIRouter, HTTPException, Response

from app.api.deps import SessionDep
from app.models.schemas import InvoiceCreate, InvoiceRead, InvoiceUpdate
from app.repositories.customers import CustomerRepository
from app.repositories.invoices import InvoiceRepository
from app.services.pdf_generation import render_document_pdf

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceRead])
async def list_invoices(session: SessionDep, limit: int = 100, offset: int = 0):
    return await InvoiceRepository(session).list(limit=limit, offset=offset)


@router.post("", response_model=InvoiceRead, status_code=201)
async def create_invoice(payload: InvoiceCreate, session: SessionDep):
    return await InvoiceRepository(session).create(**payload.model_dump())


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(invoice_id: uuid.UUID, session: SessionDep):
    invoice = await InvoiceRepository(session).get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(invoice_id: uuid.UUID, payload: InvoiceUpdate, session: SessionDep):
    repo = InvoiceRepository(session)
    invoice = await repo.get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await repo.update(invoice, **payload.model_dump(exclude_unset=True))


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(invoice_id: uuid.UUID, session: SessionDep):
    repo = InvoiceRepository(session)
    invoice = await repo.get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await repo.delete(invoice)


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: uuid.UUID, session: SessionDep):
    invoice = await InvoiceRepository(session).get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    customer = await CustomerRepository(session).get(invoice.customer_id)
    pdf_bytes = render_document_pdf(invoice, customer)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="invoice-{invoice_id}.pdf"'},
    )
