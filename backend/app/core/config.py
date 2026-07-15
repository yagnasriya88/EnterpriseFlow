from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    # Documents with total <= this are auto-approved; above it, routed to the human Approval queue.
    auto_approve_threshold: float = 5000.0
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""  # "whatsapp:+1415XXXXXXX" format, the Twilio-side sender

    # Gmail SMTP (app password), not the full Gmail OAuth API — see services/email_notifications.py
    # for why. Optional: internal alerts silently no-op when unset.
    gmail_address: str = ""
    gmail_app_password: str = ""
    notify_to_email: str = ""  # internal recipient for approval-needed / delivery-failed alerts

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
