"""
Logging service for workflow state tracking and monitoring
"""
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class WorkflowStatus(Enum):
    """Status of a workflow step"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class WorkflowStep:
    """Represents a step in a workflow"""
    name: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WorkflowState:
    """Tracks the state of a workflow execution"""
    workflow_id: str
    workflow_name: str
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    steps: List[WorkflowStep] = field(default_factory=list)
    current_step_index: int = 0
    status: WorkflowStatus = WorkflowStatus.PENDING
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class WorkflowLogger:
    """Service for logging workflow execution and state tracking"""
    
    def __init__(self, workflow_name: str):
        self.logger = logging.getLogger(f"workflow.{workflow_name}")
        self.workflow_name = workflow_name
        self.current_state: Optional[WorkflowState] = None
    
    def start_workflow(self, workflow_id: str, metadata: Optional[Dict[str, Any]] = None) -> WorkflowState:
        """Start tracking a new workflow execution"""
        self.current_state = WorkflowState(
            workflow_id=workflow_id,
            workflow_name=self.workflow_name,
            metadata=metadata or {}
        )
        self.logger.info(f"Starting workflow {workflow_id}")
        return self.current_state
    
    def add_step(self, step_name: str, metadata: Optional[Dict[str, Any]] = None) -> WorkflowStep:
        """Add a new step to the workflow"""
        if not self.current_state:
            raise RuntimeError("No active workflow")
        
        step = WorkflowStep(
            name=step_name,
            metadata=metadata or {}
        )
        self.current_state.steps.append(step)
        self.logger.info(f"Added step: {step_name}")
        return step
    
    def start_step(self, step_name: str) -> None:
        """Mark a step as started"""
        if not self.current_state:
            raise RuntimeError("No active workflow")
        
        step = self._get_current_step()
        if step.name != step_name:
            raise ValueError(f"Expected step {step_name}, but current step is {step.name}")
        
        step.status = WorkflowStatus.IN_PROGRESS
        step.start_time = time.time()
        self.logger.info(f"Starting step: {step_name}")
    
    def complete_step(self, step_name: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Mark a step as completed"""
        if not self.current_state:
            raise RuntimeError("No active workflow")
        
        step = self._get_current_step()
        if step.name != step_name:
            raise ValueError(f"Expected step {step_name}, but current step is {step.name}")
        
        step.status = WorkflowStatus.COMPLETED
        step.end_time = time.time()
        if metadata:
            step.metadata.update(metadata)
        
        self.current_state.current_step_index += 1
        self.logger.info(f"Completed step: {step_name}")
    
    def fail_step(self, step_name: str, error: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Mark a step as failed"""
        if not self.current_state:
            raise RuntimeError("No active workflow")
        
        step = self._get_current_step()
        if step.name != step_name:
            raise ValueError(f"Expected step {step_name}, but current step is {step.name}")
        
        step.status = WorkflowStatus.FAILED
        step.end_time = time.time()
        step.error = error
        if metadata:
            step.metadata.update(metadata)
        
        self.current_state.status = WorkflowStatus.FAILED
        self.current_state.error = error
        self.logger.error(f"Step failed: {step_name} - {error}")
    
    def complete_workflow(self, metadata: Optional[Dict[str, Any]] = None) -> WorkflowState:
        """Mark the workflow as completed"""
        if not self.current_state:
            raise RuntimeError("No active workflow")
        
        self.current_state.end_time = time.time()
        self.current_state.status = WorkflowStatus.COMPLETED
        if metadata:
            self.current_state.metadata.update(metadata)
        
        self.logger.info(f"Completed workflow {self.current_state.workflow_id}")
        return self.current_state
    
    def fail_workflow(self, error: str, metadata: Optional[Dict[str, Any]] = None) -> WorkflowState:
        """Mark the workflow as failed"""
        if not self.current_state:
            raise RuntimeError("No active workflow")
        
        self.current_state.end_time = time.time()
        self.current_state.status = WorkflowStatus.FAILED
        self.current_state.error = error
        if metadata:
            self.current_state.metadata.update(metadata)
        
        self.logger.error(f"Workflow failed: {error}")
        return self.current_state
    
    def get_workflow_state(self) -> Optional[WorkflowState]:
        """Get the current workflow state"""
        return self.current_state
    
    def _get_current_step(self) -> WorkflowStep:
        """Get the current step in the workflow"""
        if not self.current_state or not self.current_state.steps:
            raise RuntimeError("No active steps in workflow")
        return self.current_state.steps[self.current_state.current_step_index] 