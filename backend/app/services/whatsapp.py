"""Twilio WhatsApp send + inbound-webhook signature verification.

Lazily-constructed client, same reasoning as app.agents.tools._get_client:
the app must still boot before Twilio credentials exist in `.env`.
"""

from twilio.request_validator import RequestValidator
from twilio.rest import Client

from app.core.config import settings

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


def _as_whatsapp_address(phone_number: str) -> str:
    return phone_number if phone_number.startswith("whatsapp:") else f"whatsapp:{phone_number}"


def send_whatsapp_message(to_phone_number: str, body: str) -> None:
    _get_client().messages.create(
        from_=_as_whatsapp_address(settings.twilio_whatsapp_number),
        to=_as_whatsapp_address(to_phone_number),
        body=body,
    )


def verify_twilio_signature(url: str, form_params: dict, signature: str) -> bool:
    validator = RequestValidator(settings.twilio_auth_token)
    return validator.validate(url, form_params, signature)
