from pydantic import BaseModel
from typing import Optional, List

class CastInput(BaseModel):
    cast_text: str
    user_id: str
    cast_id: str
    context: Optional[dict] = None

class ReplyCandidate(BaseModel):
    text: str
    user_id: str
    cast_id: str
    relevance_score: float
    confidence: float

class IntentAnalysis(BaseModel):
    should_reply: bool
    confidence: float
    reasoning: str

class PipelineResponse(BaseModel):
    intent_analysis: IntentAnalysis
    recommended_replies: Optional[List[ReplyCandidate]] = None
    selected_reply: Optional[ReplyCandidate] = None
    processing_time: float 