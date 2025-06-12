# AI Reply Service

A Python-based AI service for generating contextual replies using LangGraph workflows.

## Features

- **User Summary Workflow**: Analyzes user data to generate keyword profiles and embeddings
- **Reply Generation Workflow**: Three-step process for intelligent reply generation
  1. Intent Analysis (GPT-4)
  2. Content Discovery (GPT-4)
  3. Reply Generation (GPT-3.5)
- **Embeddings Workflow**: Generates text embeddings with optional preprocessing

## Setup

1. Install Poetry (package manager):
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

2. Install dependencies:
```bash
poetry install
```

3. Create a `.env` file with your OpenAI API key:
```bash
OPENAI_API_KEY=your_api_key_here
```

## Usage

### Running the Example Script

```bash
poetry run python example.py
```

This will demonstrate all three workflows with sample data.

### Starting the API Server

```bash
poetry run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### API Endpoints

#### 1. User Summary
```bash
POST /user-summary
{
    "user_data": {
        "username": "string",
        "bio": "string",
        "recent_casts": ["string"],
        "interests": ["string"],
        "engagement_stats": {
            "avg_replies": number,
            "avg_likes": number,
            "top_channels": ["string"]
        }
    }
}
```

#### 2. Reply Generation
```bash
POST /generate-reply
{
    "cast_text": "string",
    "available_feeds": [
        {
            "text": "string",
            "url": "string",
            "author": "string",
            "timestamp": "string"
        }
    ]
}
```

#### 3. Embeddings Generation
```bash
POST /generate-embeddings
{
    "input_data": {
        "title": "string",
        "content": "string",
        "tags": ["string"]
    }
}
```

## Project Structure

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── nodes.py             # LangGraph node implementations
│   ├── prompts.py           # Centralized prompt management
│   └── workflows/           # Workflow implementations
│       ├── __init__.py
│       ├── user_summary.py
│       ├── reply_generation.py
│       └── embeddings.py
├── example.py               # Example usage script
├── pyproject.toml          # Poetry configuration
└── README.md
```

## Development

- Uses Poetry for dependency management
- FastAPI for the REST API
- LangGraph for workflow orchestration
- OpenAI's GPT-4 and GPT-3.5 for different processing steps
- text-embedding-3-small for embeddings generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request 