"""
User Summary Workflow
"""
from typing import Dict, Any

from langgraph.graph import Graph

from ..nodes import process_user_data, generate_user_embedding

class UserSummaryWorkflow:
    """Workflow for generating user summaries and embeddings"""
    
    def __init__(self):
        self.graph = self._build_graph()
        
    def _build_graph(self) -> Graph:
        """Build the workflow graph"""
        # Create nodes
        nodes = {
            "process_data": process_user_data,
            "generate_embedding": generate_user_embedding
        }
        
        # Create graph
        graph = Graph()
        
        # Add nodes
        graph.add_node("process_data", nodes["process_data"])
        graph.add_node("generate_embedding", nodes["generate_embedding"])
        
        # Add edges
        graph.add_edge("process_data", "generate_embedding")
        
        # Set entry and end points
        graph.set_entry_point("process_data")
        graph.set_finish_point("generate_embedding")
        
        # Compile
        return graph.compile()
    
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run the workflow"""
        return await self.graph.ainvoke(inputs) 