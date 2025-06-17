# diagnostic_script.py - Run this to understand your agent structure

from agents.ux_agent_adk import ux_agent
from agents.db_agent_adk import db_agent
from agents.backend_agent_adk import backend_agent
from agents.frontend_agent_adk import frontend_agent
from agents.business_agent_adk import business_agent

def diagnose_agent(agent, agent_name):
    print(f"\n=== {agent_name} DIAGNOSIS ===")
    print(f"Type: {type(agent)}")
    print(f"Dir: {[method for method in dir(agent) if not method.startswith('_')]}")
    
    # Check for common attributes
    if hasattr(agent, 'name'):
        print(f"Name: {agent.name}")
    if hasattr(agent, 'role'):
        print(f"Role: {agent.role}")
    
    # Check for callable methods
    methods_to_check = ['generate_argument', 'respond', 'generate_response', 'chat', 'ask', '__call__']
    for method in methods_to_check:
        if hasattr(agent, method):
            print(f"✓ Has method: {method}")
        else:
            print(f"✗ Missing method: {method}")
    
    # Try to get a sample response
    try:
        test_prompt = "Hello, what is your role?"
        
        # For Google ADK agents, try run_async (but it might not be actually async)
        if hasattr(agent, 'run_async'):
            try:
                # Try as async first
                import asyncio
                response = asyncio.run(agent.run_async(test_prompt))
            except ValueError as e:
                if "coroutine was expected" in str(e):
                    # It's not actually async, call it directly
                    response = agent.run_async(test_prompt)
                else:
                    raise e
            
            print(f"✓ Successfully called run_async()")
            print(f"Response type: {type(response)}")
            
            # Try to extract content
            if hasattr(response, 'content'):
                print(f"Sample response content: {str(response.content)[:100]}...")
            elif isinstance(response, dict) and 'content' in response:
                print(f"Sample response content: {str(response['content'])[:100]}...")
            elif isinstance(response, str):
                print(f"Sample response (string): {response[:100]}...")
            else:
                print(f"Sample response (other): {str(response)[:100]}...")
                print(f"Response attributes: {dir(response)}")
        else:
            print("✗ No run_async method found!")
            
    except Exception as e:
        print(f"Error testing agent: {e}")
        import traceback
        traceback.print_exc()

# Diagnose all agents
agents = [
    (ux_agent, "UX Agent"),
    (db_agent, "DB Agent"), 
    (backend_agent, "Backend Agent"),
    (frontend_agent, "Frontend Agent"),
    (business_agent, "Business Agent")
]

for agent, name in agents:
    diagnose_agent(agent, name)

print("\n" + "="*50)
print("RECOMMENDATION:")
print("Based on the diagnosis above, update the orchestrator to use the correct method names.")
print("Most likely methods: respond(), generate_response(), chat(), or __call__()")