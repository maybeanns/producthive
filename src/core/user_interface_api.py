# src/core/user_interface_api.py

from core.debate_orchestrator import DebateOrchestrator
from agents.ux_agent import UXDesignAgent
from core.agent_registry import get_active_agents
from core.prd_generator import generate_prd_docx
import io
import asyncio
from flask import send_file, Blueprint, request, jsonify

api_blueprint = Blueprint('api', __name__)

# Instantiate orchestrator globally (for simplicity)
agents = [UXDesignAgent()]
orchestrator = DebateOrchestrator(agents)


@api_blueprint.route('/generate_prd', methods=['GET'])
def generate_prd():
    doc = generate_prd_docx(orchestrator.current_topic, orchestrator.debate_history, orchestrator.prd_state)

    prd_stream = io.BytesIO()
    doc.save(prd_stream)
    prd_stream.seek(0)

    return send_file(prd_stream, as_attachment=True, download_name='Product_PRD.docx', mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

@api_blueprint.route('/ask_agent', methods=['POST'])
def ask_agent():
    data = request.json
    agent_name = data.get("agent_name")
    question = data.get("question")

    # Find agent by name
    agent = next((a for a in orchestrator.agents if a.name == agent_name), None)
    if not agent:
        return jsonify({"error": "Agent not found"}), 404

    # Call agent with question as topic
    argument = agent.generate_argument(question, orchestrator.context)

    return jsonify(argument)

@api_blueprint.route('/save_debate', methods=['POST'])
def save_debate():
    session_id = asyncio.run(orchestrator.save_debate())
    return jsonify({"session_id": session_id})

@api_blueprint.route('/load_debate/<session_id>', methods=['GET'])
def load_debate(session_id):
    data = asyncio.run(orchestrator.load_debate(session_id))
    return jsonify(data)

# @api_blueprint.route('/start_debate', methods=['POST'])
# def start_debate():
#     data = request.json
#     topic = data.get("topic", "")
#     result = orchestrator.start_debate(topic)
#     return jsonify(result)
@api_blueprint.route('/start_debate', methods=['POST'])
def start_debate():
    data = request.json
    topic = data.get("topic", "")
    
    # FIX: run the async DebateOrchestrator function
    result = asyncio.run(orchestrator.start_debate(topic))
    
    return jsonify(result)
# @api_blueprint.route('/continue_debate', methods=['POST'])
# def continue_debate():
#     result = orchestrator.continue_debate()
#     return jsonify(result)

# @api_blueprint.route('/revisit_topic', methods=['POST'])
# def revisit_topic():
#     result = orchestrator.revisit_topic()
#     return jsonify(result)

@api_blueprint.route('/continue_debate', methods=['POST'])
def continue_debate():
    result = asyncio.run(orchestrator.continue_debate())
    return jsonify(result)

@api_blueprint.route('/revisit_topic', methods=['POST'])
def revisit_topic():
    result = asyncio.run(orchestrator.revisit_topic())
    return jsonify(result)

@api_blueprint.route('/get_debate_history', methods=['GET'])
def get_debate_history():
    history = orchestrator.get_debate_history()
    return jsonify(history)



# Instantiate orchestrator once with active agents
agents = get_active_agents()
orchestrator = DebateOrchestrator(agents)