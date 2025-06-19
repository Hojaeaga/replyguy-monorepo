from functools import lru_cache
from typing import Dict, Any
from pydantic_settings import BaseSettings
from pydantic import BaseModel

class Settings(BaseSettings):
    openai_api_key: str
    ai_agent_url: str

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings() 