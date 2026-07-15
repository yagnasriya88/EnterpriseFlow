import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import SessionDep
from app.models.schemas import ApprovalCreate, ApprovalDecideRequest, ApprovalRead, ApprovalUpdate
from app.repositories.approvals import ApprovalRepository
from app.services.approval_workflow import ApprovalAlreadyDecidedError, decide_approval

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRead])
async def list_approvals(session: SessionDep, limit: int = 100, offset: int = 0, status: str | None = None):
    approvals = await ApprovalRepository(session).list(limit=limit, offset=offset)
    if status:
        approvals = [approval for approval in approvals if approval.status == status]
    return approvals


@router.post("", response_model=ApprovalRead, status_code=201)
async def create_approval(payload: ApprovalCreate, session: SessionDep):
    return await ApprovalRepository(session).create(**payload.model_dump())


@router.get("/{approval_id}", response_model=ApprovalRead)
async def get_approval(approval_id: uuid.UUID, session: SessionDep):
    approval = await ApprovalRepository(session).get(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approval


@router.patch("/{approval_id}", response_model=ApprovalRead)
async def update_approval(approval_id: uuid.UUID, payload: ApprovalUpdate, session: SessionDep):
    repo = ApprovalRepository(session)
    approval = await repo.get(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    return await repo.update(approval, **payload.model_dump(exclude_unset=True))


@router.post("/{approval_id}/decide", response_model=ApprovalRead)
async def decide_approval_route(approval_id: uuid.UUID, payload: ApprovalDecideRequest, session: SessionDep):
    approval = await ApprovalRepository(session).get(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    try:
        approval, _document, _delivered = await decide_approval(
            session,
            approval,
            action=payload.action,
            decided_by=payload.decided_by,
            reason=payload.reason,
            edited_items=payload.edited_items,
            edited_customer_message=payload.edited_customer_message,
        )
    except ApprovalAlreadyDecidedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return approval
