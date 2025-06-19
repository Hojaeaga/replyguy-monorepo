from typing import Dict, Any, Optional
from pydantic import BaseModel
from ..nodes.user_analysis_nodes import (
    generate_embedding,
    analyze_user_profile
)

class UserData(BaseModel):
    """Input data for user analysis"""
    fid: int
    profile: Dict[str, Any]

class UserAnalysisResult(BaseModel):
    """Result of user analysis"""
    summary: str
    keywords: Dict[str, float]
    embedding: list[float]
    similar_users: list[Dict[str, Any]]

class UserAnalysisWorkflow:
    """Workflow for analyzing user profiles and finding similar users"""
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key

    async def run(self, user_data: UserData) -> Optional[UserAnalysisResult]:
        """Run the user analysis workflow"""
        try:
            # Generate embedding for the user
            embedding = await generate_embedding(
                user_data.profile
            )
            if not embedding:
                return None

            # Analyze user profile
            analysis = await analyze_user_profile(
                user_data.profile
            )
            if not analysis:
                return None

            return UserAnalysisResult(
                summary=analysis["summary"],
                keywords=analysis["keywords"],
                embedding=embedding
            )

        except Exception as e:
            print(f"Error in user analysis workflow: {str(e)}")
            return None 