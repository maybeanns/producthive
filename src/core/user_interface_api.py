import os
import io
import asyncio
from flask import Blueprint, request, jsonify, send_file
from core.debate_orchestrator_adk import DebateOrchestratorADK
from agents.ux_agent_adk import ux_agent
from agents.db_agent_adk import db_agent
from agents.backend_agent_adk import backend_agent
from agents.frontend_agent_adk import frontend_agent
from agents.business_agent_adk import business_agent
from core.prd_generator import generate_prd_docx
from tools.export_prd import export_prd_to_docx
from tools.format_prd import format_prd_markdown
from tools.normalize_prd import normalize_prd

api_blueprint = Blueprint('api', __name__)

agents = [ux_agent, db_agent, backend_agent, frontend_agent, business_agent]
orchestrator = DebateOrchestratorADK()

@api_blueprint.route('/start_debate', methods=['POST'])
def start_debate():
    data = request.json
    topic = data.get("topic", "")
    print(f"Received topic: {topic}")  # Debug log
    try:
        result = asyncio.run(orchestrator.start_debate(topic))
        print(f"Debate result: {result}")  # Debug log
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()  # Print full stack trace to console
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/continue_debate', methods=['POST'])
def continue_debate():
    if not orchestrator.context or "prd_state" not in orchestrator.context:
        return jsonify({"error": "🛑 Please start the debate first."}), 400
    mention = request.json.get("mention")
    try:
        result = asyncio.run(orchestrator.run_round(mention))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/ask_agent', methods=['POST'])
def ask_agent():
    data = request.json
    agent_name = data.get("agent_name")
    question = data.get("question")
    agent = next((a for a in orchestrator.agents if a.name == agent_name), None)
    if not agent:
        return jsonify({"error": "Agent not found"}), 404
    argument = agent.generate_argument(question, orchestrator.context)
    return jsonify(argument)

@api_blueprint.route('/generate_prd', methods=['GET'])
def generate_prd():
    orchestrator.context["prd_state"] = normalize_prd(orchestrator.context["prd_state"])
    doc = generate_prd_docx(
        orchestrator.current_topic,
        orchestrator.debate_history,
        orchestrator.context["prd_state"]
    )
    prd_stream = io.BytesIO()
    doc.save(prd_stream)
    prd_stream.seek(0)
    return send_file(
        prd_stream,
        as_attachment=True,
        download_name='Product_PRD.docx',
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

@api_blueprint.route('/prd_text', methods=['GET'])
def prd_text():
    formatted = format_prd_markdown(orchestrator.context["prd_state"])
    return jsonify({"text": formatted})

@api_blueprint.route('/list_sessions', methods=['GET'])
def list_sessions():
    folder = "data/debates"
    os.makedirs(folder, exist_ok=True)
    sessions = [f.replace(".json", "") for f in os.listdir(folder) if f.endswith(".json")]
    return jsonify({"sessions": sorted(sessions)})

@api_blueprint.route('/download_prd', methods=['GET'])
def download_prd():
    orchestrator.context["prd_state"] = normalize_prd(orchestrator.context["prd_state"])
    path = export_prd_to_docx(orchestrator.context["prd_state"])
    return send_file(path, as_attachment=True)

@api_blueprint.route('/save_debate', methods=['POST'])
def save_debate():
    session_id = asyncio.run(orchestrator.save_debate())
    return jsonify({"session_id": session_id})

@api_blueprint.route('/load_debate/<session_id>', methods=['GET'])
def load_debate(session_id):
    data = asyncio.run(orchestrator.load_debate(session_id))
    return jsonify(data)

@api_blueprint.route('/revisit_topic', methods=['POST'])
def revisit_topic():
    result = asyncio.run(orchestrator.revisit_topic())
    return jsonify(result)

@api_blueprint.route('/get_debate_history', methods=['GET'])
def get_debate_history():
    history = orchestrator.get_debate_history()
    return jsonify(history)