# shared/prd_state.py

PRD_TEMPLATE = {
  "introduction": "...",
  "customer_needs": "...",
  "known_requests": "...",
  "customer_data": "...",
  "business_model": "...",
  "expected_results": "...",
  "marketing_plan": "...",
  "metrics": "...",
  "terms": "...",
  "personas": [],
  "features": [],
  "non_functional": [],
  "design_notes": "...",
  "technical_specs": "..."
}

def is_prd_stable(prd_state):
    """A naive convergence condition: no open issues."""
    return not prd_state.get("open_questions")
