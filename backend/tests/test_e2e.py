"""End-to-end coverage of the Phase 2-5 pipeline: intake -> quote/invoice ->
approval gate -> delivery, plus edge cases (missing product, gibberish,
unknown IDs, double-decide).

Tests that exercise the LLM (Intake/Context/Generate/Review) are skipped
unless a real OpenAI key is configured, same convention as
app.agents.eval.run_eval. Tests that only exercise the approval/notification/
PDF machinery build their fixtures directly through the CRUD endpoints, so
they run without any external credentials.

Uses httpx.AsyncClient (not FastAPI's sync TestClient) so every request runs
on the same asyncio event loop the app's async SQLAlchemy engine was created
on — TestClient spins a fresh loop per call, which breaks asyncpg's
loop-bound connections ("cannot perform operation: another operation is in
progress").

Requires the local Supabase Postgres stack running with migrations applied
(DATABASE_URL in backend/.env) — there is no separate test database.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

import app.services.approval_workflow as approval_workflow_module
from app.core.config import settings
from app.main import app

requires_openai = pytest.mark.skipif(
    not settings.openai_api_key, reason="requires a real OPENAI_API_KEY to exercise the LLM"
)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


def _unique_phone_number() -> str:
    # Tests run repeatedly against the live local stack (no ephemeral test DB),
    # and POST /customers 409s on a phone_number that already exists — so each
    # run needs fresh numbers rather than fixed ones.
    return f"+1555{uuid.uuid4().int % 10_000_000:07d}"


async def _make_customer_and_conversation(client: AsyncClient, name: str):
    customer = (
        await client.post("/customers", json={"name": name, "phone_number": _unique_phone_number()})
    ).json()
    conversation = (
        await client.post("/conversations", json={"customer_id": customer["id"], "channel": "whatsapp"})
    ).json()
    return customer, conversation


@requires_openai
async def test_small_quote_is_auto_approved_with_full_pricing(client: AsyncClient):
    customer, conversation = await _make_customer_and_conversation(client, "0001")
    response = await client.post(
        "/agent/message",
        json={
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "message": "Quote me 2 ceramic coffee mugs",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["document_type"] == "quotation"
    assert body["requires_human_approval"] is False
    assert body["total"] > 0

    pdf = await client.get(f"/quotations/{body['document_id']}/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert len(pdf.content) > 500


@requires_openai
async def test_large_quote_is_gated_then_delivered_on_approval(client: AsyncClient, monkeypatch):
    sent = {}
    monkeypatch.setattr(
        approval_workflow_module, "send_whatsapp_message", lambda to, body: sent.update(to=to, body=body)
    )

    customer, conversation = await _make_customer_and_conversation(client, "0002")
    response = await client.post(
        "/agent/message",
        json={
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "message": "I need 500 throw pillows for a hotel order, please quote me",
        },
    )
    body = response.json()
    assert body["requires_human_approval"] is True
    # the gate: the immediate reply must not leak the priced total
    assert str(body["total"]) not in body["reply"]

    pending = (await client.get("/approvals?status=pending")).json()
    approval = next(a for a in pending if a["document_id"] == body["document_id"])

    decide = await client.post(
        f"/approvals/{approval['id']}/decide", json={"action": "approve", "decided_by": "tester@example.com"}
    )
    assert decide.status_code == 200
    assert decide.json()["status"] == "approved"
    assert sent["to"] == customer["phone_number"]
    assert sent["body"]

    quotation = (await client.get(f"/quotations/{body['document_id']}")).json()
    assert quotation["status"] == "sent"

    again = await client.post(
        f"/approvals/{approval['id']}/decide", json={"action": "approve", "decided_by": "tester@example.com"}
    )
    assert again.status_code == 400


@requires_openai
async def test_rejected_approval_never_delivers(client: AsyncClient, monkeypatch):
    calls = []
    monkeypatch.setattr(approval_workflow_module, "send_whatsapp_message", lambda *a, **k: calls.append(a))

    customer, conversation = await _make_customer_and_conversation(client, "0003")
    response = await client.post(
        "/agent/message",
        json={
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "message": "I need 500 throw pillows for a hotel order, please quote me",
        },
    )
    body = response.json()
    pending = (await client.get("/approvals?status=pending")).json()
    approval = next(a for a in pending if a["document_id"] == body["document_id"])

    decide = await client.post(
        f"/approvals/{approval['id']}/decide",
        json={"action": "reject", "decided_by": "tester@example.com", "reason": "too large for our capacity"},
    )
    assert decide.status_code == 200
    assert decide.json()["status"] == "rejected"
    assert calls == []

    quotation = (await client.get(f"/quotations/{body['document_id']}")).json()
    assert quotation["status"] == "rejected"


@requires_openai
async def test_gibberish_does_not_crash_the_pipeline(client: AsyncClient):
    customer, conversation = await _make_customer_and_conversation(client, "0004")
    response = await client.post(
        "/agent/message",
        json={"conversation_id": conversation["id"], "customer_id": customer["id"], "message": "asdkjhaskjdh ??? !!1"},
    )
    assert response.status_code == 200
    assert response.json()["reply"]


@requires_openai
async def test_request_for_unknown_product_still_replies(client: AsyncClient):
    customer, conversation = await _make_customer_and_conversation(client, "0005")
    response = await client.post(
        "/agent/message",
        json={
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "message": "Can I get a quote for a industrial spaceship engine?",
        },
    )
    assert response.status_code == 200
    assert response.json()["reply"]


async def test_decide_edit_recomputes_totals_without_llm(client: AsyncClient):
    """Exercises the edit-then-approve path (recompute, audit, delivery-failure
    notification) entirely through CRUD endpoints — no LLM or Twilio needed."""
    customer = (
        await client.post("/customers", json={"name": "Edit Test", "phone_number": _unique_phone_number()})
    ).json()
    quotation = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "items": [
                    {
                        "product_name": "Widget",
                        "quantity": 2,
                        "unit_price": 100.0,
                        "line_total": 200.0,
                        "is_service": False,
                        "assumptions": [],
                    }
                ],
                "subtotal": 200.0,
                "tax_amount": 36.0,
                "total": 236.0,
                "customer_message": "Here is your quote for 2 Widgets.",
            },
        )
    ).json()
    approval = (
        await client.post("/approvals", json={"document_type": "quotation", "document_id": quotation["id"]})
    ).json()

    edited_items = [
        {
            "product_name": "Widget",
            "quantity": 5,
            "unit_price": 100.0,
            "line_total": 500.0,
            "is_service": False,
            "assumptions": [],
        }
    ]
    decide = await client.post(
        f"/approvals/{approval['id']}/decide",
        json={"action": "edit", "decided_by": "tester@example.com", "edited_items": edited_items},
    )
    assert decide.status_code == 200
    assert decide.json()["status"] == "edited"

    updated = (await client.get(f"/quotations/{quotation['id']}")).json()
    assert updated["subtotal"] == 500.0
    assert updated["total"] == 590.0  # 500 + 18% GST

    # No Twilio credentials configured in this environment -> delivery fails ->
    # surfaced as a notification instead of a 500.
    notifications = (await client.get("/notifications")).json()
    assert any(n["type"] == "delivery_failed" and n["link_id"] == quotation["id"] for n in notifications)


async def test_pdf_404_for_unknown_quotation(client: AsyncClient):
    response = await client.get(f"/quotations/{uuid.uuid4()}/pdf")
    assert response.status_code == 404


async def test_decide_unknown_approval_404(client: AsyncClient):
    response = await client.post(
        f"/approvals/{uuid.uuid4()}/decide", json={"action": "approve", "decided_by": "tester@example.com"}
    )
    assert response.status_code == 404


async def test_notifications_list_and_unread_count_shape(client: AsyncClient):
    notifications = (await client.get("/notifications")).json()
    assert isinstance(notifications, list)
    unread = (await client.get("/notifications/unread-count")).json()
    assert isinstance(unread["count"], int)


async def test_mark_unknown_notification_read_404(client: AsyncClient):
    response = await client.patch(f"/notifications/{uuid.uuid4()}/read")
    assert response.status_code == 404


async def test_integrations_status_never_leaks_secrets(client: AsyncClient):
    response = await client.get("/integrations/status")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "whatsapp_configured",
        "gmail_configured",
        "auto_approve_threshold",
        "tax_rate",
        "currency",
    }
