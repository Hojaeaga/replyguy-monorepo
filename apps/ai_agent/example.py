"""
Example script demonstrating workflow usage
"""
import asyncio
import json
from typing import Dict, Any

from app.workflows.user_summary import UserSummaryWorkflow
from app.workflows.reply_generation import ReplyGenerationWorkflow
from app.workflows.embeddings import EmbeddingsWorkflow

async def run_user_summary_example():
    """Example of user summary workflow"""
    print("\n=== User Summary Workflow Example ===")
    
    # Sample user data
    user_data = {
        "username": "web3_dev",
        "bio": "Building decentralized apps and exploring AI. Love discussing tech and crypto.",
        "recent_casts": [
            "Just deployed my first smart contract on Base! The L2 experience is amazing.",
            "Anyone using LangChain for AI development? Looking to connect!",
            "Thoughts on Frame vs other NFT protocols? Building something interesting..."
        ],
        "interests": ["web3", "AI", "programming", "crypto"],
        "engagement_stats": {
            "avg_replies": 15,
            "avg_likes": 45,
            "top_channels": ["tech", "defi", "nft"]
        }
    }
    
    workflow = UserSummaryWorkflow()
    result = await workflow.process({"user_data": user_data})
    
    print("\nUser Keywords:", ", ".join(result["user_summary"]["keywords"]))
    print("\nRaw Summary:", result["user_summary"]["raw_summary"])
    print("\nEmbedding Dimensions:", result["user_embedding"]["dimensions"])

async def run_reply_generation_example():
    """Example of reply generation workflow"""
    print("\n=== Reply Generation Workflow Example ===")
    
    # Sample cast and feeds
    cast_text = "Looking for recommendations on the best NFT marketplaces for Frame deployment. Any experiences to share?"
    available_feeds = [
        {
            "text": "Just published a comprehensive guide on Frame deployment strategies across different marketplaces. Check it out!",
            "url": "https://warpcast.com/web3_expert/0x123",
            "author": "web3_expert",
            "timestamp": "2024-03-15T10:30:00Z"
        },
        {
            "text": "Zora vs Base vs Optimism - A deep dive into Frame performance and user experience.",
            "url": "https://warpcast.com/nft_researcher/0x456",
            "author": "nft_researcher",
            "timestamp": "2024-03-14T15:45:00Z"
        }
    ]
    
    workflow = ReplyGenerationWorkflow()
    result = await workflow.process({
        "cast_text": cast_text,
        "available_feeds": available_feeds
    })
    
    print("\nShould Reply:", result["intent_analysis"]["should_reply"])
    print("\nConfidence:", result["intent_analysis"]["confidence"])
    if result["intent_analysis"]["should_reply"]:
        print("\nReply Text:", result["reply"]["reply_text"])
        print("\nLink:", result["reply"].get("link", "No link"))

async def run_embeddings_example():
    """Example of embeddings workflow"""
    print("\n=== Embeddings Workflow Example ===")
    
    # Sample input data
    input_data = {
        "title": "Web3 Gaming: The Future of Player-Owned Economies",
        "content": """
        Exploring how blockchain technology is revolutionizing gaming through:
        - True ownership of in-game assets
        - Interoperable items across games
        - Player-driven marketplaces
        - Community governance
        
        Key technologies: ERC-721, ERC-1155, L2 scaling solutions
        """,
        "tags": ["gaming", "web3", "blockchain", "nft", "defi"]
    }
    
    workflow = EmbeddingsWorkflow()
    result = await workflow.process({"input_data": input_data})
    
    print("\nPrepared Text:", result["prepared_text"])
    print("\nEmbedding Dimensions:", result["embedding"]["dimensions"])

async def main():
    """Run all workflow examples"""
    await run_user_summary_example()
    await run_reply_generation_example()
    await run_embeddings_example()

if __name__ == "__main__":
    asyncio.run(main()) 