from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str
    STORAGE_PATH: str = "/vault"
    CORS_ORIGINS: str = "http://localhost:5173"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()
