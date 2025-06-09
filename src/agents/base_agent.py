# src/agents/base_agent.py

from abc import ABC, abstractmethod

class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def generate_argument(self, topic: str, context: dict) -> dict:
        """
        Given a topic and context, generate the agent's argument.
        Should return: {"position": "for/against/neutral", "reasoning": "..."}
        """
        pass
