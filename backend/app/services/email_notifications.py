"""Optional internal-alert email via Gmail SMTP (app password), not the full
Gmail OAuth API: the OAuth consent flow needs a Google Cloud project + a
verified redirect URI, which the user can't stand up without live setup —
same class of blocker as Twilio in Phase 3. An SMTP app password gets the
same "optional Gmail notification hook" outcome (PLAN.md Phase 4) without a
live OAuth app, and is real Gmail infrastructure, not a mock.

Silently no-ops when unconfigured (this is "optional" per PLAN.md) rather
than failing closed like Twilio's webhook signature check — there's no
security exposure in skipping an internal notification.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email_notification(subject: str, body: str, to: str | None = None) -> bool:
    recipient = to or settings.notify_to_email
    if not settings.gmail_address or not settings.gmail_app_password or not recipient:
        logger.info("Email notification skipped (Gmail not configured): %s", subject)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.gmail_address
    message["To"] = recipient
    message.set_content(body)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(settings.gmail_address, settings.gmail_app_password)
        smtp.send_message(message)
    return True
