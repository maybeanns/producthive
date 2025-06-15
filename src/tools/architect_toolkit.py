# tools/architect_toolkit.py

def update_prd_from_agent(agent_name, agent_response, prd_state):
    """Simple text-based parser for PRD suggestions."""
    if "agree" in agent_response.lower():
        return prd_state, True

    if "features:" in agent_response.lower():
        lines = agent_response.splitlines()
        for line in lines:
            if "features:" in line.lower():
                continue
            if line.startswith("-") or line.strip().startswith("*"):
                prd_state["features"].append(line.strip("-* ").strip())

    # Add your own structured rules for goals, architecture, etc.
    return prd_state, False
