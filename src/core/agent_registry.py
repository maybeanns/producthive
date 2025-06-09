# src/core/agent_registry.py

from agents.ux_agent import UXDesignAgent
from agents.frontend_agent import FrontendAgent
from agents.backend_agent import BackendAgent
from agents.db_agent import DatabaseAgent
from agents.business_agent import BusinessAgent
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
