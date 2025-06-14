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

# User Summary Nodes
async def process_user_data(state: Dict[str, Any]) -> Dict[str, Any]:
    """Process raw user data and extract summary"""
    messages = [
        {"role": "system", "content": USER_SUMMARY_PROMPT},
        {"role": "user", "content": json.dumps(state["user_data"], indent=2)},
    ]

    response = await get_structured_response(
        model=get_reasoning_model(),
        messages=messages,
        response_format={
            "type": "object",
            "properties": {
                "keywords": {"type": "array", "items": {"type": "string"}},
                "raw_summary": {"type": "string"}
            },
            "required": ["keywords", "raw_summary"]
        }
    )

    state["user_summary"] = {
        "keywords": response["keywords"],
        "raw_summary": response["raw_summary"],
    }
    return state

async def generate_user_embedding(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate embeddings from user summary"""
    summary_text = " ".join(state["user_summary"]["keywords"])
    embedding = await get_embeddings(summary_text)

    state["user_embedding"] = {"vector": embedding, "dimensions": len(embedding)}
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
                "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["should_reply", "identified_needs", "confidence"]
        }
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
                        "relevance_score": {"type": "number", "minimum": 0, "maximum": 1},
                        "key_points": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["title", "url", "relevance_score", "key_points"]
                },
                "relevance_score": {"type": "number", "minimum": 0, "maximum": 1},
                "key_points": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["selected_content", "relevance_score", "key_points"]
        }
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
                "link": {"type": "string"}
            },
            "required": ["reply_text", "link"]
        }
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
            "properties": {
                "vector": {"type": "string"}
            },
            "required": ["vector"]
        }
    )

    state["prepared_text"] = response["vector"]
    return state

async def generate_embedding(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate embeddings from prepared text"""
    embedding = await get_embeddings(state["prepared_text"])

    state["embedding"] = {"vector": embedding, "dimensions": len(embedding)}
    return state
