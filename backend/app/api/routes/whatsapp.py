from fastapi import APIRouter, HTTPException, Request, Response

from app.agents.runner import run_agent_turn
from app.api.deps import SessionDep
from app.repositories.conversations import ConversationRepository
from app.repositories.customers import CustomerRepository
from app.repositories.notifications import NotificationRepository
from app.services.whatsapp import send_whatsapp_message, verify_twilio_signature

router = APIRouter(prefix="/webhooks", tags=["whatsapp"])


def _external_url(request: Request) -> str:
    """Reconstructs the URL Twilio actually signed against.

    Twilio's signature covers the public URL it POSTed to; behind a tunnel
    (ngrok) or reverse proxy, `request.url` reflects the internal scheme/host
    instead, so prefer the forwarded headers when present.
    """
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    url = f"{proto}://{host}{request.url.path}"
    if request.url.query:
        url += f"?{request.url.query}"
    return url


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, session: SessionDep) -> Response:
    """Inbound Twilio WhatsApp message -> agent graph -> outbound reply.

    Twilio POSTs form-encoded fields (From, Body, ...) and an
    X-Twilio-Signature header computed over the exact URL + those fields.
    An empty/unconfigured TWILIO_AUTH_TOKEN makes every signature check fail
    closed, which is the correct default until real credentials are set.
    """
    form = await request.form()
    params = {key: str(value) for key, value in form.items()}
    signature = request.headers.get("x-twilio-signature", "")

    if not verify_twilio_signature(_external_url(request), params, signature):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    from_address = params.get("From", "")
    body = params.get("Body", "")
    phone_number = from_address.removeprefix("whatsapp:")

    if not phone_number or not body:
        raise HTTPException(status_code=400, detail="Missing From/Body in webhook payload")

    customers = CustomerRepository(session)
    customer = await customers.get_by_phone_number(phone_number)
    if not customer:
        customer = await customers.create(phone_number=phone_number)

    conversations = ConversationRepository(session)
    conversation = await conversations.get_active_for_customer(customer.id)
    if not conversation:
        conversation = await conversations.create(customer_id=customer.id, channel="whatsapp")

    result = await run_agent_turn(session, conversation_id=conversation.id, customer_id=customer.id, message=body)
    reply = result.get("final_reply", "")

    if reply:
        try:
            send_whatsapp_message(phone_number, reply)
        except Exception as exc:
            await NotificationRepository(session).create(
                type="delivery_failed",
                title="Failed to deliver WhatsApp reply",
                body=str(exc),
                link_type="conversation",
                link_id=conversation.id,
            )

    return Response(content="<Response></Response>", media_type="application/xml")
