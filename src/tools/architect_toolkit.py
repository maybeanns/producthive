# Enhanced tools/architect_toolkit.py

import re
import json

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

# Define which sections should be lists vs text
LIST_SECTIONS = {
    "customer_needs", "known_requests", "features", "personas", 
    "metrics", "terms", "non_functional"
}

def initialize_prd_state():
    """Initialize empty PRD state with proper structure"""
    prd_state = {}
    for section in PRD_SECTIONS:
        if section in LIST_SECTIONS:
            prd_state[section] = []
        else:
            prd_state[section] = ""
    return prd_state

def extract_prd_content_from_text(text):
    """
    Extract PRD-relevant content from agent responses using multiple strategies
    """
    extracted_content = {}
    
    # Strategy 1: Look for explicit section headers
    section_regex = re.compile(r"^([A-Za-z _\-]+):\s*((?:.|\n)*?)(?=^[A-Za-z _\-]+:|\Z)", re.MULTILINE)
    matches = section_regex.findall(text)
    
    for section, content in matches:
        key = section.strip().lower().replace(" ", "_").replace("-", "_")
        if key in PRD_SECTIONS:
            if key in LIST_SECTIONS:
                # Parse list items
                items = []
                lines = content.strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # Remove bullet points and dashes
                        clean_line = re.sub(r'^[-•*]\s*', '', line).strip()
                        if clean_line:
                            items.append(clean_line)
                extracted_content[key] = items
            else:
                extracted_content[key] = content.strip()
    
    # Strategy 2: Keyword-based extraction for common patterns
    keyword_patterns = {
        'customer_needs': r'(?:customer needs?|user needs?|requirements?)[:\s]*(.*?)(?=\n\n|\n[A-Z]|\Z)',
        'features': r'(?:features?|functionality)[:\s]*(.*?)(?=\n\n|\n[A-Z]|\Z)',
        'technical_specs': r'(?:technical|technology|stack|architecture)[:\s]*(.*?)(?=\n\n|\n[A-Z]|\Z)',
        'business_model': r'(?:business model|monetization|revenue)[:\s]*(.*?)(?=\n\n|\n[A-Z]|\Z)',
        'personas': r'(?:personas?|users?|target audience)[:\s]*(.*?)(?=\n\n|\n[A-Z]|\Z)'
    }
    
    for section, pattern in keyword_patterns.items():
        if section not in extracted_content:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            if matches:
                content = matches[0].strip()
                if content:
                    if section in LIST_SECTIONS:
                        items = [item.strip() for item in content.split('\n') if item.strip()]
                        extracted_content[section] = items
                    else:
                        extracted_content[section] = content
    
    return extracted_content

def update_prd_from_agent(agent_name, agent_response, prd_state):
    """
    Enhanced PRD update function with better content extraction
    """
    print(f"Updating PRD from {agent_name}")
    print(f"Agent response preview: {agent_response[:200]}...")
    
    # Extract content from agent response
    extracted_content = extract_prd_content_from_text(agent_response)
    
    # Agent-specific content mapping
    agent_focus_areas = {
        'UX Agent': ['customer_needs', 'personas', 'features'],
        'DB Agent': ['technical_specs', 'non_functional'],
        'Backend Agent': ['technical_specs', 'non_functional', 'features'],
        'Frontend Agent': ['features', 'technical_specs'],
        'Business Agent': ['business_model', 'marketing_plan', 'metrics', 'expected_results']
    }
    
    # Apply agent-specific content extraction
    focus_areas = agent_focus_areas.get(agent_name, PRD_SECTIONS)
    
    updated_sections = []
    for section in focus_areas:
        if section in extracted_content:
            current_value = prd_state.get(section, [] if section in LIST_SECTIONS else "")
            new_value = extracted_content[section]
            
            if section in LIST_SECTIONS:
                # Merge lists, avoiding duplicates
                if isinstance(current_value, list) and isinstance(new_value, list):
                    combined = current_value + [item for item in new_value if item not in current_value]
                    prd_state[section] = combined
                elif isinstance(new_value, list):
                    prd_state[section] = new_value
                updated_sections.append(section)
            else:
                # For text sections, append or replace
                if current_value and new_value:
                    prd_state[section] = current_value + "\n\n" + new_value
                elif new_value:
                    prd_state[section] = new_value
                updated_sections.append(section)
    
    # Fallback: Extract any relevant information and categorize by agent type
    if not updated_sections:
        print(f"No explicit sections found, using fallback extraction for {agent_name}")
        fallback_content = extract_fallback_content(agent_name, agent_response)
        for section, content in fallback_content.items():
            if content:
                if section in LIST_SECTIONS:
                    if isinstance(content, list):
                        prd_state[section].extend(content)
                    else:
                        prd_state[section].append(content)
                else:
                    if prd_state[section]:
                        prd_state[section] += "\n\n" + content
                    else:
                        prd_state[section] = content
                updated_sections.append(section)
    
    print(f"Updated sections: {updated_sections}")
    return prd_state, len(updated_sections) > 0

def extract_fallback_content(agent_name, response):
    """
    Extract content based on agent type when no explicit sections are found
    """
    content = {}
    
    if 'UX' in agent_name or 'UI' in agent_name:
        # UX agents focus on user needs and interface
        if 'user' in response.lower() or 'customer' in response.lower():
            content['customer_needs'] = [response[:500]]  # Truncate for brevity
        if 'feature' in response.lower():
            content['features'] = [response[:500]]
            
    elif 'DB' in agent_name or 'Database' in agent_name:
        # Database agents focus on technical specs
        content['technical_specs'] = response[:500]
        
    elif 'Backend' in agent_name:
        # Backend agents focus on technical implementation
        content['technical_specs'] = response[:500]
        if 'feature' in response.lower():
            content['features'] = [response[:300]]
            
    elif 'Frontend' in agent_name:
        # Frontend agents focus on features and technical specs
        content['features'] = [response[:300]]
        content['technical_specs'] = response[:500]
        
    elif 'Business' in agent_name:
        # Business agents focus on business aspects
        content['business_model'] = response[:500]
        if 'market' in response.lower():
            content['marketing_plan'] = response[:500]
    
    return content

def validate_prd_state(prd_state):
    """
    Validate and clean PRD state
    """
    for section in PRD_SECTIONS:
        if section not in prd_state:
            if section in LIST_SECTIONS:
                prd_state[section] = []
            else:
                prd_state[section] = ""
        
        # Clean empty values
        if section in LIST_SECTIONS:
            prd_state[section] = [item for item in prd_state[section] if item and item.strip()]
        else:
            prd_state[section] = prd_state[section].strip() if prd_state[section] else ""
    
    return prd_state

def debug_prd_state(prd_state):
    """
    Debug function to print PRD state
    """
    print("\n=== PRD STATE DEBUG ===")
    for section, content in prd_state.items():
        if isinstance(content, list):
            print(f"{section}: {len(content)} items")
            for i, item in enumerate(content[:3]):  # Show first 3 items
                print(f"  {i+1}. {item[:100]}...")
        else:
            print(f"{section}: {len(content)} chars - {content[:100]}...")
    print("=== END PRD DEBUG ===\n")