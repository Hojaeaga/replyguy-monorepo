"""
Reply Generation Workflow
"""
from typing import Dict, Any

from langgraph.graph import Graph

from ..nodes import check_reply_intent, discover_relevant_content, generate_reply
from .base import BaseWorkflow, WorkflowConfig

class ReplyGenerationConfig(WorkflowConfig):
    """Configuration for reply generation workflow"""
    pass

class ReplyGenerationWorkflow(BaseWorkflow):
    """Workflow for generating contextual replies"""
    
    def __init__(self, config: ReplyGenerationConfig = ReplyGenerationConfig()):
        super().__init__(config)
        self.graph = self._build_graph()
    
    def _get_workflow_steps(self) -> list[str]:
        """Get the list of steps in the workflow"""
        return [
            "check_intent",
            "discover_content",
            "generate_reply"
        ]
    
    def _build_graph(self) -> Graph:
        """Build the workflow graph"""
        # Create nodes
        nodes = {
            "check_intent": check_reply_intent,
            "discover_content": discover_relevant_content,
            "generate_reply": generate_reply
        }
        
        # Create graph
        graph = Graph()
        
        # Add nodes
        graph.add_node("check_intent", nodes["check_intent"])
        graph.add_node("discover_content", nodes["discover_content"])
        graph.add_node("generate_reply", nodes["generate_reply"])
        
        # Add edges
        graph.add_edge("check_intent", "discover_content")
        graph.add_edge("discover_content", "generate_reply")
        
        # Set entry and end points
        graph.set_entry_point("check_intent")
        graph.set_finish_point("generate_reply")
        
        # Compile
        return graph.compile()
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run the workflow"""
        # Prepare the initial state
        initial_state = {
            "cast_text": input_data["cast_text"],
            "available_feeds": input_data.get("available_feeds", [])
        }
        
        # Execute the workflow
        result = await self.graph.ainvoke(initial_state)
        
        # Return the raw result
        return result
    
    def get_config(self) -> Dict[str, Any]:
        """Get the workflow configuration"""
        return self.config.__dict__ 