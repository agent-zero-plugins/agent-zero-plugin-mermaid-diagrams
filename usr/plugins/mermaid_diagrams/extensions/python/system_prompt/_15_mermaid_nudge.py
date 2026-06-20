from typing import Any
from helpers.extension import Extension
from agent import Agent, LoopData


class MermaidNudge(Extension):
    """Inject behavioral nudge for Mermaid diagram usage."""

    async def execute(
        self,
        system_prompt: list[str] = [],
        loop_data: LoopData = LoopData(),
        **kwargs: Any,
    ):
        if not self.agent:
            return
        system_prompt.append(MERMAID_BEHAVIORAL_NUDGE)


MERMAID_BEHAVIORAL_NUDGE = """\
## Visual explanations
When the user struggles to understand a concept, asks for clarification on a process or flow, \
says "show me", "visualize", "draw", "diagram", or when explaining architectures, workflows, \
state machines, data models, or relationships — use the `mermaid` skill to generate a diagram \
using ```mermaid fenced code blocks.
Diagram type selection: flowcharts for processes, sequence diagrams for interactions, \
class diagrams for structures, state diagrams for state machines, ER diagrams for data models, \
mindmaps for brainstorming, timelines for chronological events.
Do not overuse diagrams for simple concepts that are better explained in text.
Load the mermaid skill first if you need syntax reference.
"""
