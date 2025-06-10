# src/core/user_interface_api.py

from core.debate_orchestrator import DebateOrchestrator
from agents.ux_agent import UXDesignAgent
from core.agent_registry import get_active_agents

# Instantiate orchestrator globally (for simplicity)
agents = [UXDesignAgent()]
orchestrator = DebateOrchestrator(agents)

@api_blueprint.route('/save_debate', methods=['POST'])
def save_debate():
    session_id = asyncio.run(orchestrator.save_debate())
    return jsonify({"session_id": session_id})

@api_blueprint.route('/load_debate/<session_id>', methods=['GET'])
def load_debate(session_id):
    data = asyncio.run(orchestrator.load_debate(session_id))
    return jsonify(data)

@api_blueprint.route('/start_debate', methods=['POST'])
def start_debate():
    data = request.json
    topic = data.get("topic", "")
    result = orchestrator.start_debate(topic)
    return jsonify(result)

@api_blueprint.route('/continue_debate', methods=['POST'])
def continue_debate():
    result = orchestrator.continue_debate()
    return jsonify(result)

@api_blueprint.route('/revisit_topic', methods=['POST'])
def revisit_topic():
    result = orchestrator.revisit_topic()
    return jsonify(result)

@api_blueprint.route('/get_debate_history', methods=['GET'])
def get_debate_history():
    history = orchestrator.get_debate_history()
    return jsonify(history)



# Instantiate orchestrator once with active agents
agents = get_active_agents()
orchestrator = DebateOrchestrator(agents)