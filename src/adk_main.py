# # adk_main.py
# from vertexai.preview.reasoning_engines import AdkApp
# from agents.product_architect import architect
# from agents.ux_agent_adk import ux_agent
# from agents.backend_agent_adk import backend_agent
# from agents.db_agent_adk import db_agent

# from shared.prd_state import PRD_TEMPLATE, is_prd_stable
# from tools.architect_toolkit import update_prd_from_agent
# from tools.handle_mentions import extract_mention
# from tools.export_prd import export_prd_to_docx

# # Manually assign tools if not declared in agent definition
# architect.tools = [ux_agent, backend_agent, db_agent]

# app = AdkApp(agent=architect)
# session = app.create_session(user_id="user_1")

# topic = input("Enter your debate topic: ").strip()
# context = {
#     "prd_state": PRD_TEMPLATE.copy(),
#     "history": [],
#     "topic": topic,
#     "user_followup": None
# }

# consensus = False
# round_number = 1

# while not consensus:
#     print(f"\n🔁 Round {round_number}")
#     round_number += 1

#     user_msg = input("User follow-up (optional): ").strip()
#     context["user_followup"] = None

#     if user_msg:
#         mention, msg = extract_mention(user_msg)
#         context["user_followup"] = {"agent": mention, "message": msg}

#     for agent in architect.tools:
#         if context["user_followup"]:
#             if agent.name != context["user_followup"]["agent"]:
#                 continue

#         response = agent.run(context)
#         print(f"\n🧠 {agent.name.upper()}:\n{response}")

#         context["history"].append({agent.name: response})
#         context["prd_state"], agreed = update_prd_from_agent(agent.name, response, context["prd_state"])

#         if not agreed:
#             break
#     else:
#         consensus = is_prd_stable(context["prd_state"])

# print("\n✅ PRD FINALIZED!")
# print(context["prd_state"])

# # Export the PRD
# export_prd_to_docx(context["prd_state"], title=topic)
# print("PRD exported to Product_PRD.docx")
from vertexai.preview.reasoning_engines import AdkApp
from agents.architect_with_subagents import architect
from shared.prd_state import PRD_TEMPLATE, is_prd_stable
from tools.architect_toolkit import update_prd_from_agent
from tools.handle_mentions import extract_mention
from tools.export_prd import export_prd_to_docx

app = AdkApp(agent=architect)
session = app.create_session(user_id="user_1")

topic = input("Enter your debate topic: ").strip()
context = {
    "prd_state": PRD_TEMPLATE.copy(),
    "history": [],
    "topic": topic,
    "user_followup": None
}

consensus = False
round_number = 1

while not consensus:
    print(f"\n🔁 Round {round_number}")
    round_number += 1

    user_msg = input("User follow-up (optional): ").strip()
    context["user_followup"] = None

    if user_msg:
        mention, msg = extract_mention(user_msg)
        context["user_followup"] = {"agent": mention, "message": msg}

    prompt = f"Topic: {context['topic']}\n"
    if context["user_followup"]:
        prompt += f"User follow-up for {context['user_followup']['agent']}: {context['user_followup']['message']}\n"
    prompt += f"Current PRD State: {context['prd_state']}\n"

    response = session(prompt, context=context)

    print(f"\n🧠 Multi-Agent System Output:\n{response}")

    # If you want to parse subagent responses, do so here, otherwise update PRD directly
    context["history"].append({"system": str(response)})
    context["prd_state"], agreed = update_prd_from_agent("system", str(response), context["prd_state"])

    if is_prd_stable(context["prd_state"]):
        consensus = True

print("\n✅ PRD FINALIZED!")
print(context["prd_state"])
export_prd_to_docx(context["prd_state"], title=topic)
print("PRD exported to Product_PRD.docx")