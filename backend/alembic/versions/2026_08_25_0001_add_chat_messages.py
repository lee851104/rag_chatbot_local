"""add_chat_messages_table

Revision ID: 8f4c1a2b3d4e
Revises: 040b0da03c42
Create Date: 2026-08-25
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "8f4c1a2b3d4e"
down_revision: Union[str, Sequence[str], None] = "040b0da03c42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("question", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("answer", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_chat_messages_conversation_id", table_name="chat_messages")
    op.drop_table("chat_messages")
