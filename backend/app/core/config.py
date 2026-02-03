"""
MEDICO Configuration Module

Centralized settings management using Pydantic.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "MEDICO"
    app_version: str = "0.1.0"
    debug: bool = False

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database (placeholder for future)
    database_url: str = "sqlite+aiosqlite:///./medico.db"

    # Simulation
    simulation_enabled: bool = False
    simulation_hospital_interval: float = 8.0
    simulation_emergency_interval: float = 15.0
    simulation_waste_interval: float = 20.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
