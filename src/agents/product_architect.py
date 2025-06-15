# agents/product_architect.py

from google.adk.agents import Agent
from agents.ux_agent_adk import ux_agent
from agents.backend_agent_adk import backend_agent
from agents.db_agent_adk import db_agent

architect = Agent(
    name="architect",
    model="gemini-2.0-flash-lite-001",
    instruction="""
You are the team lead. Your job is to:
- Track consensus: when all agents agree, output final PRD

You are the lead architect. You will summarize debates and monitor PRD progress.
You do NOT call tools directly. Debate is orchestrated externally
Mark PRD as complete when no agent has objections.
"""
)

