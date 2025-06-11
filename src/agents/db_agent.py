# src/agents/db_agent.py
import vertexai
from agents.base_agent import BaseAgent
from langchain_google_vertexai import VertexAI
from langchain.prompts import PromptTemplate

class DatabaseAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Database Agent")
        vertexai.init(project="producthive-462420", location="us-central1")
        self.llm = VertexAI(model_name="gemini-2.0-flash-lite-001")

        self.prompt_template = PromptTemplate.from_template("""
You are an expert Database Architect with expertise in:
- Relational and NoSQL databases
- Data modeling
- Query optimization
- Data consistency and integrity
- Scalability and replication
- Backup and disaster recovery

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
