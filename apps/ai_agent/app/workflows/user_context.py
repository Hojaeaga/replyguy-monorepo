from typing import Any, Dict, List

from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel

from .base import BaseWorkflow, WorkflowConfig

class UserContextConfig(BaseModel):
    """Configuration for user context analysis workflow"""
    model: WorkflowConfig = WorkflowConfig(
        model_name="o4-mini",
        max_tokens=500
    )

class UserContextWorkflow(BaseWorkflow):
    """Workflow for analyzing user context and generating profile"""
    
    def __init__(self, config: UserContextConfig = UserContextConfig()):
        self.config = config
        self.model = config.model.create_model()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert analyst generating psychological and content interest summaries."),
            ("user", """
<instruction>
From the user's Farcaster data, extract a structured keyword profile representing their interests, behaviors, communities, and preferences. 
This profile will be used to generate embeddings and cluster users into highly relevant cohorts.
</instruction>

<user_data>
{user_data}
</user_data>

<output_requirements>
1. Return a flat list of lowercase, hyphenated keywords (no sentences).
2. Each keyword should reflect a meaningful trait, behavior, tool, or interest (e.g. 'zora-user', 'frame-builder', 'philosophy-discussions', 'onchain-gaming').
3. Focus on cohort-defining dimensions: content topics, communities, actions, personality style, and engagement type.
4. Avoid vague terms like "web3" or "crypto" unless combined with specificity (e.g. 'web3-design', 'crypto-security-research').
5. No filler words, no explanation — only the keyword list, comma-separated.
</output_requirements>

<examples>
Good output:
"frame-builder, farcaster-poweruser, zora-poster, thoughtful-replier, ai-curious, defi-scalability, ethcc-attendee, builder-in-public, photography-enthusiast, governance-participant"

Bad output:
"This user enjoys Web3 and tech. They are very active online and like to post." (Too vague, narrative style)
</examples>
            """)
        ])
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user data and generate keyword profile"""
        response = await self.model.ainvoke(
            self.prompt.format_messages(
                user_data=input_data.get("user_data", "{}")
            )
        )
        
        # Extract keywords from response
        keywords = [
            kw.strip()
            for kw in response.content.lower().split(",")
            if kw.strip()
        ]
        
        return {
            "keywords": keywords,
            "raw_analysis": response.content,
            "user_data": input_data.get("user_data")
        }
    
    def get_config(self) -> Dict[str, Any]:
        return self.config.model_dump() 