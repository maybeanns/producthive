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
        self.agents = [ux_agent, db_agent, backend_agent, frontend_agent, business_agent]
        self.context = {"history": [], "prd_state": {}}
        self.current_topic = ""
        self.debate_history = []
        self.prd_state = PRD_TEMPLATE.copy()
        self.topic = None
        self.round_number = 0
        

    async def start_debate(self, topic: str = ""):
        """Initialize the debate with the topic and create the first round"""
        self.current_topic = topic
        self.debate_history = []
        self.round_number = 1
        self.context = {"history": [], "prd_state": PRD_TEMPLATE.copy(), "topic": topic}
        self.prd_state = PRD_TEMPLATE.copy()

        # Create the first round with all agents participating
        round_result = await self._run_debate_round()
        
        return {
            "history": self.debate_history,
            "prd_state": self.context["prd_state"],
            "done": False,
            "round": self.round_number
        }
    
    async def _run_debate_round(self, mention: str = None):
        """Run a complete debate round where all agents interact with each other"""
        agent_roles = ["UX Designer", "Database Expert", "Backend Developer", "Frontend Developer", "Business Analyst"]
        round_responses = {}
        
        # Build context for this round
        round_context = self._build_round_context(mention)
        
        # Each agent responds to the current context (including previous agents' responses in this round)
        for i, role in enumerate(agent_roles):
            # Build prompt that includes context + previous responses in this round
            current_round_context = self._build_agent_prompt(role, round_context, round_responses)
            
            try:
                response_chunks = self.app.stream_query(
                    message=current_round_context, 
                    user_id=f"debate_user_{role.lower().replace(' ', '_')}"
                )
                response_text = ''.join([str(chunk) for chunk in response_chunks])
                
                # Store this agent's response
                agent_key = role.lower().replace(" ", "_")
                round_responses[agent_key] = {"text": response_text}
                
            except Exception as e:
                agent_key = role.lower().replace(" ", "_")
                round_responses[agent_key] = {"text": f"Error: {str(e)}"}
        
        # Add this complete round to debate history
        self.debate_history.append(round_responses)
        self.context["history"].append(round_responses)
        
        # Update PRD state based on the round
        consensus = True
        for agent_key, response in round_responses.items():
            self.context["prd_state"], agreed = update_prd_from_agent(
                agent_key, response["text"], self.context["prd_state"]
            )
            if not agreed:
                consensus = False
        
        return consensus

    def _build_round_context(self, mention=None):
        """Build the base context for the current round"""
        context_parts = []
        context_parts.append(f"Topic: {self.context['topic']}")
        context_parts.append(f"Round: {self.round_number}")
        
        if mention:
            agent_name, msg = extract_mention(mention)
            self.context["user_followup"] = {
                "agent": agent_name,
                "message": msg
            }
            context_parts.append(f"User Question for {agent_name}: {msg}")
        
        context_parts.append(f"Current PRD State: {self.context['prd_state']}")
        
        # Include previous rounds' history (not current round)
        if len(self.context["history"]) > 0:
            context_parts.append("Previous Rounds Summary:")
            for round_idx, round_data in enumerate(self.context["history"][-2:], 1):  # Last 2 rounds
                context_parts.append(f"Round {round_idx} Summary:")
                for agent_name, response in round_data.items():
                    response_text = response.get("text", str(response))[:150] + "..."
                    context_parts.append(f"  - {agent_name}: {response_text}")
        
        return "\n\n".join(context_parts)

    def _build_agent_prompt(self, role, base_context, current_round_responses):
        """Build the prompt for a specific agent including responses from other agents in this round"""
        prompt_parts = [base_context]
        
        # Add current round responses from agents who have already spoken
        if current_round_responses:
            prompt_parts.append(f"\nCurrent Round - Other Agents' Responses:")
            for agent_name, response in current_round_responses.items():
                agent_display_name = agent_name.replace("_", " ").title()
                response_text = response.get("text", str(response))
                prompt_parts.append(f"\n{agent_display_name}: {response_text}")
        
        # Add role-specific instruction
        if self.round_number == 1:
            prompt_parts.append(f"""
You are acting as a {role} in a product development debate. 
Please provide your opening argument and perspective on this topic.
Focus on the concerns, priorities, and recommendations that a {role} would have.
Respond to other agents' points if they've already shared their perspectives in this round.
""")
        else:
            prompt_parts.append(f"""
You are acting as a {role} in a product development debate. 
Continue the discussion by responding to previous rounds and current agent responses.
Build upon, challenge, or support other agents' points as appropriate.
Focus on moving the discussion forward and refining the PRD.
""")
        
        return "\n\n".join(prompt_parts)

    def reset(self, topic: str):
        self.topic = topic
        self.current_topic = topic
        self.round_number = 0
        self.context = {
            "prd_state": PRD_TEMPLATE.copy(),
            "history": [],
            "user_followup": None,
            "topic": topic
        }
        self.debate_history = []
        self.prd_state = PRD_TEMPLATE.copy()

    def _build_context_prompt(self, mention=None):
        """Legacy method - kept for compatibility"""
        return self._build_round_context(mention)

    async def run_round(self, mention: str = None):
        """Continue the debate with a new round"""
        if not self.context or "prd_state" not in self.context:
            raise ValueError("🛑 Debate context not initialized. Start a debate first.")
        
        self.round_number += 1
        consensus = await self._run_debate_round(mention)
        
        return {
            "history": self.debate_history,
            "prd_state": self.context["prd_state"],
            "done": is_prd_stable(self.context["prd_state"]) and consensus,
            "round": self.round_number
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
            "prd_state": self.context.get("prd_state", {}) if self.context else {},
            "round_number": self.round_number
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
            self.round_number = data.get("round_number", len(self.debate_history))
            if not self.context:
                self.context = {}
            self.context["prd_state"] = data.get("prd_state", PRD_TEMPLATE.copy())
            self.context["topic"] = self.current_topic
            self.context["history"] = self.debate_history
            return data
        except Exception as e:
            print(f"Error loading debate {session_id}: {e}")
            return {"error": f"Failed to load session: {str(e)}"}

    async def revisit_topic(self):
        if not self.context:
            return {"error": "No active debate session"}
        return await self.run_round()