"""
Base workflow implementation
"""
from typing import Dict, Any, List

from langgraph.graph import Graph

class WorkflowConfig:
    """Base configuration for workflows"""
    pass

class BaseWorkflow:
    """Base class for all workflows"""
    
    def __init__(self, config: WorkflowConfig):
        self.config = config
        self.graph = None
    
    def _get_workflow_steps(self) -> List[str]:
        """Get the list of steps in the workflow"""
        return []
    
    def _build_graph(self) -> Graph:
        """Build the workflow graph"""
        raise NotImplementedError
    
    async def _execute_with_logging(self, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the workflow with logging"""
        try:
            # Execute the workflow
            result = await self.graph.ainvoke(initial_state)
            
            # If result is a dict and doesn't have a reply key, add a default structure
            if isinstance(result, dict) and "reply" not in result:
                result = {
                    "reply": {
                        "reply_text": "No response generated",
                        "link": None
                    }
                }
            
            return result
            
        except Exception as e:
            # Return a safe default response
            return {
                "reply": {
                    "reply_text": f"Error occurred: {str(e)}",
                    "link": None
                }
            }
    
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process the input data"""
        raise NotImplementedError
    
    def get_config(self) -> Dict[str, Any]:
        """Get the workflow configuration"""
        return self.config.__dict__ 