"""
Tests for the User Summary workflow
"""
import unittest
from unittest.mock import patch, AsyncMock
import json

from app.workflows.user_summary import UserSummaryWorkflow
from app.models.llm import get_reasoning_model, get_embeddings_model

class TestUserSummaryWorkflow(unittest.TestCase):
    def setUp(self):
        self.workflow = UserSummaryWorkflow()
        self.test_user_data = {
            "username": "test_user",
            "bio": "AI enthusiast and developer",
            "recent_casts": ["Hello world!", "Testing AI"],
            "interests": ["AI", "Programming"],
            "engagement_stats": {
                "avg_replies": 5,
                "avg_likes": 10,
                "top_channels": ["tech", "ai"]
            }
        }
        
    @patch('app.models.llm.get_reasoning_model')
    @patch('app.models.llm.get_embeddings_model')
    async def test_user_summary_workflow(self, mock_embed, mock_reason):
        # Mock the AI responses
        mock_reason.return_value.ainvoke.return_value = AsyncMock(
            content="ai, programming, technology, development"
        )
        mock_embed.return_value.aembed_query.return_value = [0.1, 0.2, 0.3]  # Mock embedding vector
        
        # Run the workflow
        result = await self.workflow.run({"user_data": self.test_user_data})
        
        # Verify the workflow processed the data correctly
        self.assertIn("user_summary", result)
        self.assertIn("user_embedding", result)
        
        # Check user summary structure
        self.assertIn("keywords", result["user_summary"])
        self.assertIn("raw_summary", result["user_summary"])
        
        # Check embedding structure
        self.assertIn("vector", result["user_embedding"])
        self.assertIn("dimensions", result["user_embedding"])
        
        # Verify the mocks were called
        mock_reason.return_value.ainvoke.assert_called_once()
        mock_embed.return_value.aembed_query.assert_called_once()
        
    @patch('app.models.llm.get_reasoning_model')
    @patch('app.models.llm.get_embeddings_model')
    async def test_empty_user_data(self, mock_embed, mock_reason):
        # Mock the AI responses for empty data
        mock_reason.return_value.ainvoke.return_value = AsyncMock(content="")
        mock_embed.return_value.aembed_query.return_value = []
        
        empty_user_data = {
            "username": "",
            "bio": "",
            "recent_casts": [],
            "interests": [],
            "engagement_stats": {
                "avg_replies": 0,
                "avg_likes": 0,
                "top_channels": []
            }
        }
        
        # Run the workflow
        result = await self.workflow.run({"user_data": empty_user_data})
        
        # Verify the workflow handles empty data gracefully
        self.assertIn("user_summary", result)
        self.assertIn("user_embedding", result)
        self.assertEqual(result["user_summary"]["keywords"], [""])

    @patch('app.nodes.REASONING_MODEL.ainvoke')
    async def test_user_summary_workflow_positive(self, mock_reason):
        # Mock the AI response
        mock_reason.return_value = AsyncMock(content=json.dumps({
            "keywords": ["web3", "ai", "programming", "crypto"],
            "raw_summary": "Tech-savvy developer focused on web3 and AI"
        }))
        
        # Run the workflow
        result = await self.workflow.process({"user_data": self.test_user_data})
        
        # Verify the workflow processed the data correctly
        self.assertIn("user_summary", result)
        self.assertIn("keywords", result["user_summary"])
        self.assertIn("raw_summary", result["user_summary"])
        self.assertIn("user_embedding", result)
        
    @patch('app.nodes.REASONING_MODEL.ainvoke')
    async def test_user_summary_workflow_empty(self, mock_reason):
        # Mock the AI response for empty data
        mock_reason.return_value = AsyncMock(content=json.dumps({
            "keywords": [],
            "raw_summary": "No user data available"
        }))
        
        # Run the workflow with empty data
        empty_user_data = {}
        result = await self.workflow.process({"user_data": empty_user_data})
        
        # Verify the workflow handled empty data correctly
        self.assertIn("user_summary", result)
        self.assertIn("keywords", result["user_summary"])
        self.assertIn("raw_summary", result["user_summary"])
        self.assertIn("user_embedding", result)

if __name__ == '__main__':
    unittest.main() 