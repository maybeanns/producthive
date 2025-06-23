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
    """Enhanced normalize_prd that handles both string and dict PRD states"""
    
    # If prd_state is already a string (formatted PRD), return as is
    if isinstance(prd_state, str):
        print("PRD state is already a formatted string, returning as-is")
        return prd_state
    
    # If prd_state is None or empty, return template
    if not prd_state:
        from shared.prd_state import PRD_TEMPLATE
        return PRD_TEMPLATE.copy()
    
    # If it's a dict, process normally
    if isinstance(prd_state, dict):
        from shared.prd_state import PRD_TEMPLATE
        
        # Create a copy of the template
        normalized = PRD_TEMPLATE.copy()
        
        # Update with provided values
        for key, default in PRD_TEMPLATE.items():
            if key in prd_state:
                normalized[key] = prd_state[key]
            else:
                normalized[key] = default
        
        return normalized
    
    # For any other type, convert to string and return
    print(f"Warning: PRD state is {type(prd_state)}, converting to string")
    return str(prd_state)
