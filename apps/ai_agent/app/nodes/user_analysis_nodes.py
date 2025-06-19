from typing import Dict, Any, List, Optional
from ..models.llm import (
    client,
    get_embeddings_model,
    get_generation_model,
    get_embeddings,
    get_structured_response
)

async def generate_embedding(
    profile: Dict[str, Any],
) -> Optional[List[float]]:
    """Generate embedding for user profile"""
    try:
        # Create text representation of profile
        profile_text = f"""
        Bio: {profile.get('bio', '')}
        Following: {profile.get('following_count', 0)}
        Followers: {profile.get('follower_count', 0)}
        Channels: {', '.join(profile.get('channels', []))}
        """
        
        # Generate embedding using centralized function
        return await get_embeddings(profile_text)
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        return None

async def analyze_user_profile(
    profile: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """Analyze user profile to generate summary and extract keywords"""
    try:
        # Create prompt for analysis
        prompt = f"""
        Analyze this Farcaster user profile and provide:
        1. A concise summary of their interests and activity
        2. Key topics and interests with relevance scores (0-1)
        
        Profile:
        Bio: {profile.get('bio', '')}
        Following: {profile.get('following_count', 0)}
        Followers: {profile.get('follower_count', 0)}
        Channels: {', '.join(profile.get('channels', []))}
        """
        
        # Get analysis using centralized function
        analysis = await get_structured_response(
            model=get_generation_model(),
            messages=[
                {"role": "system", "content": "You are an expert at analyzing social media profiles and identifying key interests and topics."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        return {
            "summary": analysis.get("summary", ""),
            "keywords": analysis.get("keywords", {})
        }
    except Exception as e:
        print(f"Error analyzing profile: {str(e)}")
        return None
