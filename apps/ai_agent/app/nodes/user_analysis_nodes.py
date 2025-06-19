from typing import Dict, Any, List, Optional
from ..models.llm import (
    get_embeddings,
    get_structured_response,
    get_reasoning_model
)

async def generate_embedding(summary_text: str) -> Optional[List[float]]:
    """Generate embedding vector for the provided summary text"""
    try:
        # Guard: empty summary
        if not summary_text:
            raise ValueError("summary_text is empty")

        # Generate embedding using centralized helper
        return await get_embeddings(summary_text)
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
        Analyze this Farcaster user profile and provide a concise behavioural summary consisting of 3-10 hyphen-separated keyword pairs that capture what the user builds, likes, or talks about. Examples: "base-builder", "solana-builder", "nft-collector".
        
        Profile:
        Bio: {profile.get('bio', '')}
        Following: {profile.get('following_count', 0)}
        Followers: {profile.get('follower_count', 0)}
        Channels: {', '.join(profile.get('channels', []))}
        """
        
        # Get analysis using centralized function
        analysis = await get_structured_response(
            model=get_reasoning_model(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert at analyzing social media profiles and identifying behavioural patterns "
                        "and interest areas. Return ONLY a JSON object with a single field 'summary' that is a comma-" 
                        "separated list of keyword pairs. Do not include any other keys."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={
                "type": "object",
                "properties": {"summary": {"type": "string"}},
                "required": ["summary"],
            },
        )

        return {
            "summary": analysis.get("summary", "")
        }
    except Exception as e:
        print(f"Error analyzing profile: {str(e)}")
        return None
