import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import SessionDep
from app.models.schemas import (
    ConversationCreate,
    ConversationMessageCreate,
    ConversationMessageRead,
    ConversationRead,
    ConversationUpdate,
)
from app.repositories.conversations import ConversationMessageRepository, ConversationRepository

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationRead])
async def list_conversations(session: SessionDep, limit: int = 100, offset: int = 0):
    return await ConversationRepository(session).list(limit=limit, offset=offset)


@router.post("", response_model=ConversationRead, status_code=201)
async def create_conversation(payload: ConversationCreate, session: SessionDep):
    return await ConversationRepository(session).create(**payload.model_dump())


@router.get("/{conversation_id}", response_model=ConversationRead)
async def get_conversation(conversation_id: uuid.UUID, session: SessionDep):
    conversation = await ConversationRepository(session).get(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.patch("/{conversation_id}", response_model=ConversationRead)
async def update_conversation(conversation_id: uuid.UUID, payload: ConversationUpdate, session: SessionDep):
    repo = ConversationRepository(session)
    conversation = await repo.get(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return await repo.update(conversation, **payload.model_dump(exclude_unset=True))


@router.get("/{conversation_id}/messages", response_model=list[ConversationMessageRead])
async def list_messages(conversation_id: uuid.UUID, session: SessionDep):
    return await ConversationMessageRepository(session).list_for_conversation(conversation_id)


@router.post("/{conversation_id}/messages", response_model=ConversationMessageRead, status_code=201)
async def create_message(conversation_id: uuid.UUID, payload: ConversationMessageCreate, session: SessionDep):
    if payload.conversation_id != conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id in body must match the URL")
    return await ConversationMessageRepository(session).create(**payload.model_dump())
