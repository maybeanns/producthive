# Enhanced src/core/user_interface_api.py with debug routes
from datetime import datetime
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
from tools.architect_toolkit import debug_prd_state, validate_prd_state
from tools.vertex_llm import VertexLLM
import json
api_blueprint = Blueprint('api', __name__)

agents = [ux_agent, db_agent, backend_agent, frontend_agent, business_agent]
orchestrator = DebateOrchestratorADK()

# Set agents in orchestrator
orchestrator.agents = agents

try:
    chat_llm = VertexLLM(
        project="your-project-id",  # Replace with your actual project ID
        location="us-central1", 
        model="gemini-2.0-flash-lite-001"
    )
    chat_history = []  
except Exception as e:
    print(f"Warning: Could not initialize chat LLM: {e}")
    chat_llm = None
    chat_history = []

@api_blueprint.route('/start_debate', methods=['POST'])
def start_debate():
    data = request.json
    topic = data.get("topic", "")
    print(f"Received topic: {topic}")
    
    try:
        result = asyncio.run(orchestrator.start_debate(topic))
        print(f"Debate started. PRD sections filled: {result.get('prd_sections_filled', 'unknown')}")
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/continue_debate', methods=['POST'])
def continue_debate():
    if not orchestrator.context or "prd_state" not in orchestrator.context:
        return jsonify({"error": "Please start the debate first."}), 400
    
    mention = request.json.get("mention", "")
    print(f"Continuing debate with mention: {mention}")
    
    try:
        result = asyncio.run(orchestrator.run_round(mention))
        orchestrator.context["prd_state"] = validate_prd_state(orchestrator.context["prd_state"])
        orchestrator.context["prd_state"] = normalize_prd(orchestrator.context["prd_state"])
        print(f"Round completed. PRD sections filled: {result.get('prd_sections_filled', 'unknown')}")
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/ask_agent', methods=['POST'])
def ask_agent():
    data = request.json
    agent_name = data.get("agent_name")
    question = data.get("question")
    
    print(f"Direct agent query: {agent_name} - {question}")
    
    agent = next((a for a in orchestrator.agents if a.name == agent_name), None)
    if not agent:
        return jsonify({"error": "Agent not found"}), 404
    
    try:
        # Use Google ADK LlmAgent's run_async method (not actually async)
        result = agent.run_async(question)
        
        # Extract content from ADK result
        if hasattr(result, 'content'):
            content = result.content
        elif isinstance(result, dict) and 'content' in result:
            content = result['content']
        elif isinstance(result, str):
            content = result
        else:
            content = str(result)
        
        argument = {
            "agent": agent_name,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        # Update PRD from this agent's response
        if argument and 'content' in argument:
            from tools.architect_toolkit import update_prd_from_agent
            orchestrator.context["prd_state"], updated = update_prd_from_agent(
                agent_name, 
                argument['content'], 
                orchestrator.context["prd_state"]
            )
            print(f"PRD updated from direct agent query: {updated}")
        
        return jsonify(argument)
    except Exception as e:
        print(f"Error in ask_agent: {e}")
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/generate_prd', methods=['GET'])
def generate_prd():
    print("Generating PRD document...")
    
    # Validate PRD state before generating
    orchestrator.context["prd_state"] = validate_prd_state(orchestrator.context["prd_state"])
    debug_prd_state(orchestrator.context["prd_state"])
    
    try:
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
    except Exception as e:
        print(f"Error generating PRD: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/prd_text', methods=['GET'])
def prd_text():
    print("Getting PRD text...")
    debug_prd_state(orchestrator.context["prd_state"])
    
    try:
        formatted = format_prd_markdown(orchestrator.context["prd_state"])
        return jsonify({
            "text": formatted,
            "sections_filled": orchestrator._count_filled_sections()
        })
    except Exception as e:
        print(f"Error formatting PRD text: {e}")
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/download_prd', methods=['GET'])
def download_prd():
    print("Downloading PRD...")
    
    # Validate and normalize PRD state
    orchestrator.context["prd_state"] = validate_prd_state(orchestrator.context["prd_state"])
    orchestrator.context["prd_state"] = normalize_prd(orchestrator.context["prd_state"])
    
    debug_prd_state(orchestrator.context["prd_state"])
    
    try:
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
    except Exception as e:
        print(f"Error downloading PRD: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# DEBUG ROUTES
@api_blueprint.route('/debug/prd_state', methods=['GET'])
def debug_prd_state_route():
    """Debug route to inspect PRD state"""
    debug_info = orchestrator.get_debug_info()
    return jsonify({
        "prd_state": orchestrator.context.get("prd_state", {}),
        "debug_info": debug_info,
        "context_keys": list(orchestrator.context.keys())
    })

@api_blueprint.route('/debug/force_prd_update', methods=['POST'])
def force_prd_update():
    """Debug route to manually trigger PRD updates from existing debate history"""
    from tools.architect_toolkit import update_prd_from_agent, initialize_prd_state
    
    # Reset PRD state
    orchestrator.context["prd_state"] = initialize_prd_state()
    
    # Re-process all debate history
    updates_count = 0
    for entry in orchestrator.debate_history:
        if 'agent' in entry and 'content' in entry:
            _, updated = update_prd_from_agent(
                entry['agent'], 
                entry['content'], 
                orchestrator.context["prd_state"]
            )
            if updated:
                updates_count += 1
    
    debug_prd_state(orchestrator.context["prd_state"])
    
    return jsonify({
        "status": "completed",
        "updates_processed": updates_count,
        "sections_filled": orchestrator._count_filled_sections(),
        "debate_entries": len(orchestrator.debate_history)
    })

@api_blueprint.route('/debug/test_agent_prd', methods=['POST'])
def test_agent_prd():
    """Test PRD extraction from a specific agent response"""
    data = request.json
    agent_name = data.get("agent_name", "Test Agent")
    test_content = data.get("content", "")
    
    if not test_content:
        return jsonify({"error": "Content required"}), 400
    
    from tools.architect_toolkit import update_prd_from_agent, initialize_prd_state
    
    # Test on empty PRD state
    test_prd = initialize_prd_state()
    updated_prd, was_updated = update_prd_from_agent(agent_name, test_content, test_prd)
    
    return jsonify({
        "agent_name": agent_name,
        "was_updated": was_updated,
        "updated_sections": {k: v for k, v in updated_prd.items() if v},
        "content_preview": test_content[:200]
    })

# Original routes continue...
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

@api_blueprint.route('/list_sessions', methods=['GET'])
def list_sessions():
    folder = "data/debates"
    os.makedirs(folder, exist_ok=True)
    sessions = [f.replace(".json", "") for f in os.listdir(folder) if f.endswith(".json")]
    return jsonify({"sessions": sorted(sessions)})

@api_blueprint.route('/debug/clean_prd', methods=['POST'])
def clean_prd():
    orchestrator.context["prd_state"] = validate_prd_state(orchestrator.context["prd_state"])
    orchestrator.context["prd_state"] = normalize_prd(orchestrator.context["prd_state"])
    return jsonify(orchestrator.context["prd_state"])



@api_blueprint.route('/chat', methods=['POST'])
def chat_with_prd():
    """Handle user chat messages about the PRD"""
    global chat_history
    
    if not chat_llm:
        return jsonify({"error": "Chat functionality not available"}), 500
    
    data = request.json
    user_message = data.get("message", "").strip()
    
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
    
    try:
        # Get current PRD state
        current_prd = orchestrator.context.get("prd_state", {}) if orchestrator.context else {}
        
        # Format recent chat history
        recent_chat = ""
        if chat_history:
            recent_exchanges = chat_history[-5:]  # Last 5 exchanges
            recent_chat = "\n".join([
                f"User: {exchange['user']}\nAssistant: {exchange['assistant']}"
                for exchange in recent_exchanges
            ])
        
        # Build context prompt
        context_prompt = f"""You are a helpful AI assistant discussing a Product Requirements Document (PRD) that was created through a collaborative debate between multiple expert agents (UX Designer, Database Expert, Backend Developer, Frontend Developer, and Business Analyst).

Current PRD Content:
{json.dumps(current_prd, indent=2)}

Current Topic: {orchestrator.current_topic}
Debate Rounds Completed: {orchestrator.round_number}

Recent Chat History:
{recent_chat if recent_chat else "No previous chat history."}

Current User Question: {user_message}

Please provide a helpful, informative response about the PRD, the debate process, or answer the user's question. Be conversational and helpful. If the user asks about specific sections of the PRD, reference the actual content. If they want to know about the debate process, explain what happened."""

        # Get response from Vertex LLM
        response = asyncio.run(chat_llm.ask(context_prompt))
        
        # Store in chat history
        chat_entry = {
            "user": user_message,
            "assistant": response,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(chat_entry)
        
        # Keep only last 20 exchanges to prevent memory issues
        if len(chat_history) > 20:
            chat_history = chat_history[-20:]
        
        return jsonify({
            "response": response,
            "timestamp": chat_entry["timestamp"]
        })
        
    except Exception as e:
        error_response = f"I apologize, but I encountered an error: {str(e)}"
        chat_entry = {
            "user": user_message,
            "assistant": error_response,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(chat_entry)
        
        return jsonify({
            "response": error_response,
            "timestamp": chat_entry["timestamp"]
        }), 500

@api_blueprint.route('/chat/history', methods=['GET'])
def get_chat_history():
    """Get the chat history"""
    return jsonify({"history": chat_history})

@api_blueprint.route('/chat/clear', methods=['POST'])
def clear_chat_history():
    """Clear the chat history"""
    global chat_history
    chat_history = []
    return jsonify({"status": "Chat history cleared"})

@api_blueprint.route('/chat/status', methods=['GET'])
def chat_status():
    """Check if chat is available"""
    return jsonify({
        "available": chat_llm is not None,
        "history_count": len(chat_history),
        "prd_available": bool(orchestrator.context and orchestrator.context.get("prd_state"))
    })