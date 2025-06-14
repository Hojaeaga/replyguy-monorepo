# trending_workflow.py

from typing import Any, Dict

from langgraph.graph import Graph

from ..nodes import build_topic_map, extract_topics_llm, generate_cast_embeddings


class TrendingGalaxyWorkflow:
    """Workflow for analyzing trending Farcaster casts into topic clusters."""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> Graph:
        graph = Graph()

        graph.add_node("generate_embeddings", generate_cast_embeddings)
        graph.add_node("extract_topics", extract_topics_llm)
        graph.add_node("build_topic_map", build_topic_map)

        graph.add_edge("generate_embeddings", "extract_topics")
        graph.add_edge("extract_topics", "build_topic_map")

        graph.set_entry_point("generate_embeddings")
        graph.set_finish_point("build_topic_map")

        return graph.compile()

    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return await self.graph.ainvoke(inputs)
