# tools/architect_toolkit.py

import re

PRD_SECTIONS = [
    "introduction",
    "customer_needs",
    "known_requests",
    "customer_data",
    "business_model",
    "expected_results",
    "marketing_plan",
    "metrics",
    "terms",
    "personas",
    "features",
    "non_functional",
    "design_notes",
    "technical_specs"
]

def update_prd_from_agent(agent_name, agent_response, prd_state):
    """
    Parse agent response and update prd_state with structured info for all sections.
    """
    text = agent_response.strip()
    found_section = False

    # Build a regex to capture sections like "Introduction:", etc.
    section_regex = re.compile(r"^([A-Za-z _\-]+):\s*((?:.|\n)*?)(?=^[A-Za-z _\-]+:|\Z)", re.MULTILINE)
    matches = section_regex.findall(text)
    for section, content in matches:
        key = section.strip().lower().replace(" ", "_").replace("-", "_")
        if key in prd_state:
            found_section = True
            # For list-type fields
            if isinstance(prd_state[key], list):
                # Split lines, remove empty/placeholder lines
                items = [line.strip("-* ").strip() for line in content.splitlines() if line.strip("-* ").strip()]
                prd_state[key] = items
            else:
                prd_state[key] = content.strip()

    return prd_state, found_section
