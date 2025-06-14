"""
Embeddings Generation Workflow
"""
from typing import Dict, Any

from langgraph.graph import Graph

from ..models.llm import get_embeddings

class EmbeddingsWorkflow:
    """Workflow for generating embeddings"""
    
    def __init__(self):
        self.graph = self._build_graph()
        
    def _build_graph(self) -> Graph:
        """Build the workflow graph"""
        # Create nodes
        nodes = {
            "generate_embedding": get_embeddings
        }
        
        # Create graph
        graph = Graph()
        
        # Add nodes
        graph.add_node("generate_embedding", nodes["generate_embedding"])
        
        # Set entry and end points
        graph.set_entry_point("generate_embedding")
        graph.set_finish_point("generate_embedding")
        
        # Compile
        return graph.compile()
    
    async def run(self, text: str) -> Dict[str, Any]:
        """Run the workflow"""
        # Generate embedding directly from text
        embedding = await get_embeddings(text)
        return {
            "embedding": {
                "vector": embedding,
                "dimensions": len(embedding)
            }
        } 