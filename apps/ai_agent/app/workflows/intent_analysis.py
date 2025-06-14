from typing import Any, Dict, List

from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel

from .base import BaseWorkflow, WorkflowConfig

class IntentAnalysisConfig(BaseModel):
    """Configuration for intent analysis workflow"""
    model: WorkflowConfig = WorkflowConfig(
        model_name="o4-mini",
        max_tokens=500
    )
    
    confidence_threshold: float = 0.7
    relevance_threshold: float = 0.6

class IntentAnalysisWorkflow(BaseWorkflow):
    """Workflow for analyzing cast intent and extracting meaning"""
    
    def __init__(self, config: IntentAnalysisConfig = IntentAnalysisConfig()):
        self.config = config
        self.model = config.model.create_model()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert analyst generating psychological and content interest summaries."),
            ("user", """
<instruction>
Analyze the following Farcaster cast and extract a flat, structured list of cohort-relevant keywords.
These keywords will be used for user clustering, so focus on identifying meaningful interests, behaviors, communities, and intent expressed in the cast.
</instruction>

<cast_text>
{cast_text}
</cast_text>

<output_requirements>
1. Return a flat list of lowercase, hyphenated keywords (no sentences or explanations).
2. Each keyword should reflect a cohort-relevant dimension such as:
   - Specific interest/topic (e.g. 'onchain-fitness', 'ai-art-tools')
   - Behavioral pattern or intent (e.g. 'open-collab-invite', 'builder-outreach')
   - Community or context (e.g. 'farcaster-networking', 'zora-poster')
   - Product or content domain (e.g. 'fitness-dapp-creator', 'frame-developer')
   - Personality or engagement style (e.g. 'thoughtful-replier', 'public-builder')
3. Avoid vague terms like 'web3', 'tech', or generic verbs.
4. Keep it concise — no more than 10 keywords per cast.
5. Output must be a single comma-separated line of keywords only.
</output_requirements>

<examples>
Input: "building something around onchain-fitness — let's connect?"
Output: onchain-fitness, builder-outreach, farcaster-networking, fitness-dapp-creator, open-collab-invite, community-collaborator, health-and-wellness

Input: "launched a new frame using Zora — supports music NFTs"
Output: zora-frame-builder, music-nft-creator, frame-launcher, zora-user, creative-tools-user, public-release-announcement
</examples>
            """)
        ])
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract meaning and keywords from cast text"""
        response = await self.model.ainvoke(
            self.prompt.format_messages(cast_text=input_data["cast_text"])
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
            "cast_text": input_data["cast_text"]
        }
    
    def get_config(self) -> Dict[str, Any]:
        return self.config.model_dump() 