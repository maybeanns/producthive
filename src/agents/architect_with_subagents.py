from google.adk.agents import LlmAgent

# Define individual agents
ux_agent = LlmAgent(
    name="uxagent",
    model="gemini-2.0-flash-lite-001",
    instruction="""You are a UX expert contributing to a collaborative debate..."""
)

db_agent = LlmAgent(
    name="dbagent",
    model="gemini-2.0-flash-lite-001",
    instruction="""You are a database expert in the debate..."""
)

backend_agent = LlmAgent(
    name="backendagent",
    model="gemini-2.0-flash-lite-001",
    instruction="""You are a backend expert in the debate..."""
)

frontend_agent = LlmAgent(
    name="frontendagent",
    model="gemini-2.0-flash-lite-001",
    instruction="""You are a frontend expert in the debate..."""
)

business_agent = LlmAgent(
    name="businessagent",
    model="gemini-2.0-flash-lite-001",
    instruction="""You are a business expert in the debate..."""
)

# Coordinator/architect agent with all subagents attached
from google.adk.agents import LlmAgent

architect = LlmAgent(
    name="architect",
    model="gemini-2.0-flash-lite-001",
    instruction="You are the architect who coordinates the debate and aggregates all expert opinions.",
    sub_agents=[ux_agent, db_agent, backend_agent, frontend_agent, business_agent]
)