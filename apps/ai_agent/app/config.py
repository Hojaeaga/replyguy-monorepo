from functools import lru_cache
from typing import Dict, Any

from pydantic_settings import BaseSettings
from pydantic import BaseModel

from .workflows.intent_analysis import IntentAnalysisConfig
from .workflows.content_discovery import ContentDiscoveryConfig
from .workflows.reply_generation import ReplyGenerationConfig

class WorkflowSettings(BaseModel):
    """Settings for all workflows"""
    intent_analysis: Dict[str, Any] = {
        "max_tokens": 500,
        "confidence_threshold": 0.7,
        "relevance_threshold": 0.6
    }
    
    content_discovery: Dict[str, Any] = {
        "max_tokens": 1000,
        "max_candidates": 5,
        "min_relevance_score": 0.6,
        "similarity_threshold": 0.8
    }
    
    reply_generation: Dict[str, Any] = {
        "max_tokens": 280,
        "max_attempts": 3,
        "min_quality_score": 0.7,
        "style_guidelines": {
            "tone": "conversational",
            "formality": "casual",
            "max_length": 280,
            "include_emojis": True
        }
    }

class Settings(BaseSettings):
    """Application settings"""
    openai_api_key: str
    farcaster_api_key: str
    environment: str = "development"
    debug: bool = False
    
    # Workflow configurations
    workflows: WorkflowSettings = WorkflowSettings()
    
    def get_pipeline_config(self):
        """Get configuration for the pipeline"""
        return {
            "intent_analysis": IntentAnalysisConfig(**self.workflows.intent_analysis),
            "content_discovery": ContentDiscoveryConfig(**self.workflows.content_discovery),
            "reply_generation": ReplyGenerationConfig(**self.workflows.reply_generation)
        }
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings() 