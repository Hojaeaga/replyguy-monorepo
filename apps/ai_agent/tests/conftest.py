"""
Pytest configuration for AI Reply Service tests
"""
import pytest
import asyncio

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