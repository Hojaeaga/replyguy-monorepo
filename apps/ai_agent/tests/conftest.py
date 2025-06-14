"""
Pytest configuration for AI Reply Service tests
"""
import pytest
import asyncio
import os
from dotenv import load_dotenv
from typing import Dict, Any

# Load environment variables
load_dotenv()

def pytest_configure(config):
    """Configure pytest to use real OpenAI calls if specified"""
    use_real_openai = os.getenv("USE_REAL_OPENAI", "false").lower() == "true"
    if use_real_openai:
        print("\nRunning tests with real OpenAI API calls...")
    else:
        print("\nRunning tests with mock OpenAI responses...")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
async def setup_test_env():
    """Setup any necessary test environment variables or configurations."""
    # Add any test environment setup here
    yield
    # Add any cleanup here 

@pytest.fixture(scope="session")
def mock_env_vars():
    """Environment variables for testing"""
    env_vars = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", "test-key"),
        "NEYNAR_API_KEY": os.getenv("NEYNAR_API_KEY", "test-key"),
        "USE_REAL_OPENAI": os.getenv("USE_REAL_OPENAI", "false")
    }
    return env_vars

@pytest.fixture(scope="session")
def mock_user_data():
    """Mock user data for testing"""
    return {
        "user": {
            "object": "user",
            "fid": 12345,
            "username": "test_user",
            "display_name": "Test User",
            "pfp_url": "https://example.com/pfp.jpg",
            "profile": {
                "bio": {
                    "text": "AI enthusiast | Web3 developer | Building the future"
                }
            },
            "follower_count": 1000,
            "following_count": 500,
            "verifications": ["0x123...abc"],
            "active_status": "active"
        }
    }

@pytest.fixture(scope="session")
def mock_user_casts():
    """Mock user casts for testing"""
    return {
        "casts": [
            {
                "hash": "0xabc...def",
                "thread_hash": "0x123...456",
                "parent_hash": None,
                "author": {
                    "fid": 12345,
                    "username": "test_user"
                },
                "text": "Just built an amazing AI-powered social graph! #AI #Web3",
                "timestamp": "2024-03-15T10:00:00Z",
                "reactions": {
                    "likes": 50,
                    "recasts": 10
                },
                "replies": {
                    "count": 5
                }
            }
        ]
    }

@pytest.fixture(scope="session")
def mock_trending_casts():
    """Mock trending casts for testing"""
    return {
        "casts": [
            {
                "hash": "0x789...012",
                "thread_hash": "0x345...678",
                "parent_hash": None,
                "author": {
                    "fid": 67890,
                    "username": "trending_user"
                },
                "text": "Breaking: New AI model achieves state-of-the-art results! #AI #ML",
                "timestamp": "2024-03-15T11:00:00Z",
                "reactions": {
                    "likes": 1000,
                    "recasts": 200
                },
                "replies": {
                    "count": 100
                }
            }
        ]
    }

@pytest.fixture(scope="session")
def real_openai_config():
    """Configuration for real OpenAI API calls"""
    return {
        "model": os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview"),
        "temperature": 0.7,
        "max_tokens": 1000
    } 