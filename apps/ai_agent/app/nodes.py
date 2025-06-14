"""
Node definitions for LangGraph workflows
"""

import json
from typing import Any, Dict

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
            "content": "Extract 1–3 relevant, short, high-level topics per post.",
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
                        "type": "array",  # list of strings per cast
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
