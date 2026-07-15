"""PDF policy document ingestion: parse -> chunk -> embed -> persist.

Feeds the same `policy_document_chunks` table the Context agent's
pgvector search (app.agents.tools.policy_semantic_search) reads from.
"""

from io import BytesIO

from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import embed_text
from app.models.orm import PolicyDocument
from app.repositories.policy_documents import PolicyDocumentChunkRepository, PolicyDocumentRepository

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def parse_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        chunk = text[start : start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


async def ingest_policy_document(
    session: AsyncSession, *, title: str, source_filename: str | None, file_bytes: bytes
) -> PolicyDocument:
    text = parse_pdf_text(file_bytes)
    chunks = chunk_text(text)

    document = await PolicyDocumentRepository(session).create(title=title, source_filename=source_filename)

    chunk_repo = PolicyDocumentChunkRepository(session)
    for index, content in enumerate(chunks):
        embedding = await embed_text(content)
        await chunk_repo.create(policy_document_id=document.id, chunk_index=index, content=content, embedding=embedding)

    return document
