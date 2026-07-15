"""Run the eval set against the live agent graph.

Usage (from backend/): python -m app.agents.eval.run_eval
Requires OPENAI_API_KEY and a running local Supabase Postgres (DATABASE_URL).
Creates a throwaway eval customer/conversation, runs each case, then deletes
the customer (cascades away the conversation/messages/quotations/invoices it
produced).
"""

import asyncio

from app.agents.eval.cases import CASES
from app.agents.graph import build_agent_graph
from app.core.db import SessionLocal
from app.repositories.conversations import ConversationRepository
from app.repositories.customers import CustomerRepository

EVAL_PHONE = "+10000000000-eval"


async def run() -> None:
    async with SessionLocal() as session:
        customers = CustomerRepository(session)
        existing = await customers.get_by_phone_number(EVAL_PHONE)
        if existing:
            await customers.delete(existing)

        customer = await customers.create(name="Eval Customer", phone_number=EVAL_PHONE)
        conversation = await ConversationRepository(session).create(customer_id=customer.id, channel="eval")

        passed = 0
        for case in CASES:
            graph = build_agent_graph(session)
            result = await graph.ainvoke(
                {
                    "conversation_id": conversation.id,
                    "customer_id": customer.id,
                    "customer_message": case["message"],
                }
            )

            intake = result["intake"]
            document = result.get("document")
            issues = []

            if intake.intent != case["expected_intent"]:
                issues.append(f"intent={intake.intent!r}, expected {case['expected_intent']!r}")

            has_document = document is not None
            if has_document != case["expect_document"]:
                issues.append(f"expect_document={case['expect_document']}, got {has_document}")

            if document:
                recomputed_total = round(document.subtotal + document.tax_amount, 2)
                if abs(recomputed_total - document.total) > 0.01:
                    issues.append(f"total mismatch: subtotal+tax={recomputed_total} != total={document.total}")
                if not document.line_items:
                    issues.append("document has no line items")

            if case.get("expect_assumptions") and document:
                if not any(li.assumptions for li in document.line_items):
                    issues.append("expected at least one line item assumption, found none")

            status = "PASS" if not issues else "FAIL"
            if status == "PASS":
                passed += 1
            print(f"[{status}] {case['name']}: {'; '.join(issues) if issues else 'ok'}")

        await customers.delete(customer)
        print(f"\n{passed}/{len(CASES)} cases passed")


if __name__ == "__main__":
    asyncio.run(run())
