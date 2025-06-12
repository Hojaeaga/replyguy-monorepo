"""
Embeddings Generation Workflow
"""
from typing import Dict, Any

from langgraph.graph import Graph

from ..models.llm import get_embeddings
from ..nodes import prepare_embedding_text

class EmbeddingsWorkflow:
    """Workflow for generating embeddings"""
    
    def __init__(self):
        self.graph = self._build_graph()
        
    def _build_graph(self) -> Graph:
        """Build the workflow graph"""
        # Create nodes
        nodes = {
            "prepare_text": prepare_embedding_text,
            "generate_embedding": get_embeddings
        }
        
        # Create graph
        graph = Graph()
        
        # Add nodes
        graph.add_node("prepare_text", nodes["prepare_text"])
        graph.add_node("generate_embedding", nodes["generate_embedding"])
        
        # Add edges
        graph.add_edge("prepare_text", "generate_embedding")
        
        # Set entry and end points
        graph.set_entry_point("prepare_text")
        graph.set_finish_point("generate_embedding")
        
        # Compile
        return graph.compile()
    
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run the workflow"""
        return await self.graph.ainvoke(inputs) 