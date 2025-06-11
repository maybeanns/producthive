# src/core/debate_orchestrator.py

import asyncio
from typing import List, Dict
from agents.base_agent import BaseAgent
from core.debate_history_store import DebateHistoryStore

class DebateOrchestrator:
    def __init__(self, agents: List[BaseAgent]):
        self.agents = agents
        self.current_topic = None
        self.debate_history = []
        self.context = {}
        self.history_store = DebateHistoryStore()
        self.prd_state = {
            "overview": "",
            "goals": [],
            "functional_requirements": [],
            "non_functional_requirements": [],
            "risks": [],
            "user_stories": [],
            "architecture_notes": [],
            "kanban_tasks": []
        }

    async def start_debate(self, topic: str) -> dict:
        self.current_topic = topic
        self.debate_history = []
        self.context = {"previous_arguments": []}
        return await self._run_round()
    
    async def save_debate(self) -> str:
        return self.history_store.save_debate(self.current_topic, self.debate_history)

    async def load_debate(self, session_id: str) -> dict:
        data = self.history_store.load_debate(session_id)
        if data:
            self.current_topic = data["topic"]
            self.debate_history = data["history"]
            self.context = {"previous_arguments": []}
            for round_data in self.debate_history:
                for argument in round_data["results"]:
                    self.context["previous_arguments"].append(argument)
            return data
        else:
            return {"error": "Session not found"}

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