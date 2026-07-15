from fastapi import FastAPI

from app.api.routes import (
    agent,
    approvals,
    conversations,
    customers,
    followups,
    health,
    integrations,
    invoices,
    notifications,
    policy_documents,
    products,
    quotations,
    whatsapp,
)

app = FastAPI(title="EnterpriseFlow API")

app.include_router(health.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(conversations.router)
app.include_router(quotations.router)
app.include_router(invoices.router)
app.include_router(approvals.router)
app.include_router(policy_documents.router)
app.include_router(notifications.router)
app.include_router(integrations.router)
app.include_router(agent.router)
app.include_router(whatsapp.router)
app.include_router(followups.router)
