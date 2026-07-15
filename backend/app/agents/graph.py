from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.nodes import (
    MAX_REVIEW_ATTEMPTS,
    approval_node,
    context_node,
    direct_reply_node,
    generate_node,
    intake_node,
    review_node,
)
from app.agents.state import AgentState


def route_after_context(state: AgentState) -> str:
    if state["intake"].intent in ("quote_request", "invoice_request"):
        return "generate"
    return "direct_reply"


def route_after_review(state: AgentState) -> str:
    if state["review"].approved or state.get("review_attempts", 0) >= MAX_REVIEW_ATTEMPTS:
        return "approval"
    return "generate"


def build_agent_graph(session: AsyncSession):
    """Compiles the Intake -> Context -> Generate -> Review -> Approval graph,
    bound to a single request-scoped DB session."""

    async def _context(state: AgentState) -> dict:
        return await context_node(session, state)

    async def _generate(state: AgentState) -> dict:
        return await generate_node(session, state)

    async def _approval(state: AgentState) -> dict:
        return await approval_node(session, state)

    graph = StateGraph(AgentState)
    graph.add_node("intake", intake_node)
    graph.add_node("context", _context)
    graph.add_node("generate", _generate)
    graph.add_node("review", review_node)
    graph.add_node("approval", _approval)
    graph.add_node("direct_reply", direct_reply_node)

    graph.add_edge(START, "intake")
    graph.add_edge("intake", "context")
    graph.add_conditional_edges("context", route_after_context, {"generate": "generate", "direct_reply": "direct_reply"})
    graph.add_edge("generate", "review")
    graph.add_conditional_edges("review", route_after_review, {"approval": "approval", "generate": "generate"})
    graph.add_edge("approval", END)
    graph.add_edge("direct_reply", END)

    return graph.compile()
