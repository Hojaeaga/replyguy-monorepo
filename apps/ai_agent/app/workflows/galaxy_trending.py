# trending_workflow.py

from typing import Any, Dict

from langgraph.graph import Graph

from ..nodes import (
    generate_trending_clusters,
    match_trending_to_user,
    suggest_viral_hooks,
)


class TrendingGalaxyWorkflow:
    """Workflow for analyzing trending Farcaster casts into topic clusters."""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> Graph:
        graph = Graph()
        graph.add_node("generate_trending_clusters", generate_trending_clusters)
        graph.add_node("match_to_user_galaxy", match_trending_to_user)
        graph.add_node("generate_viral_reply_ideas", suggest_viral_hooks)

        graph.add_edge("generate_trending_clusters", "match_to_user_galaxy")
        graph.add_edge("match_to_user_galaxy", "generate_viral_reply_ideas")

        graph.set_entry_point("generate_trending_clusters")
        graph.set_finish_point("generate_viral_reply_ideas")

        return graph.compile()

    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        return await self.graph.ainvoke(inputs)
