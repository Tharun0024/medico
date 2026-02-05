from pathlib import Path
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "Ambulance Priority Traffic System"
    DEBUG: bool = True

    DATA_DIR: Path = BASE_DIR / "data"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
