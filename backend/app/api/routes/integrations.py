from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/status")
async def integrations_status():
    """Whether-configured flags only — never the secret values themselves."""
    return {
        "whatsapp_configured": bool(
            settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_whatsapp_number
        ),
        "gmail_configured": bool(settings.gmail_address and settings.gmail_app_password),
        "auto_approve_threshold": settings.auto_approve_threshold,
        "tax_rate": 0.18,
        "currency": "INR",
    }
