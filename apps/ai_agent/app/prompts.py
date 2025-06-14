"""
Centralized prompt management for the AI service
"""

# User Summary Workflow
USER_SUMMARY_PROMPT = """
Analyze the following user data and extract key information about their interests, expertise, and engagement patterns.
Focus on identifying topics they frequently engage with and their level of expertise in different areas.
Please analyze the provided user data and return a JSON response with:
- keywords: A list of key terms that represent the user's interests and activities
- raw_summary: A brief summary of the user's profile and behavior

User Data:
{user_data}
"""

# Reply Generation Workflow
INTENT_CHECK_PROMPT = """
<decision_criteria>
First, determine if the user's cast warrants a response based on these guidelines:

1. RESPOND when the user is clearly seeking:
   - Technical help or advice
   - Job opportunities or career connections
   - Event information
   - People with similar interests
   - Project collaborators
   - Educational resources
   - Community connections

2. DO NOT RESPOND when the user's cast is:
   - Generic greetings without specific content
   - Simple statements not seeking engagement
   - Casual observations without questions
   - Personal updates not inviting discussion
   - Content with no clear intent or question
   - Vague or ambiguous posts with insufficient context

</decision_criteria>

Please analyze the cast and return a JSON response with:
- should_reply: boolean indicating if a reply is warranted
- identified_needs: list of specific needs or questions that should be addressed
- confidence: float between 0 and 1 indicating confidence in the analysis

If you determine NO RESPONSE is needed, output:
{
    "should_reply": false,
    "identified_needs": [],
    "confidence": 0.0,
    "reply": {
        "reply_text": "No response needed for this cast.",
        "link": ""
    }
}

Cast Text:
{cast_text}

Cast Summary:
{cast_summary}
"""

CONTENT_DISCOVERY_PROMPT = """
You are an AI assistant tasked with discovering relevant content based on a cast (social media post).
Consider:
- Relevance to the identified needs
- Recency and freshness of content
- Authority and credibility
- Potential impact and value-add

Cast Text:
{cast_text}

Cast Summary:
{cast_summary}

Identified Needs:
{identified_needs}

Available Feeds:
{available_feeds}

Please analyze the cast and available feeds to return a JSON response with the following EXACT structure:
{
    "selected_content": {
        "title": "string - title of the selected content",
        "url": "string - URL of the content (or empty string if none)",
        "relevance_score": float between 0 and 1,
        "key_points": ["string - key point 1", "string - key point 2", ...],
        "author_username": "string - username of the content author",
        "cast_hash": "string - hash of the cast",
        "channel_name": "string - channel name if applicable (or empty string)"
    },
    "relevance_score": float between 0 and 1 indicating overall relevance,
    "key_points": ["string - key point 1", "string - key point 2", ...]
}

IMPORTANT:
1. The selected_content object MUST have all fields: title, url, relevance_score, key_points, author_username, cast_hash, and channel_name
2. All relevance_score values must be between 0 and 1
3. All key_points must be non-empty strings
4. The url field can be an empty string if no URL is available
5. PRIORITIZE feeds that appear earlier in the list (they are ordered by relevance)
6. Only select content that is genuinely relevant and helpful
7. NEVER generate or fabricate content - ONLY select from provided feeds
8. If no relevant content is found in the feeds, return empty values with 0 relevance_score
9. Avoid content about airdrops and giveaways
"""

REPLY_GENERATION_PROMPT = """
Generate a reply to the cast using ONLY the exact content from the selected feed.
The reply MUST follow this EXACT format:
"You should connect with [author_username], who said: '[content]'"

Cast Text:
{cast_text}

Cast Summary:
{cast_summary}

Selected Content:
{selected_content}

You are a helpful AI assistant that generates replies to Farcaster casts.
Please generate a reply and return a JSON response with:
{
    "reply_text": "string - MUST be in format: 'You should connect with [author_username], who said: '[content]''. If selected_content is empty, return 'No relevant content found in the available feeds.'",
    "link": "string - the Farcaster URL (https://farcaster.xyz/[author_username]/[cast_hash]) or empty string if no content selected"
}

If the selected content has a channel_name, append "Join the conversation in the /[channel_name] channel." to the reply_text.

IMPORTANT:
1. NEVER generate new content - use ONLY the exact content from selected_content
2. The reply MUST follow the format: "You should connect with [author_username], who said: '[content]'"
3. If selected_content is empty or has no meaningful content, return the default "No relevant content found" message
4. The [content] must be the exact content from the selected feed, not a summary or rephrasing
"""

# Embeddings Workflow
EMBEDDINGS_PROMPT = """
Prepare the following input data for embedding generation.
Extract and combine the most semantically meaningful elements while preserving the core meaning.
Clean and normalize the text, removing any noise or irrelevant information.
You are a helpful AI assistant that prepares text for embedding generation.
Please analyze the input data and return a JSON response with:
- vector: A list of floats representing the embedding vector
- dimensions: The number of dimensions in the vector

Input Data:
{input_data}
"""

# Cast Summary Generation
CAST_SUMMARY_PROMPT = """
Analyze the following cast and provide a brief summary of its intent and content.
Focus on understanding what the user is seeking or expressing.

Cast Text:
{cast_text}

Please provide a concise summary in 1-2 sentences that captures:
1. The main topic or subject
2. The user's intent (seeking help, sharing information, asking questions, etc.)
3. Any specific needs or requests mentioned

The summary should be clear and focused on what would be most relevant for finding helpful content to respond with.
"""
