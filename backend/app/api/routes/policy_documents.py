import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.api.deps import SessionDep
from app.models.schemas import PolicyDocumentChunkRead, PolicyDocumentCreate, PolicyDocumentRead
from app.repositories.policy_documents import PolicyDocumentChunkRepository, PolicyDocumentRepository
from app.services.policy_ingestion import ingest_policy_document

router = APIRouter(prefix="/policy-documents", tags=["policy_documents"])


@router.get("", response_model=list[PolicyDocumentRead])
async def list_policy_documents(session: SessionDep, limit: int = 100, offset: int = 0):
    return await PolicyDocumentRepository(session).list(limit=limit, offset=offset)


@router.post("", response_model=PolicyDocumentRead, status_code=201)
async def create_policy_document(payload: PolicyDocumentCreate, session: SessionDep):
    """Registers a policy document's metadata only, with no chunks/embeddings. Prefer /upload for PDFs."""
    return await PolicyDocumentRepository(session).create(**payload.model_dump())


@router.post("/upload", response_model=PolicyDocumentRead, status_code=201)
async def upload_policy_document(session: SessionDep, title: str = Form(...), file: UploadFile = File(...)):
    """Parses an uploaded PDF, chunks it, embeds each chunk, and persists document + chunks."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only application/pdf uploads are supported")
    file_bytes = await file.read()
    return await ingest_policy_document(session, title=title, source_filename=file.filename, file_bytes=file_bytes)


@router.get("/{policy_document_id}", response_model=PolicyDocumentRead)
async def get_policy_document(policy_document_id: uuid.UUID, session: SessionDep):
    document = await PolicyDocumentRepository(session).get(policy_document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Policy document not found")
    return document


@router.get("/{policy_document_id}/chunks", response_model=list[PolicyDocumentChunkRead])
async def list_policy_document_chunks(policy_document_id: uuid.UUID, session: SessionDep):
    return await PolicyDocumentChunkRepository(session).list_for_document(policy_document_id)


@router.delete("/{policy_document_id}", status_code=204)
async def delete_policy_document(policy_document_id: uuid.UUID, session: SessionDep):
    repo = PolicyDocumentRepository(session)
    document = await repo.get(policy_document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Policy document not found")
    await repo.delete(document)
