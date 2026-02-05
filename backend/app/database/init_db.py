"""
MEDICO Database Initialization

Creates all tables on startup.
"""

from app.database.base import Base
from app.database.session import engine

# Import all models to register them with Base.metadata
from app.modules.hospitals.models import Hospital  # noqa: F401
from app.modules.beds.models import BedGroup  # noqa: F401
from app.modules.emergencies.models import EmergencyCase  # noqa: F401
from app.modules.patients.models import Patient  # noqa: F401
from app.modules.waste.models import WasteRequest, DisposalLog  # noqa: F401
from app.notifications.models import Notification  # noqa: F401


async def init_db() -> None:
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
