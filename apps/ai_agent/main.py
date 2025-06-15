"""
Main FastAPI application
"""

from typing import Dict

from fastapi import FastAPI, HTTPException

from app.prompts import CAST_SUMMARY_PROMPT
from app.workflows.embeddings import EmbeddingsWorkflow
from app.workflows.galaxy_trending import TrendingGalaxyWorkflow
from app.workflows.reply_generation import ReplyGenerationWorkflow
from app.workflows.user_summary import UserSummaryWorkflow

app = FastAPI(
    title="AI Reply Service",
    description="AI-powered reply recommendation service",
    version="0.1.0",
)

# Workflow Instances
user_summary_workflow = UserSummaryWorkflow()
reply_workflow = ReplyGenerationWorkflow()
embeddings_workflow = EmbeddingsWorkflow()
trending_galaxy_workflow = TrendingGalaxyWorkflow()


@app.post("/api/user-summary")
async def generate_user_summary(request: Dict) -> Dict:
    """Generate user summary and embeddings"""
    try:
        result = await user_summary_workflow.run({"user_data": request["user_data"]})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-reply")
async def generate_reply(request: Dict) -> Dict:
    """Generate a reply for a cast"""
    try:
        # First generate a summary of the cast
        cast_summary = await generate_cast_summary(request["cast"]["text"])

        # Combine similar and trending feeds into available_feeds
        available_feeds = []
        if "similarUserFeeds" in request:
            available_feeds.extend(request["similarUserFeeds"])
        if "trendingFeeds" in request:
            available_feeds.extend(request["trendingFeeds"])

        result = await reply_workflow.process(
            {
                "cast_text": request["cast"]["text"],
                "cast_summary": cast_summary,
                "available_feeds": available_feeds,
            }
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-embedding")
async def generate_embedding(request: Dict) -> Dict:
    """Generate embeddings for input text"""
    try:
        if "input_data" not in request:
            raise HTTPException(status_code=400, detail="Missing input_data field")
        text = request["input_data"]
        result = await embeddings_workflow.run(text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/galaxy-trending")
async def galaxy_trending(request: Dict) -> Dict:
    """Process trending cast galaxy from user feed"""
    try:
        casts = request.get("casts", [])
        user_embedding = request.get("user_embedding")
        user_summary = request.get("user_summary", {})

        if not user_embedding:
            raise HTTPException(status_code=400, detail="Missing user_embedding field")

        inputs = {
            "casts": casts,
            "user_embedding": user_embedding,
            "user_summary": user_summary,
        }
        result = await trending_galaxy_workflow.run(inputs)
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Helper
async def generate_cast_summary(cast_text: str) -> str:
    """Generate a summary of the cast text using the base model"""
    try:
        # Call the base model to generate a summary using the prompt
        response = await base_model.generate(
            CAST_SUMMARY_PROMPT.format(cast_text=cast_text)
        )
        return response.strip()
    except Exception as e:
        # If summary generation fails, return a basic summary
        return f"User's cast about: {cast_text[:100]}..."
