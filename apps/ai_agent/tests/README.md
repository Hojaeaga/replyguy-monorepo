# AI Agent Tests

This directory contains tests for the AI Agent service, which implements the Galaxy-based social graph system for Farcaster.

## Test Structure

The tests are organized as follows:

- `test_workflows.py`: Contains tests for all workflow components
  - User Summary Workflow
  - Embeddings Workflow
  - Trending Galaxy Workflow
  - Reply Generation Workflow
  - Integrated Workflow Test

- `conftest.py`: Contains pytest fixtures and configuration
  - Mock environment variables
  - Mock user data
  - Mock user casts
  - Mock trending casts

## Running Tests

1. Install dependencies:
```bash
poetry install
```

2. Run all tests:
```bash
poetry run pytest
```

3. Run specific test file:
```bash
poetry run pytest tests/test_workflows.py
```

4. Run with coverage report:
```bash
poetry run pytest --cov=app --cov-report=term-missing
```

## Mock Data

The tests use mock data that simulates the Neynar API responses. The mock data includes:

1. User Data:
   - Basic user information
   - Profile details
   - Follower/Following counts
   - Verification status

2. User Casts:
   - Cast content
   - Engagement metrics
   - Thread information
   - Timestamps

3. Trending Casts:
   - Popular content
   - High engagement metrics
   - Topic clustering data

## Test Coverage

The tests cover the following aspects:

1. User Summary Workflow:
   - User data processing
   - Keyword extraction
   - Summary generation
   - Embedding creation

2. Embeddings Workflow:
   - Text embedding generation
   - Vector validation

3. Trending Galaxy Workflow:
   - Cast clustering
   - Topic identification
   - User relevance scoring

4. Reply Generation Workflow:
   - Context-aware reply generation
   - Relevance scoring
   - Feed integration

5. Integrated Workflow:
   - End-to-end flow testing
   - Data consistency
   - Workflow integration 