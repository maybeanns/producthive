# tools/generate_agent.py

import sys
from pathlib import Path

AGENT_TEMPLATE = """\
from agents.base_agent import BaseAgent
from langchain_google_vertexai import VertexAI
from langchain.prompts import PromptTemplate

class {agent_class}(BaseAgent):
    def __init__(self):
        super().__init__(name="{agent_name}")
        self.llm = VertexAI(model_name="gemini-1.5-pro")

        self.prompt_template = PromptTemplate.from_template(\"\"\"\
You are an expert {agent_name} with deep domain knowledge.

Topic:
"{{topic}}"

Context:
{{context}}

Please provide your position (FOR / AGAINST / NEUTRAL) and a reasoning chain (3 steps).

Format:
Position: <FOR/AGAINST/NEUTRAL>
Reasoning:
- Step 1: ...
- Step 2: ...
- Step 3: ...
\"\"\")

    def generate_argument(self, topic: str, context: dict) -> dict:
        full_prompt = self.prompt_template.format(topic=topic, context=context)
        response = self.llm.invoke(full_prompt)

        lines = response.splitlines()
        position_line = next((line for line in lines if line.startswith("Position:")), "Position: UNKNOWN")
        position = position_line.split(":", 1)[1].strip()

        reasoning_steps = [line.strip() for line in lines if line.startswith("- Step")]

        return {{
            "agent": self.name,
            "position": position,
            "reasoning": reasoning_steps
        }}
"""

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate_agent.py AgentName")
        sys.exit(1)

    agent_name = sys.argv[1]
    agent_class = agent_name.replace(" ", "") + "Agent"

    filename = f"src/agents/{agent_class.lower()}.py"
    content = AGENT_TEMPLATE.format(agent_name=agent_name, agent_class=agent_class)

    Path(filename).write_text(content)
    print(f"Generated agent file: {filename}")

if __name__ == "__main__":
    main()
