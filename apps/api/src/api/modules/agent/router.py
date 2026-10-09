from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status
from fastapi.responses import StreamingResponse
from security import CurrentUserDep
from storage.crud import agent as crud

from api.common.dependencies import SessionDep
from api.common.pagination import Page, Paginated
from api.modules.agent import presenter, service
from api.modules.agent.schemas import (
    ConversationDetail,
    ConversationPublic,
    MessageCreate,
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(
    user: CurrentUserDep, session: SessionDep
) -> ConversationPublic:
    return presenter.to_public(service.create_conversation(session, user.id))


@router.get("/conversations")
def list_conversations(
    user: CurrentUserDep, session: SessionDep, page: Annotated[Page, Query()]
) -> Paginated[ConversationPublic]:
    rows, total = service.list_conversations(
        session, user.id, skip=page.skip, limit=page.limit
    )
    return Paginated(data=[presenter.to_public(row) for row in rows], total=total)


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: UUID, user: CurrentUserDep, session: SessionDep
) -> ConversationDetail:
    conversation = service.get_owned(session, user.id, conversation_id)
    return presenter.to_detail(
        conversation,
        crud.list_messages(session, conversation_id=conversation.id),
        crud.list_runs(session, conversation_id=conversation.id),
        stale_after=service.STALE_AFTER,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_class=StreamingResponse,
    responses={200: {"content": {"text/event-stream": {}}}},
)
def send_message(
    conversation_id: UUID,
    body: MessageCreate,
    user: CurrentUserDep,
    session: SessionDep,
) -> StreamingResponse:
    """Stream the reply as server-sent events: tool, delta, done or error."""
    run = service.start_message(session, user.id, conversation_id, body.text)
    # Give the connection back now; the turn opens its own short sessions.
    session.close()
    return StreamingResponse(
        service.stream(run),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
