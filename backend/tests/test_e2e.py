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
import app.services.followups as followups_module
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


async def test_rejected_approval_sends_decline_notice_without_leaking_the_quote(
    client: AsyncClient, monkeypatch
):
    """Rejecting no longer means the customer hears nothing: a generic decline
    notice goes out over WhatsApp (see approval_workflow.REJECTION_MESSAGE), but
    the internal `reason` and the quote's own priced customer_message must never
    reach the customer, and the document must stay "rejected" (not flip to
    "sent" the way approve/edit does). Built entirely through CRUD endpoints,
    same pattern as test_decide_edit_recomputes_totals_without_llm — no LLM
    needed."""
    sent = {}
    monkeypatch.setattr(
        approval_workflow_module, "send_whatsapp_message", lambda to, body: sent.update(to=to, body=body)
    )

    customer, conversation = await _make_customer_and_conversation(client, "RejectNotice")
    quotation = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "conversation_id": conversation["id"],
                "items": [
                    {
                        "product_name": "Widget",
                        "quantity": 500,
                        "unit_price": 100.0,
                        "line_total": 50000.0,
                        "is_service": False,
                        "assumptions": [],
                    }
                ],
                "subtotal": 50000.0,
                "tax_amount": 9000.0,
                "total": 59000.0,
                "customer_message": "Here is your quote for 500 Widgets: total 59000.",
            },
        )
    ).json()
    approval = (
        await client.post("/approvals", json={"document_type": "quotation", "document_id": quotation["id"]})
    ).json()

    decide = await client.post(
        f"/approvals/{approval['id']}/decide",
        json={"action": "reject", "decided_by": "tester@example.com", "reason": "too large for our capacity"},
    )
    assert decide.status_code == 200
    assert decide.json()["status"] == "rejected"

    assert sent["to"] == customer["phone_number"]
    assert sent["body"] == approval_workflow_module.REJECTION_MESSAGE
    assert "too large for our capacity" not in sent["body"]  # internal reason stays audit-only
    assert "59000" not in sent["body"]  # never leak the rejected quote's pricing

    rejected = (await client.get(f"/quotations/{quotation['id']}")).json()
    assert rejected["status"] == "rejected"  # never flips to "sent" like approve/edit does

    messages = (await client.get(f"/conversations/{conversation['id']}/messages")).json()
    assert any(
        m["direction"] == "outbound" and m["agent"] == "approval" and m["body"] == approval_workflow_module.REJECTION_MESSAGE
        for m in messages
    )


async def test_reject_send_failure_creates_delivery_failed_notification(client: AsyncClient, monkeypatch):
    def _raise(to, body):
        raise RuntimeError("simulated delivery failure")

    monkeypatch.setattr(approval_workflow_module, "send_whatsapp_message", _raise)

    customer = (
        await client.post("/customers", json={"name": "Reject Fail", "phone_number": _unique_phone_number()})
    ).json()
    quotation = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "items": [
                    {
                        "product_name": "Widget",
                        "quantity": 1,
                        "unit_price": 100.0,
                        "line_total": 100.0,
                        "is_service": False,
                        "assumptions": [],
                    }
                ],
                "subtotal": 100.0,
                "tax_amount": 18.0,
                "total": 118.0,
                "customer_message": "Here is your quote for 1 Widget.",
            },
        )
    ).json()
    approval = (
        await client.post("/approvals", json={"document_type": "quotation", "document_id": quotation["id"]})
    ).json()

    decide = await client.post(
        f"/approvals/{approval['id']}/decide",
        json={"action": "reject", "decided_by": "tester@example.com", "reason": "out of stock"},
    )
    assert decide.status_code == 200
    assert decide.json()["status"] == "rejected"

    notifications = (await client.get("/notifications")).json()
    assert any(n["type"] == "delivery_failed" and n["link_id"] == quotation["id"] for n in notifications)


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


async def test_decide_edit_recomputes_totals_without_llm(client: AsyncClient, monkeypatch):
    """Exercises the edit-then-approve path (recompute, audit, delivery-failure
    notification) entirely through CRUD endpoints — no LLM needed. Twilio's send
    is forced to fail via monkeypatch (not just "no credentials configured") since
    a real Twilio account will accept a message submission for an unjoined/fake
    number without raising synchronously — it just never arrives."""

    def _raise(to, body):
        raise RuntimeError("simulated delivery failure")

    monkeypatch.setattr(approval_workflow_module, "send_whatsapp_message", _raise)

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

    # Simulated Twilio failure -> surfaced as a notification instead of a 500.
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


def _followup_items(product_name: str, quantity: int = 3):
    return [
        {
            "product_name": product_name,
            "quantity": quantity,
            "unit_price": 50.0,
            "line_total": 50.0 * quantity,
            "is_service": False,
            "assumptions": [],
        }
    ]


@requires_openai
async def test_followup_search_finds_delivered_but_not_pending_documents(client: AsyncClient):
    """search_delivered() must exclude pending_approval documents — the customer
    never saw that pricing, so a follow-up shouldn't reference it."""
    customer, conversation = await _make_customer_and_conversation(client, "FollowupSearch")

    delivered = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "conversation_id": conversation["id"],
                "status": "approved",
                "items": _followup_items("Zzyzx Followup Test Widget"),
                "subtotal": 150.0,
                "tax_amount": 27.0,
                "total": 177.0,
                "customer_message": "Here is your quote for 3 Zzyzx Followup Test Widgets.",
            },
        )
    ).json()
    pending = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "conversation_id": conversation["id"],
                "status": "pending_approval",
                "items": _followup_items("Zzyzx Followup Test Widget"),
                "subtotal": 150.0,
                "tax_amount": 27.0,
                "total": 177.0,
                "customer_message": "Here is your quote for 3 Zzyzx Followup Test Widgets.",
            },
        )
    ).json()

    response = await client.post("/follow-ups/search", json={"description": "Zzyzx Followup Test Widget"})
    assert response.status_code == 200
    candidate_ids = {c["document_id"] for c in response.json()["candidates"]}
    assert delivered["id"] in candidate_ids
    assert pending["id"] not in candidate_ids


async def test_followup_send_delivers_and_logs_outbound_message(client: AsyncClient, monkeypatch):
    sent = {}
    monkeypatch.setattr(followups_module, "send_whatsapp_message", lambda to, body: sent.update(to=to, body=body))

    customer, conversation = await _make_customer_and_conversation(client, "FollowupSend")
    quotation = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "conversation_id": conversation["id"],
                "status": "sent",
                "items": _followup_items("Widget", quantity=2),
                "subtotal": 200.0,
                "tax_amount": 36.0,
                "total": 236.0,
                "customer_message": "Here is your quote for 2 Widgets.",
            },
        )
    ).json()

    response = await client.post(
        "/follow-ups/send",
        json={
            "document_type": "quotation",
            "document_id": quotation["id"],
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "message": "Just checking in on your quote!",
        },
    )
    assert response.status_code == 200
    assert response.json()["sent"] is True
    assert sent["to"] == customer["phone_number"]

    messages = (await client.get(f"/conversations/{conversation['id']}/messages")).json()
    assert any(m["direction"] == "outbound" and m["agent"] == "followup" for m in messages)

    notifications = (await client.get("/notifications")).json()
    assert any(n["type"] == "followup_sent" and n["link_id"] == quotation["id"] for n in notifications)


async def test_followup_send_failure_creates_delivery_failed_notification(client: AsyncClient, monkeypatch):
    def _raise(to, body):
        raise RuntimeError("Twilio boom")

    monkeypatch.setattr(followups_module, "send_whatsapp_message", _raise)

    customer, conversation = await _make_customer_and_conversation(client, "FollowupSendFail")
    quotation = (
        await client.post(
            "/quotations",
            json={
                "customer_id": customer["id"],
                "conversation_id": conversation["id"],
                "status": "sent",
                "items": _followup_items("Widget", quantity=1),
                "subtotal": 100.0,
                "tax_amount": 18.0,
                "total": 118.0,
                "customer_message": "Here is your quote for 1 Widget.",
            },
        )
    ).json()

    response = await client.post(
        "/follow-ups/send",
        json={
            "document_type": "quotation",
            "document_id": quotation["id"],
            "conversation_id": conversation["id"],
            "customer_id": customer["id"],
            "message": "Just checking in on your quote!",
        },
    )
    assert response.status_code == 200
    assert response.json()["sent"] is False

    notifications = (await client.get("/notifications")).json()
    assert any(n["type"] == "delivery_failed" and n["link_id"] == quotation["id"] for n in notifications)
