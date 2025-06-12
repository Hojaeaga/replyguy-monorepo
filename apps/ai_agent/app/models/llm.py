"""
Centralized LLM model configurations
"""

import os
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

# Model names
REASONING_MODEL = "o4-mini"
GENERATION_MODEL = "gpt-4.1-mini"
EMBEDDINGS_MODEL = "text-embedding-3-small"

async def get_structured_response(
    model: str,
    messages: list[Dict[str, str]],
    response_format: Dict[str, Any],
    temperature: float = 1.0
) -> Dict[str, Any]:
    """Get structured response from OpenAI API"""
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        response_format={"type": "json_object"}
    )
    
    # Parse the JSON response
    try:
        import json
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        raise ValueError(f"Failed to parse response: {str(e)}")

async def get_embeddings(text: str) -> list[float]:
    """Get embeddings from OpenAI API"""
    response = client.embeddings.create(
        model=EMBEDDINGS_MODEL,
        input=text
    )
    return response.data[0].embedding

# Factory functions to ensure consistent model creation
def get_reasoning_model() -> str:
    """Get the reasoning model name"""
    return REASONING_MODEL

def get_generation_model() -> str:
    """Get the generation model name"""
    return GENERATION_MODEL

def get_embeddings_model() -> str:
    """Get the embeddings model name"""
    return EMBEDDINGS_MODEL
