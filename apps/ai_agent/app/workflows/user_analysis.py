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
    """Result of user analysis containing only the behavioural summary and its embedding vector"""
    summary: str
    embedding: list[float]

class UserAnalysisWorkflow:
    """Workflow for analyzing user profiles and finding similar users"""
    
    def __init__(self):
        """UserAnalysisWorkflow relies on environment variables for OpenAI credentials."""
        pass

    async def run(self, user_data: UserData) -> Optional[UserAnalysisResult]:
        """Run the user analysis workflow"""
        try:
            # 1️⃣ Analyze user profile to get behavioural summary (keyword pairs)
            analysis = await analyze_user_profile(user_data.profile)
            if not analysis or not analysis.get("summary"):
                return None

            summary_text = analysis["summary"]

            # 2️⃣ Generate embedding from the summary text
            embedding = await generate_embedding(summary_text)
            if not embedding:
                return None

            # Return only the summary and the raw embedding vector
            return UserAnalysisResult(
                summary=summary_text,
                embedding=embedding,
            )

        except Exception as e:
            print(f"Error in user analysis workflow: {str(e)}")
            return None 