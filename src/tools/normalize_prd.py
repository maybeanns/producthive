# tools/normalize_prd.py

def normalize_prd(prd_state: dict) -> dict:
    default_structure = {
        "introduction": "Not provided.",
        "customer_needs": "Not specified.",
        "known_requests": "No known requests listed.",
        "customer_data": "No data available.",
        "business_model": "TBD",
        "expected_results": "Not set.",
        "marketing_plan": "TBD",
        "metrics": "Not defined.",
        "terms": "Not specified.",
        "personas": [],
        "features": [],
        "non_functional": [],
        "design_notes": "TBD",
        "technical_specs": "TBD"
    }

    for key, default in default_structure.items():
        if key not in prd_state:
            prd_state[key] = default
        elif isinstance(default, list) and not isinstance(prd_state[key], list):
            prd_state[key] = [prd_state[key]]

    return prd_state
