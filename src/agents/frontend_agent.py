# src/agents/frontend_agent.py

from agents.base_agent import BaseAgent
from langchain_google_vertexai import VertexAI
from langchain.prompts import PromptTemplate

class FrontendAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Frontend Agent")
        self.llm = VertexAI(model_name="gemini-1.5-pro")

        self.prompt_template = PromptTemplate.from_template("""
You are an expert Frontend Engineer with knowledge of:
- Web performance
- Responsive design
- Accessibility
- Modern frontend frameworks (React, Vue, Angular)
- Component-driven development
- UI architecture best practices

Topic:
"{topic}"

Context:
{context}

Please provide your position (FOR / AGAINST / NEUTRAL) and a reasoning chain (3 steps).

Format:
Position: <FOR/AGAINST/NEUTRAL>
Reasoning:
- Step 1: ...
- Step 2: ...
- Step 3: ...
""")

    def generate_argument(self, topic: str, context: dict) -> dict:
        full_prompt = self.prompt_template.format(topic=topic, context=context)
        response = self.llm.invoke(full_prompt)

        lines = response.splitlines()
        position_line = next((line for line in lines if line.startswith("Position:")), "Position: UNKNOWN")
        position = position_line.split(":", 1)[1].strip()

        reasoning_steps = [line.strip() for line in lines if line.startswith("- Step")]

        return {
            "agent": self.name,
            "position": position,
            "reasoning": reasoning_steps
        }
