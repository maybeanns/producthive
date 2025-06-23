from agents.ux_agent_adk import ux_agent
from agents.db_agent_adk import db_agent
from agents.backend_agent_adk import backend_agent
from agents.frontend_agent_adk import frontend_agent
from agents.business_agent_adk import business_agent

from vertexai.preview.reasoning_engines import AdkApp
from agents.architect_with_subagents import architect
from shared.prd_state import PRD_TEMPLATE, is_prd_stable
from tools.architect_toolkit import update_prd_from_agent
from tools.handle_mentions import extract_mention
import re
import uuid
import json
import os

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
        
        # Update PRD state intelligently using debate context
        consensus = True
        for agent_key, response in round_responses.items():
            # Get debate context for this agent
            debate_context = self._extract_debate_context_for_agent(agent_key)
            
            # Update PRD with intelligent context usage
            self.context["prd_state"], agreed = self._update_prd_with_debate_context(
                agent_key, response["text"], self.context["prd_state"], debate_context
            )
            if not agreed:
                consensus = False
        
        return consensus

    def _extract_debate_context_for_agent(self, agent_key):
        """Extract relevant debate insights for each agent"""
        if not self.debate_history:
            return {}
        
        # Collect all responses from this agent across rounds
        agent_responses = []
        other_agents_responses = []
        
        for round_data in self.debate_history:
            if agent_key in round_data:
                agent_responses.append(round_data[agent_key]["text"])
            
            # Collect relevant responses from other agents
            for other_agent, response in round_data.items():
                if other_agent != agent_key:
                    other_agents_responses.append(f"{other_agent}: {response['text']}")
        
        # Extract key insights
        debate_context = {
            "agent_evolution": agent_responses,
            "team_discussions": other_agents_responses,
            "consensus_points": self._find_consensus_points(agent_responses + other_agents_responses),
            "key_decisions": self._extract_key_decisions(other_agents_responses),
            "integration_points": self._find_integration_mentions(agent_key, other_agents_responses)
        }
        
        return debate_context

    def _find_consensus_points(self, all_responses):
        """Find points where multiple agents agree"""
        consensus_indicators = [
            r"(?:agree|agreed|consensus|decided|team decision).*?([^\n.]{10,80})",
            r"(?:we should|let's|final decision|requirement).*?([^\n.]{10,80})"
        ]
        
        consensus_points = []
        full_text = " ".join(all_responses)
        
        for pattern in consensus_indicators:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            for match in matches:
                clean_match = match.strip()
                if len(clean_match) > 10:
                    consensus_points.append(clean_match)
        
        return list(set(consensus_points))[:5]  # Top 5 unique consensus points

    def _extract_key_decisions(self, responses):
        """Extract key technical/business decisions from responses"""
        decision_patterns = [
            r"(?:decision|choose|selected|decided on|will use).*?([^\n.]{15,100})",
            r"(?:architecture|technology|approach|strategy).*?([^\n.]{15,100})"
        ]
        
        decisions = []
        full_text = " ".join(responses)
        
        for pattern in decision_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            for match in matches:
                clean_match = match.strip()
                if len(clean_match) > 15:
                    decisions.append(clean_match)
        
        return list(set(decisions))[:3]  # Top 3 decisions

    def _find_integration_mentions(self, agent_key, other_responses):
        """Find mentions of this agent's domain in other agents' responses"""
        # Map agent keys to domain keywords
        domain_keywords = {
            "ux_designer": ["user", "interface", "experience", "design", "frontend"],
            "database_expert": ["database", "data", "storage", "query", "backend"],
            "backend_developer": ["api", "server", "backend", "service", "architecture"],
            "frontend_developer": ["frontend", "ui", "interface", "client", "browser"],
            "business_analyst": ["business", "revenue", "market", "strategy", "users"]
        }
        
        keywords = domain_keywords.get(agent_key, [])
        integration_points = []
        
        for response in other_responses:
            for keyword in keywords:
                if keyword.lower() in response.lower():
                    # Extract sentence containing the keyword
                    sentences = response.split('.')
                    for sentence in sentences:
                        if keyword.lower() in sentence.lower():
                            clean_sentence = sentence.strip()
                            if len(clean_sentence) > 20:
                                integration_points.append(clean_sentence)
                            break
        
        return list(set(integration_points))[:3]  # Top 3 integration mentions

    def _update_prd_with_debate_context(self, agent_key, response_text, prd_state, debate_context):
        """Update PRD intelligently using debate context"""
        # Create enhanced response that includes debate context
        enhanced_response = self._create_context_enhanced_response(agent_key, response_text, debate_context)
        
        # Use the original update function with enhanced response
        return update_prd_from_agent(agent_key, enhanced_response, prd_state)

    def _create_context_enhanced_response(self, agent_key, response_text, debate_context):
        """Create an enhanced response that intelligently incorporates debate context"""
        
        # Build context-aware enhancement
        context_parts = [response_text]
        
        # Add consensus points if relevant
        if debate_context.get("consensus_points"):
            context_parts.append("\n## Consensus-Based Requirements")
            for point in debate_context["consensus_points"]:
                context_parts.append(f"- {point}")
        
        # Add key decisions that affect this agent's domain
        if debate_context.get("key_decisions"):
            context_parts.append("\n## Key Technical Decisions")
            for decision in debate_context["key_decisions"]:
                context_parts.append(f"- {decision}")
        
        # Add integration points
        if debate_context.get("integration_points"):
            context_parts.append(f"\n## Integration Considerations")
            for integration in debate_context["integration_points"]:
                context_parts.append(f"- {integration}")
        
        # Add evolution context (how this agent's thinking has developed)
        if len(debate_context.get("agent_evolution", [])) > 1:
            context_parts.append(f"\n## Refined Requirements")
            latest_thinking = debate_context["agent_evolution"][-1]
            # Extract key refinements
            if "refine" in latest_thinking.lower() or "update" in latest_thinking.lower():
                context_parts.append(f"- {latest_thinking[:200]}...")
        
        return "\n".join(context_parts)

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
        
        # Include previous rounds' history with better summarization
        if len(self.context["history"]) > 0:
            context_parts.append("Previous Rounds Summary:")
            for round_idx, round_data in enumerate(self.context["history"][-2:], 1):  # Last 2 rounds
                context_parts.append(f"Round {round_idx} Key Points:")
                for agent_name, response in round_data.items():
                    key_point = self._extract_key_points(response.get("text", ""))
                    if key_point:
                        context_parts.append(f"  - {agent_name.replace('_', ' ').title()}: {key_point}")
        
        # Add current PRD state summary
        prd_summary = self._summarize_prd_state(self.context['prd_state'])
        if prd_summary:
            context_parts.append(f"\nCurrent PRD Progress: {prd_summary}")
        
        return "\n\n".join(context_parts)

    def _summarize_prd_state(self, prd_state):
        """Create a brief summary of current PRD state"""
        if not prd_state or not any(prd_state.values()):
            return "No PRD content yet"
        
        summary_parts = []
        for section, content in prd_state.items():
            if content:
                # Handle both string and list content
                if isinstance(content, list):
                    # For lists, check if any items exist and count them
                    non_empty_items = [item for item in content if item and str(item).strip()]
                    if non_empty_items:
                        summary_parts.append(f"{section}: {len(non_empty_items)} items")
                elif isinstance(content, str) and content.strip():
                    # For strings, count words
                    summary_parts.append(f"{section}: {len(content.split())} words")
                elif content:  # Handle other types (dict, etc.)
                    summary_parts.append(f"{section}: present")
        
        return ", ".join(summary_parts) if summary_parts else "Minimal content"

    def _extract_key_points(self, text):
        """Extract key points for debate history"""
        if not text:
            return ""
        
        # Look for key decision points
        key_patterns = [
            r'(?:decision|agree|recommend|suggest|must|should|requirement).*?([^\n.]{20,100})',
            r'(?:important|critical|essential|key).*?([^\n.]{20,100})'
        ]
        
        for pattern in key_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0].strip()
        
        # Fallback to first meaningful sentence
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        if sentences:
            return sentences[0][:100] + "..." if len(sentences[0]) > 100 else sentences[0]
        
        return text[:100] + "..." if len(text) > 100 else text

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