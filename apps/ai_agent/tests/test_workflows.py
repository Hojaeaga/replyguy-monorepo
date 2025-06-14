import os
import json

import pytest

from app.workflows.embeddings import EmbeddingsWorkflow
from app.workflows.galaxy_trending import TrendingGalaxyWorkflow
from app.workflows.reply_generation import ReplyGenerationWorkflow
from app.workflows.user_summary import UserSummaryWorkflow

# Check if we should use real OpenAI
USE_REAL_OPENAI = os.getenv("USE_REAL_OPENAI", "false").lower() == "true"

# Mock Neynar API responses
MOCK_USER_DATA = {
    "user": {
        "object": "user",
        "fid": 12345,
        "username": "test_user",
        "display_name": "Test User",
        "pfp_url": "https://example.com/pfp.jpg",
        "profile": {
            "bio": {"text": "AI enthusiast | Web3 developer | Building the future"}
        },
        "follower_count": 1000,
        "following_count": 500,
        "verifications": ["0x123...abc"],
        "active_status": "active",
    }
}

MOCK_USER_CASTS = {
    "casts": [
        {
            "hash": "0xabc...def",
            "thread_hash": "0x123...456",
            "parent_hash": None,
            "author": {"fid": 12345, "username": "test_user"},
            "text": "Just built an amazing AI-powered social graph! #AI #Web3",
            "timestamp": "2024-03-15T10:00:00Z",
            "reactions": {"likes": 50, "recasts": 10},
            "replies": {"count": 5},
        }
    ]
}

MOCK_TRENDING_CASTS = {
    "casts": [
        {
            "hash": "0x789...012",
            "thread_hash": "0x345...678",
            "parent_hash": None,
            "author": {"fid": 67890, "username": "trending_user"},
            "text": "Breaking: New AI model achieves state-of-the-art results! #AI #ML",
            "timestamp": "2024-03-15T11:00:00Z",
            "reactions": {"likes": 1000, "recasts": 200},
            "replies": {"count": 100},
            "engagement": 1300  # Adding engagement score (likes + recasts + replies)
        },
        {
            "hash": "0xdef...789",
            "thread_hash": "0xabc...def",
            "parent_hash": None,
            "author": {"fid": 67891, "username": "another_user"},
            "text": "Just launched my first AI-powered dApp! #Web3 #AI",
            "timestamp": "2024-03-15T12:00:00Z",
            "reactions": {"likes": 500, "recasts": 100},
            "replies": {"count": 50},
            "engagement": 650
        }
    ]
}


@pytest.fixture
def mock_trending_casts():
    """Fixture for mock trending casts data"""
    return MOCK_TRENDING_CASTS  # Return the full dictionary with casts key


@pytest.mark.asyncio
async def test_user_summary_workflow(
    mock_user_data, mock_user_casts, real_openai_config
):
    """Test user summary workflow with real or mock OpenAI"""
    workflow = UserSummaryWorkflow()
    result = await workflow.run(
        {
            "user_data": {
                "user": mock_user_data["user"],
                "casts": mock_user_casts["casts"],
            }
        }
    )

    assert "user_summary" in result
    assert "keywords" in result["user_summary"]
    assert "raw_summary" in result["user_summary"]
    assert "user_embedding" in result
    assert "vector" in result["user_embedding"]

    if USE_REAL_OPENAI:
        print("\nReal OpenAI User Summary Results:")
        print("Keywords:", result["user_summary"]["keywords"])
        print("Raw Summary:", result["user_summary"]["raw_summary"])


@pytest.mark.asyncio
async def test_embeddings_workflow():
    """Test embeddings workflow"""
    workflow = EmbeddingsWorkflow()

    # Test input - just pass the text directly
    test_input = "This is a test text for generating embeddings"

    # Run workflow
    result = await workflow.run(test_input)

    # Verify result
    assert "embedding" in result
    assert "vector" in result["embedding"]
    assert "dimensions" in result["embedding"]
    assert len(result["embedding"]["vector"]) == result["embedding"]["dimensions"]

    if USE_REAL_OPENAI:
        print("\nReal OpenAI Embedding Results:")
        print("Vector dimensions:", len(result["embedding"]["vector"]))
        print("First few dimensions:", result["embedding"]["vector"][:5])


@pytest.mark.asyncio
async def test_trending_galaxy_workflow(mock_trending_casts):
    """Test trending galaxy workflow with real or mock OpenAI"""
    workflow = TrendingGalaxyWorkflow()
    
    # Create test input with the correct format for generate_trending_clusters
    test_input = {
        "casts": mock_trending_casts.get("casts", []),  # Raw casts list
        "user_embedding": [0.1] * 1536,  # User's embedding vector
        "user_summary": {
            "keywords": ["AI", "Web3", "Social"],
            "raw_summary": "Test user interested in AI and Web3",
        }
    }

    print("\nTest input casts:", json.dumps(test_input["casts"], indent=2))  # Debug print

    # Run workflow
    result = await workflow.run(test_input)
    
    print("\nWorkflow result:", json.dumps(result, indent=2))  # Debug print

    # Verify result
    assert "trending_clusters" in result
    assert "matched_clusters" in result
    assert "viral_suggestions" in result

    # Additional assertions to verify cluster structure
    for cluster in result["trending_clusters"]:
        assert "topic" in cluster
        assert "embedding" in cluster
        assert "casts" in cluster
        assert isinstance(cluster["casts"], list)
        for cast in cluster["casts"]:
            assert "engagement" in cast

    if USE_REAL_OPENAI:
        print("\nReal OpenAI Trending Galaxy Results:")
        print("Number of clusters:", len(result["trending_clusters"]))
        print("Number of matched clusters:", len(result["matched_clusters"]))
        print("Number of viral suggestions:", len(result["viral_suggestions"]))


@pytest.mark.asyncio
async def test_reply_generation_workflow(real_openai_config):
    """Test reply generation workflow with real or mock OpenAI"""
    workflow = ReplyGenerationWorkflow()
    result = await workflow.process(
        {
            "cast_text": "What do you think about AI-powered social graphs?",
            "cast_summary": "Question about AI and social graphs",
            "available_feeds": [
                {
                    "text": "AI is revolutionizing social networks!",
                    "author": "ai_expert",
                }
            ],
        }
    )

    assert "intent_analysis" in result
    assert "reply" in result
    assert "should_reply" in result["intent_analysis"]
    assert "reply_text" in result["reply"]

    if USE_REAL_OPENAI:
        print("\nReal OpenAI Reply Generation Results:")
        print("Reply:", result["reply"]["reply_text"])
        print("Intent Analysis:", result["intent_analysis"])


@pytest.mark.asyncio
async def test_integrated_workflow(
    mock_user_data, mock_user_casts, mock_trending_casts, real_openai_config
):
    """Test the full flow from user data to reply generation with real or mock OpenAI"""
    user_workflow = UserSummaryWorkflow()
    trending_workflow = TrendingGalaxyWorkflow()
    reply_workflow = ReplyGenerationWorkflow()

    # Get user summary
    user_result = await user_workflow.run(
        {
            "user_data": {
                "user": mock_user_data["user"],
                "casts": mock_user_casts["casts"],
            }
        }
    )

    # Get trending galaxy
    trending_result = await trending_workflow.run(
        {
            "casts": mock_trending_casts["casts"],  # Pass just the casts list
            "user_embedding": user_result["user_embedding"][
                "vector"
            ],  # Pass embedding at top level
            "user_summary": user_result["user_summary"],  # Pass the entire user summary
        }
    )

    # Generate reply
    reply_result = await reply_workflow.process(
        {
            "cast_text": "What's your take on AI in social networks?",
            "cast_summary": "Question about AI in social networks",
            "available_feeds": trending_result["trending_clusters"][
                :2
            ],  # Use top 2 clusters
        }
    )

    assert "reply" in reply_result
    assert "context" in reply_result
    assert "relevance_score" in reply_result

    if USE_REAL_OPENAI:
        print("\nReal OpenAI Integrated Workflow Results:")
        print("User Summary:", user_result["user_summary"]["raw_summary"])
        print("Trending Topics:", trending_result["trending_clusters"])
        print("Generated Reply:", reply_result["reply"])

