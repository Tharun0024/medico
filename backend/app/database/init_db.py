"""
MEDICO Database Initialization

Creates all tables on startup.
"""

from app.database.base import Base
from app.database.session import engine


async def init_db() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
