# src/core/debate_orchestrator.py

import asyncio
from typing import List, Dict
from agents.base_agent import BaseAgent

class DebateOrchestrator:
    def __init__(self, agents: List[BaseAgent]):
        self.agents = agents
        self.current_topic = None
        self.debate_history = []
        self.context = {}

    async def start_debate(self, topic: str) -> dict:
        self.current_topic = topic
        self.debate_history = []
        self.context = {"previous_arguments": []}
        return await self._run_round()

    async def continue_debate(self) -> dict:
        return await self._run_round()

    async def revisit_topic(self) -> dict:
        self.debate_history = []
        self.context = {"previous_arguments": []}
        return await self._run_round()

    def get_debate_history(self) -> List[dict]:
        return self.debate_history

    async def _run_round(self) -> dict:
        async def run_agent(agent):
            # Wrap sync generate_argument in thread executor
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, agent.generate_argument, self.current_topic, self.context)

        tasks = [run_agent(agent) for agent in self.agents]
        round_results = await asyncio.gather(*tasks)

        # Update context
        for argument in round_results:
            self.context["previous_arguments"].append({
                "agent": argument["agent"],
                "position": argument["position"],
                "reasoning": argument["reasoning"]
            })

        self.debate_history.append({
            "round": len(self.debate_history) + 1,
            "results": round_results
        })

        return {
            "round": len(self.debate_history),
            "results": round_results
        }
