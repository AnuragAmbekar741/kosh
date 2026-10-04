from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Index, UniqueConstraint, column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

_JSON = JSONB().with_variant(JSON(), "sqlite")


class AgentChannel(StrEnum):
    WEB = "web"
    WHATSAPP = "whatsapp"


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class RunStatus(StrEnum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentConversation(SQLModel, table=True):
    __tablename__ = "agent_conversations"
    __table_args__ = (
        Index(
            "ix_agent_conversations_user_updated",
            "user_id",
            column("updated_at").desc(),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    channel: str = AgentChannel.WEB
    title: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AgentRun(SQLModel, table=True):
    """One user turn: the model loop from the user's message to the reply."""

    __tablename__ = "agent_runs"
    __table_args__ = (Index("ix_agent_runs_user_started", "user_id", "started_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="agent_conversations.id", index=True)
    user_id: UUID = Field(foreign_key="users.id")
    status: str = RunStatus.RUNNING
    model: str
    prompt_version: str
    steps: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: str | None = None
    error: str | None = None
    feedback: int | None = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    finished_at: datetime | None = None


class AgentMessage(SQLModel, table=True):
    """One chat message in the OpenAI shape, so history replays without translation."""

    __tablename__ = "agent_messages"
    __table_args__ = (
        UniqueConstraint("conversation_id", "seq", name="uq_agent_message_seq"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="agent_conversations.id")
    run_id: UUID | None = Field(default=None, foreign_key="agent_runs.id")
    seq: int
    role: str
    content: str | None = None
    tool_calls: list[dict] | None = Field(
        default=None, sa_column=Column(_JSON, nullable=True)
    )
    tool_call_id: str | None = None
    document_ids: list[str] | None = Field(
        default=None, sa_column=Column(_JSON, nullable=True)
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
