import time
from typing import Dict, Any, Optional

from langgraph.graph import Graph, StateGraph
from pydantic import BaseModel

from .workflows.intent_analysis import IntentAnalysisWorkflow, IntentAnalysisConfig
from .workflows.content_discovery import ContentDiscoveryWorkflow, ContentDiscoveryConfig
from .workflows.reply_generation import ReplyGenerationWorkflow, ReplyGenerationConfig
from .models import CastInput, PipelineResponse
from .services.logging_service import WorkflowLogger

class PipelineConfig(BaseModel):
    """Configuration for the entire pipeline"""
    intent_analysis: IntentAnalysisConfig = IntentAnalysisConfig()
    content_discovery: ContentDiscoveryConfig = ContentDiscoveryConfig()
    reply_generation: ReplyGenerationConfig = ReplyGenerationConfig()

class ReplyPipeline:
    """Main pipeline for processing casts and generating replies"""
    
    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or PipelineConfig()
        
        # Initialize workflows
        self.intent_workflow = IntentAnalysisWorkflow(self.config.intent_analysis)
        self.discovery_workflow = ContentDiscoveryWorkflow(self.config.content_discovery)
        self.reply_workflow = ReplyGenerationWorkflow(self.config.reply_generation)
        
        # Initialize logger
        self.logger = WorkflowLogger("ReplyPipeline")
        
        # Create the workflow graph
        self.workflow = self._create_workflow()
    
    def _create_workflow(self) -> Graph:
        """Create the LangGraph workflow"""
        workflow = StateGraph(Dict)
        
        # Add nodes for each step
        workflow.add_node("analyze_intent", self._wrap_node_with_logging(self._analyze_intent, "analyze_intent"))
        workflow.add_node("discover_content", self._wrap_node_with_logging(self._discover_content, "discover_content"))
        workflow.add_node("generate_reply", self._wrap_node_with_logging(self._generate_reply, "generate_reply"))
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "analyze_intent",
            self._should_continue_pipeline,
            {
                True: "discover_content",
                False: None  # End workflow if no reply needed
            }
        )
        
        # Add remaining edges
        workflow.add_edge("discover_content", "generate_reply")
        
        # Set entry point
        workflow.set_entry_point("analyze_intent")
        
        return workflow.compile()
    
    def _wrap_node_with_logging(self, node_func, step_name):
        """Wrap a node function with logging"""
        async def wrapped_node(state: Dict[str, Any]) -> Dict[str, Any]:
            self.logger.start_step(step_name)
            try:
                result = await node_func(state)
                self.logger.complete_step(step_name, metadata={"result": result})
                return result
            except Exception as e:
                self.logger.fail_step(step_name, str(e))
                raise
        return wrapped_node
    
    async def _analyze_intent(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze if the cast needs a reply"""
        result = await self.intent_workflow.process(state["input"])
        state["intent_analysis"] = result
        return state
    
    def _should_continue_pipeline(self, state: Dict[str, Any]) -> bool:
        """Determine if we should continue processing"""
        return state["intent_analysis"]["should_reply"]
    
    async def _discover_content(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Discover relevant content for the reply"""
        result = await self.discovery_workflow.process(state["input"])
        state["content_discovery"] = result
        return state
    
    async def _generate_reply(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate the final reply"""
        input_data = {
            **state["input"],
            "reference_content": state["content_discovery"]["candidates"][0]["text"]
            if state["content_discovery"]["candidates"]
            else ""
        }
        
        result = await self.reply_workflow.process(input_data)
        state["reply_generation"] = result
        return state
    
    async def process(self, cast_input: CastInput) -> PipelineResponse:
        """Process a cast through the entire pipeline"""
        # Start workflow tracking
        workflow_id = f"pipeline_{int(time.time())}"
        self.logger.start_workflow(workflow_id, metadata={"input": cast_input.model_dump()})
        
        try:
            # Add steps
            for step in ["analyze_intent", "discover_content", "generate_reply"]:
                self.logger.add_step(step)
            
            # Prepare initial state
            initial_state = {
                "input": cast_input.model_dump(),
                "start_time": time.time()
            }
            
            # Execute workflow
            final_state = await self.workflow.ainvoke(initial_state)
            
            # Prepare response
            response = PipelineResponse(
                intent_analysis=final_state.get("intent_analysis", {}),
                recommended_replies=[
                    candidate for candidate in 
                    final_state.get("content_discovery", {}).get("candidates", [])
                ] if "content_discovery" in final_state else None,
                selected_reply=final_state.get("reply_generation", {}).get("reply_text")
                if "reply_generation" in final_state else None,
                processing_time=time.time() - final_state["start_time"]
            )
            
            # Complete workflow
            self.logger.complete_workflow(metadata={"response": response.model_dump()})
            return response
            
        except Exception as e:
            # Log failure
            self.logger.fail_workflow(str(e))
            raise 