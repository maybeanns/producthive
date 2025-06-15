# src/core/agent_registry.py

from agents.ux_agent_adk import ux_agent as UXDesignAgent
from agents.frontend_agent_adk import frontend_agent as FrontendAgent
from agents.backend_agent_adk import backend_agent as BackendAgent
from agents.db_agent_adk import db_agent as DatabaseAgent
from agents.business_agent_adk import business_agent as BusinessAgent
# etc.

def get_active_agents():
    agents = [
        UXDesignAgent(),
        FrontendAgent(),
        BusinessAgent(),
        DatabaseAgent(),
        # FinanceAgent(),
        # Add other agents here
        BackendAgent()
    ]
    return agents
