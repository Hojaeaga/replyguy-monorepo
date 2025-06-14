import asyncio
from app.workflows.user_summary import UserSummaryWorkflow

async def test_api():
    # Sample user data
    user_data = {
        "username": "test_user",
        "bio": "Testing OpenAI API calls",
        "recent_casts": ["This is a test cast"],
        "interests": ["testing", "AI"],
        "engagement_stats": {
            "avg_replies": 1,
            "avg_likes": 1,
            "top_channels": ["test"]
        }
    }
    
    workflow = UserSummaryWorkflow()
    result = await workflow.run({"user_data": user_data})
    
    print("\nAPI Call Results:")
    print("----------------")
    print("Keywords:", ", ".join(result["user_summary"]["keywords"]))
    print("Raw Summary:", result["user_summary"]["raw_summary"])
    print("Embedding Vector Size:", len(result["user_embedding"]["vector"]))

if __name__ == "__main__":
    asyncio.run(test_api()) 