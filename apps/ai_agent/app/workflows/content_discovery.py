from typing import Any, Dict, List

from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel

from .base import BaseWorkflow, WorkflowConfig


class ContentDiscoveryConfig(BaseModel):
    """Configuration for content discovery workflow"""

    model: WorkflowConfig = WorkflowConfig(max_tokens=1000)

    max_candidates: int = 5
    min_relevance_score: float = 0.6
    similarity_threshold: float = 0.8


class ContentDiscoveryWorkflow(BaseWorkflow):
    """Workflow for discovering relevant content and replies"""

    def __init__(self, config: ContentDiscoveryConfig = ContentDiscoveryConfig()):
        self.config = config
        self.model = config.model.create_model()
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """
            Find relevant replies and content for this Farcaster cast. Consider:
            1. Similar discussions and their outcomes
            2. User engagement patterns
            3. Content relevance and quality
            4. Context and timing
            
            For each candidate reply, provide:
            - Reply text
            - Source (user/cast ID)
            - Relevance score (0-1)
            - Reasoning for selection
            """,
                ),
                (
                    "user",
                    """
            Cast: {cast_text}
            Context: {context}
            """,
                ),
            ]
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Discover relevant content and potential replies"""
        response = await self.model.ainvoke(
            self.prompt.format_messages(
                cast_text=input_data["cast_text"],
                context=input_data.get("context", "No additional context provided"),
            )
        )

        # In a real implementation, you would:
        # 1. Query your Farcaster data store
        # 2. Use embeddings for similarity search
        # 3. Filter by relevance and engagement metrics
        # This is a simplified example

        candidates = [
            {
                "text": response.content,
                "source": {"user_id": "ai_generated", "cast_id": "generated"},
                "relevance_score": 0.8,
                "reasoning": "AI-generated response based on content analysis",
            }
        ]

        return {
            "candidates": candidates[: self.config.max_candidates],
            "total_candidates_found": len(candidates),
            "filtering_criteria": {
                "min_relevance": self.config.min_relevance_score,
                "similarity_threshold": self.config.similarity_threshold,
            },
        }

    def get_config(self) -> Dict[str, Any]:
        return self.config.model_dump()

