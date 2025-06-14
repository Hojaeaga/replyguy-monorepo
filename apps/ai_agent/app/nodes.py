"""
Node definitions for LangGraph workflows
"""

import json
from typing import Any, Dict

from scipy.spatial.distance import cosine

from .models.llm import (
    get_embeddings,
    get_generation_model,
    get_reasoning_model,
    get_structured_response,
)
from .prompts import (
    CONTENT_DISCOVERY_PROMPT,
    EMBEDDINGS_PROMPT,
    INTENT_CHECK_PROMPT,
    REPLY_GENERATION_PROMPT,
    USER_SUMMARY_PROMPT,
)


async def generate_trending_clusters(state: Dict[str, Any]) -> Dict[str, Any]:
    """Clusters trending casts by topics using LLM + similarity"""
    casts = state["casts"]

    # Step 1: Extract topics per cast using your LLM helper
    state = await extract_topics_llm(state)  # sets state["topics"]
    topics_per_cast = state["topics"]

    # Step 2: Group casts into topic clusters
    clusters = {}
    for cast, topics in zip(casts, topics_per_cast):
        for topic in topics:
            topic_key = topic.lower().strip()
            if topic_key not in clusters:
                clusters[topic_key] = []
            clusters[topic_key].append(cast)

    # Optional: generate an embedding per cluster for vector matching
    trending_clusters = []
    for topic, grouped_casts in clusters.items():
        combined_texts = " ".join(c["text"] for c in grouped_casts)
        embedding = await get_embeddings(combined_texts)
        trending_clusters.append(
            {
                "topic": topic,
                "example_casts": grouped_casts,
                "embedding": embedding,
            }
        )

    state["trending_clusters"] = trending_clusters
    return state


async def generate_cast_embeddings(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate an embedding for each cast individually"""
    casts = state["casts"]  # expects: List[Cast]
    texts = [cast["text"] for cast in casts]

    embeddings = []
    for text in texts:
        embedding = await get_embeddings(text)
        embeddings.append(embedding)

    state["cast_embeddings"] = embeddings  # one-to-one with `state["casts"]`
    return state


async def extract_topics_llm(state: Dict[str, Any]) -> Dict[str, Any]:
    """Extract topics per cast using an LLM"""
    casts = state["casts"]
    texts = [cast["text"] for cast in casts]

    messages = [
        {
            "role": "system",
            "content": "You are a JSON API that extracts topics from social media posts. Return a JSON object with an array of topics for each post.",
        },
        {"role": "user", "content": json.dumps(texts, indent=2)},
    ]

    response = await get_structured_response(
        model=get_generation_model(),
        messages=messages,
        response_format={
            "type": "object",
            "properties": {
                "topics": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                }
            },
            "required": ["topics"],
        },
    )

    state["topics"] = response["topics"]
    return state


def build_topic_map(state: Dict[str, Any]) -> Dict[str, Any]:
    """Group casts into topic-based clusters"""
    casts = state["casts"]
    embeddings = state["cast_embeddings"]
    topics_per_cast = state["topics"]

    topic_map = {}

    for i, cast in enumerate(casts):
        cast_topics = topics_per_cast[i]
        for topic in cast_topics:
            normalized_topic = topic.strip().title()

            if normalized_topic not in topic_map:
                topic_map[normalized_topic] = {
                    "posts": [],
                    "embeddings": [],
                }

            topic_map[normalized_topic]["posts"].append(cast)
            topic_map[normalized_topic]["embeddings"].append(embeddings[i])

    state["topic_map"] = topic_map
    return state


# User Summary Nodes
async def process_user_data(state: Dict[str, Any]) -> Dict[str, Any]:
    """Process raw user data and extract summary"""
    messages = [
        {"role": "system", "content": USER_SUMMARY_PROMPT},
        {"role": "user", "content": json.dumps(state["user_data"], indent=2)},
    ]
    response_format = {
        "type": "object",
        "properties": {
            "keywords": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string"},
                        "weight": {"type": "number"},
                    },
                    "required": ["topic", "weight"],
                },
            },
            "tone": {"type": "string"},
            "channels": {"type": "array", "items": {"type": "string"}},
            "raw_summary": {"type": "string"},
        },
        "required": ["keywords", "tone", "channels", "raw_summary"],
    }
    response = await get_structured_response(
        model=get_reasoning_model(),
        messages=messages,
        response_format=response_format,
    )

    state["user_summary"] = {
        "keywords": response["keywords"],
        "raw_summary": response["raw_summary"],
    }
    return state


async def generate_user_embedding(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate embedding from structured keywords, tone, and channels"""
    keyword_objects = state["user_summary"]["keywords"]
    tone = state["user_summary"].get("tone", "")
    channels = state["user_summary"].get("channels", [])

    # Format topic-weight pairs like "AI Agents: 0.95"
    topics_str = ", ".join(
        f"{item['topic']}: {item['weight']:.2f}" for item in keyword_objects
    )

    # Compose final text to embed
    summary_text = (
        f"Topics: {topics_str}. Tone: {tone}. Channels: {', '.join(channels)}"
    )

    embedding = await get_embeddings(summary_text)

    state["user_embedding"] = {
        "vector": embedding,
        "dimensions": len(embedding),
        "source_text": summary_text,  # optional for debugging
    }
    return state


# Reply Generation Nodes
async def check_reply_intent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Check if the cast warrants a reply"""
    messages = [
        {"role": "system", "content": INTENT_CHECK_PROMPT},
        {"role": "user", "content": state["cast_text"]},
    ]

    response = await get_structured_response(
        model=get_reasoning_model(),
        messages=messages,
        response_format={
            "type": "object",
            "properties": {
                "should_reply": {"type": "boolean"},
                "identified_needs": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["should_reply", "identified_needs", "confidence"],
        },
    )

    state["intent_analysis"] = {
        "should_reply": response["should_reply"],
        "identified_needs": response["identified_needs"],
        "confidence": response["confidence"],
    }
    return state


async def discover_relevant_content(state: Dict[str, Any]) -> Dict[str, Any]:
    """Find relevant content from feeds"""
    if not state["intent_analysis"]["should_reply"]:
        state["discovered_content"] = None
        return state

    messages = [
        {"role": "system", "content": CONTENT_DISCOVERY_PROMPT},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "cast_text": state["cast_text"],
                    "identified_needs": state["intent_analysis"]["identified_needs"],
                    "feeds": state["available_feeds"],
                },
                indent=2,
            ),
        },
    ]

    response = await get_structured_response(
        model=get_reasoning_model(),
        messages=messages,
        response_format={
            "type": "object",
            "properties": {
                "selected_content": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "url": {"type": "string"},
                        "relevance_score": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1,
                        },
                        "key_points": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["title", "url", "relevance_score", "key_points"],
                },
                "relevance_score": {"type": "number", "minimum": 0, "maximum": 1},
                "key_points": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["selected_content", "relevance_score", "key_points"],
        },
    )

    state["discovered_content"] = {
        "selected_content": response["selected_content"],
        "relevance_score": response["relevance_score"],
        "key_points": response["key_points"],
    }
    return state


async def generate_reply(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate the final reply"""
    if not state.get("discovered_content"):
        state["reply"] = {"reply_text": "No response needed for this cast.", "link": ""}
        return state

    messages = [
        {"role": "system", "content": REPLY_GENERATION_PROMPT},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "cast_text": state["cast_text"],
                    "selected_content": state["discovered_content"]["selected_content"],
                },
                indent=2,
            ),
        },
    ]

    response = await get_structured_response(
        model=get_generation_model(),
        messages=messages,
        response_format={
            "type": "object",
            "properties": {
                "reply_text": {"type": "string"},
                "link": {"type": "string"},
            },
            "required": ["reply_text", "link"],
        },
    )

    state["reply"] = {"reply_text": response["reply_text"], "link": response["link"]}
    return state


# Embeddings Generation Nodes
async def prepare_embedding_text(state: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare text for embedding generation"""
    messages = [
        {"role": "system", "content": EMBEDDINGS_PROMPT},
        {"role": "user", "content": json.dumps(state["input_data"])},
    ]

    response = await get_structured_response(
        model=get_reasoning_model(),
        messages=messages,
        response_format={
            "type": "object",
            "properties": {"vector": {"type": "string"}},
            "required": ["vector"],
        },
    )

    state["prepared_text"] = response["vector"]
    return state


async def generate_embedding(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate embeddings from prepared text"""
    embedding = await get_embeddings(state["prepared_text"])

    state["embedding"] = {"vector": embedding, "dimensions": len(embedding)}
    return state


async def match_trending_to_user(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Filters and scores clusters based on user's interest embedding.
    Input: state with `user_embedding`, `trending_clusters`
    Output: { matched_clusters: [{ topic, score, top_casts }] }
    """
    user_vec = state["user_embedding"]
    clusters = state["trending_clusters"]

    scored_clusters = []
    for cluster in clusters:
        score = 1 - cosine(user_vec, cluster["embedding"])
        sorted_casts = sorted(
            cluster["casts"], key=lambda c: c.get("engagement", 0), reverse=True
        )
        scored_clusters.append(
            {
                "topic": cluster["topic"],
                "score": score,
                "top_casts": sorted_casts[:3],
            }
        )

    top_matches = sorted(scored_clusters, key=lambda c: c["score"], reverse=True)[:3]
    state["matched_clusters"] = top_matches
    return state


async def suggest_viral_hooks(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Uses LLM to generate viral reply suggestions for top casts.
    Input: state["matched_clusters"]
    Output: state["viral_suggestions"]
    """
    matched_clusters = state["matched_clusters"]
    suggestions = []

    for cluster in matched_clusters:
        topic = cluster["topic"]
        cast_suggestions = []

        for cast in cluster["top_casts"]:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You're an expert in writing viral Farcaster replies. "
                        "Suggest a single quote-cast or reply idea that can get high engagement",
                        "while being authentic and insightful.",
                    ),
                },
                {
                    "role": "user",
                    "content": f"""Topic: {topic}
Post: "{cast['text']}"

Reply in this JSON format:
{{
  "suggested_reply": "..."
}}
""",
                },
            ]

            response = await get_structured_response(
                model=get_reasoning_model(),
                messages=messages,
                response_format={
                    "type": "object",
                    "properties": {
                        "suggested_reply": {"type": "string"},
                    },
                    "required": ["suggested_reply"],
                },
            )

            cast_suggestions.append(
                {
                    "cast": cast,
                    "suggested_reply": response["suggested_reply"],
                }
            )

        suggestions.append(
            {
                "topic": topic,
                "score": cluster["score"],
                "cast_suggestions": cast_suggestions,
            }
        )

    state["viral_suggestions"] = suggestions
    return state
