# src/agents/ux_agent.py

import vertexai
from agents.base_agent import BaseAgent
from langchain_google_vertexai import VertexAI
from langchain.prompts import PromptTemplate
# from core.vertex import init_vertex

class UXDesignAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="UX Design Agent")
        vertexai.init(project="producthive-462420", location="us-central1")
        self.llm = VertexAI(model_name="gemini-2.0-flash-lite-001")

        # Pre-load UX design principles into system prompt
        self.prompt_template = PromptTemplate.from_template("""
You are an expert UX Designer with extensive knowledge of:
- UX research methods
- User-centered design
- Accessibility
- Interaction design
- Visual hierarchy
- Usability testing

You are part of a product team. The current topic is:

"{topic}"

The context so far is:
{context}

Please state your position (FOR / AGAINST / NEUTRAL) and provide a detailed reasoning chain (at least 3 steps) to support your position.

Return your result in this format:
Position: <FOR/AGAINST/NEUTRAL>
Reasoning:
- Step 1: ...
- Step 2: ...
- Step 3: ...
""")

    def generate_argument(self, topic: str, context: dict) -> dict:
        full_prompt = self.prompt_template.format(topic=topic, context=context)

        response = self.llm.invoke(full_prompt)

        # Simple parsing of response (you can improve with regex or structured output)
        lines = response.splitlines()
        position_line = next((line for line in lines if line.startswith("Position:")), "Position: UNKNOWN")
        position = position_line.split(":", 1)[1].strip()

        reasoning_steps = [line.strip() for line in lines if line.startswith("- Step")]

        return {
            "agent": self.name,
            "position": position,
            "reasoning": reasoning_steps
        }
