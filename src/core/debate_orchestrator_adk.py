from agents.ux_agent_adk import ux_agent
from agents.db_agent_adk import db_agent
from agents.backend_agent_adk import backend_agent
from agents.frontend_agent_adk import frontend_agent
from agents.business_agent_adk import business_agent
# from vertexai.preview.text_analysis import TextAnalyzer

from vertexai.preview.reasoning_engines import AdkApp
from agents.architect_with_subagents import architect
from shared.prd_state import PRD_TEMPLATE, is_prd_stable
from tools.architect_toolkit import update_prd_from_agent
from tools.handle_mentions import extract_mention
from google.adk.models.llm_request import LlmRequest
from google.genai import types

class DebateOrchestratorADK:
    def __init__(self):
        self.app = AdkApp(agent=architect)
        self.agents = [ux_agent, db_agent, backend_agent, frontend_agent, business_agent]  # or however you import/instantiate
        self.context = {"history": [], "prd_state": {}}
        self.current_topic = ""
        self.debate_history = []
        self.prd_state = PRD_TEMPLATE.copy()
        self.topic = None
        

    async def start_debate(self, topic: str = ""):
        self.current_topic = topic
        self.debate_history = []
        self.context = {"history": [], "prd_state": {}, "topic": topic}

        # Use the architect to simulate different agent perspectives
        agent_roles = ["UX Designer", "Database Expert", "Backend Developer", "Frontend Developer", "Business Analyst"]
        
        for role in agent_roles:
            try:
                prompt = f"""
Topic: {topic}

You are acting as a {role} in a product development debate. 
Please provide your opening argument and perspective on this topic from the viewpoint of a {role}.
Focus on the concerns, priorities, and recommendations that a {role} would have.
"""
                
                # Use the same successful pattern as run_round
                response_chunks = self.app.stream_query(message=prompt, user_id="debate_user")
                response_text = ''.join([str(chunk) for chunk in response_chunks])

                argument = {"agent": role.lower().replace(" ", "_"), "text": response_text}
            except Exception as e:
                argument = {"agent": role.lower().replace(" ", "_"), "text": f"Error: {str(e)}"}

            self.debate_history.append({
                "agent": role.lower().replace(" ", "_"),
                "argument": argument,
            })
            self.context["history"].append(argument)

        return {
            "history": self.debate_history,
            "prd_state": self.context["prd_state"],
            "done": False
        }
    
    def reset(self, topic: str):
        self.topic = topic
        self.current_topic = topic
        self.context = {
            "prd_state": PRD_TEMPLATE.copy(),
            "history": [],
            "user_followup": None,
            "topic": topic
        }
        self.debate_history = []
        self.prd_state = PRD_TEMPLATE.copy()

    def _build_context_prompt(self, mention=None):
        prompt_parts = []
        prompt_parts.append(f"Topic: {self.context['topic']}")
        if mention:
            agent_name, msg = extract_mention(mention)
            self.context["user_followup"] = {
                "agent": agent_name,
                "message": msg
            }
            prompt_parts.append(f"User Question for {agent_name}: {msg}")
        prompt_parts.append(f"Current PRD State: {self.context['prd_state']}")
        if self.context.get("history"):
            recent_history = self.context["history"][-2:]
            if recent_history:
                prompt_parts.append("Recent Discussion:")
                for entry in recent_history:
                    for agent_name, response in entry.items():
                        prompt_parts.append(f"- {agent_name}: {str(response)[:100]}...")
        prompt_parts.append("Please provide your analysis and recommendations.")
        return "\n\n".join(prompt_parts)

    async def run_round(self, mention: str = None):
        if not self.context or "prd_state" not in self.context:
            raise ValueError("🛑 Debate context not initialized. Start a debate first.")
        prompt = self._build_context_prompt(mention)
        # Use stream_query to get streaming response from the app
        try:
            # query = {
            #     "prompt": prompt,
            #     "context": self.context
            # }
            response_chunks = self.app.stream_query(message=prompt, user_id="user1")
            response_text = ''.join([str(chunk) for chunk in response_chunks])

        except Exception as e:
            print(f"App call failed: {e}")
            response_text = f"Error: {str(e)}"

        # Parse the output as needed
        agent_responses = {"architect": response_text}
        self.debate_history.append(agent_responses)
        self.context["history"].append(agent_responses)
        consensus = True
        self.context["prd_state"], agreed = update_prd_from_agent(
            "architect", response_text, self.context["prd_state"]
        )
        if not agreed:
            consensus = False
        return {
            "history": self.debate_history,
            "prd_state": self.context["prd_state"],
            "done": is_prd_stable(self.context["prd_state"]) and consensus
        }

    def get_debate_history(self):
        return self.debate_history

    async def save_debate(self):
        import uuid, json, os
        session_id = str(uuid.uuid4())
        os.makedirs("data/debates", exist_ok=True)
        save_data = {
            "topic": self.current_topic,
            "history": self.debate_history,
            "prd_state": self.context.get("prd_state", {}) if self.context else {}
        }
        with open(f"data/debates/{session_id}.json", "w") as f:
            json.dump(save_data, f, indent=2)
        return session_id

    async def load_debate(self, session_id):
        import json
        try:
            with open(f"data/debates/{session_id}.json", "r") as f:
                data = json.load(f)
            self.debate_history = data.get("history", [])
            self.current_topic = data.get("topic", "Unknown")
            if not self.context:
                self.context = {}
            self.context["prd_state"] = data.get("prd_state", PRD_TEMPLATE.copy())
            return data
        except Exception as e:
            print(f"Error loading debate {session_id}: {e}")
            return {"error": f"Failed to load session: {str(e)}"}

    async def revisit_topic(self):
        if not self.context:
            return {"error": "No active debate session"}
        return await self.run_round()