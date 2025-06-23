# Enhanced tools/architect_toolkit.py

import re
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

# Define PRD sections in order of appearance
PRD_SECTIONS = [
    "project_overview",
    "objectives", 
    "user_stories",
    "functional_requirements",
    "non_functional_requirements",
    "technical_specifications",
    "success_metrics",
    "design_notes",
    "next_steps"
]

# Define which sections should be lists vs text
LIST_SECTIONS = {
    "objectives", "user_stories", "functional_requirements", 
    "non_functional_requirements", "success_metrics", "next_steps"
}

# Define subsections for complex sections
SECTION_SUBSECTIONS = {
    "functional_requirements": [
        "core_functionality",
        "api_requirements",
        "integration_capabilities"
    ],
    "non_functional_requirements": [
        "performance_and_scalability",
        "security_and_reliability", 
        "user_experience"
    ],
    "technical_specifications": [
        "database_design",
        "backend_architecture",
        "frontend_framework"
    ],
    "success_metrics": [
        "key_performance_indicators",
        "business_metrics"
    ],
    "design_notes": [
        "ux_considerations",
        "technical_considerations"
    ]
}

def initialize_prd_state():
    """Initialize empty PRD state with proper structure"""
    prd_state = {
        "project_name": "Agent Creator",
        "generated_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sections": {}
    }
    
    for section in PRD_SECTIONS:
        if section in SECTION_SUBSECTIONS:
            # Initialize complex sections with subsections
            prd_state["sections"][section] = {}
            for subsection in SECTION_SUBSECTIONS[section]:
                if section in LIST_SECTIONS:
                    prd_state["sections"][section][subsection] = []
                else:
                    prd_state["sections"][section][subsection] = ""
        else:
            # Initialize simple sections
            if section in LIST_SECTIONS:
                prd_state["sections"][section] = []
            else:
                prd_state["sections"][section] = ""
    
    return prd_state

def extract_prd_content_from_text(text):
    """
    Extract PRD-relevant content from agent responses using multiple strategies
    """
    extracted_content = {}
    
    # Clean the input text first
    text = _clean_agent_content(text)
    
    if not text or _is_generic_content(text):
        return extracted_content
    
    # Strategy 1: Look for explicit section headers
    section_regex = re.compile(r"^([A-Za-z _\-]+):\s*((?:.|\n)*?)(?=^[A-Za-z _\-]+:|\Z)", re.MULTILINE)
    matches = section_regex.findall(text)
    
    for section, content in matches:
        key = section.strip().lower().replace(" ", "_").replace("-", "_")
        if key in PRD_SECTIONS:
            content = content.strip()
            if not _is_generic_content(content):
                if key in LIST_SECTIONS:
                    # Parse list items
                    items = _extract_list_items(content)
                    if items:
                        extracted_content[key] = items
                else:
                    extracted_content[key] = content
    
    # Strategy 2: Keyword-based extraction for common patterns
    keyword_patterns = {
        'project_overview': [
            r'(?:project|product|platform|system|application)(?:\s+overview)?[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:about|description|what is)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'objectives': [
            r'(?:objectives?|goals?|aims?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:business\s+)?(?:objectives?|goals?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'user_stories': [
            r'(?:user\s+stories?|user\s+requirements?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:as\s+a\s+user|user\s+needs?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'functional_requirements': [
            r'(?:functional\s+requirements?|features?|functionality)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:core\s+functionality|main\s+features?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'non_functional_requirements': [
            r'(?:non.?functional\s+requirements?|performance|scalability|security)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:quality\s+attributes?|system\s+requirements?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'technical_specifications': [
            r'(?:technical\s+specifications?|technology\s+stack|architecture)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:database|backend|frontend|api)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'success_metrics': [
            r'(?:success\s+metrics?|kpis?|key\s+performance\s+indicators?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:metrics?|measurements?|tracking)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        'design_notes': [
            r'(?:design\s+notes?|ux\s+considerations?|ui\s+requirements?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ]
    }
    
    for section, pattern_list in keyword_patterns.items():
        if section not in extracted_content:
            for pattern in pattern_list:
                matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
                if matches:
                    match_content = matches[0].strip()
                    if match_content and not _is_generic_content(match_content):
                        if section in LIST_SECTIONS:
                            items = _extract_list_items(match_content)
                            if items:
                                extracted_content[section] = items
                        else:
                            extracted_content[section] = match_content
                    break
    
    return extracted_content

GENERIC_RESPONSES = [
    r"to be defined.*",
    r"no data available.*",
    r"n/a",
    r"not applicable",
    r"^(\s)*$",
    r"tbd",
    r"placeholder",
    r"coming soon"
]

def is_generic(text):
    """Check if text is generic/placeholder content"""
    if not text:
        return True
        
    text = text.strip().lower()
    
    for pattern in GENERIC_RESPONSES:
        if re.match(pattern, text):
            return True
    
    return len(text) < 10  # Very short content is likely generic

def update_prd_from_agent(agent_name, content, prd_state):
    """
    Insert agent response into appropriate PRD section.
    Only fills section if content is not a generic placeholder.
    Returns updated prd_state and True if any section was updated.
    """
    # Ensure PRD state is properly initialized
    if not prd_state or "sections" not in prd_state:
        prd_state = initialize_prd_state()
    
    # Ensure all required sections exist
    _ensure_prd_sections_exist(prd_state)
    
    updated = False
    content = content.strip()
    
    if is_generic(content):
        return prd_state, False

    # Extract content based on agent expertise
    agent_insights = _extract_agent_insights(agent_name, content)
    
    # Update PRD state with insights
    if agent_insights:
        updated = _update_prd_state_with_insights(prd_state, agent_insights)
    
    # Legacy fallback: Try to match a PRD section in the content itself
    if not updated:
        extracted_content = extract_prd_content_from_text(content)
        if extracted_content:
            updated = _update_prd_state_with_insights(prd_state, extracted_content)
    
    # Final fallback: Map by agent type if not already updated
    if not updated:
        section_map = {
            "ux_agent": "user_stories",
            "ux_designer": "user_stories",
            "db_agent": "technical_specifications",
            "database_expert": "technical_specifications",
            "backend_agent": "functional_requirements",
            "backend_developer": "functional_requirements",
            "frontend_agent": "functional_requirements",
            "frontend_developer": "functional_requirements",
            "business_agent": "objectives",
            "business_analyst": "objectives",
        }
        
        agent_key = agent_name.lower().replace(" ", "_")
        target_section = section_map.get(agent_key)
        
        if target_section and target_section in prd_state["sections"]:
            if isinstance(prd_state["sections"][target_section], list):
                if not prd_state["sections"][target_section]:
                    prd_state["sections"][target_section] = [content[:500]]
                    updated = True
            elif isinstance(prd_state["sections"][target_section], dict):
                # For complex sections, add to first empty subsection
                for subsection in prd_state["sections"][target_section]:
                    if not prd_state["sections"][target_section][subsection]:
                        prd_state["sections"][target_section][subsection] = content[:500]
                        updated = True
                        break
            else:
                if not prd_state["sections"][target_section]:
                    prd_state["sections"][target_section] = content[:500]
                    updated = True

    return prd_state, updated

def validate_prd_state(prd_state):
    """
    Validate and clean PRD state, generate clean PRD markdown
    """
    # Ensure PRD state is properly initialized
    if not prd_state or "sections" not in prd_state:
        prd_state = initialize_prd_state()
    
    # Ensure all sections exist with proper structure
    _ensure_prd_sections_exist(prd_state)
    
    # Add default next steps if empty
    if not prd_state["sections"]["next_steps"]:
        prd_state["sections"]["next_steps"] = [
            "Conduct comprehensive market analysis and user research",
            "Define detailed user personas and user journeys", 
            "Create detailed functional specifications for each feature",
            "Develop technical architecture diagrams",
            "Establish development timeline and resource requirements",
            "Define testing and quality assurance procedures"
        ]
    
    # Generate clean PRD markdown
    return _generate_clean_prd_markdown(prd_state)

def debug_prd_state(prd_state):
    """
    Debug function to print PRD state
    """
    if not isinstance(prd_state, dict):
        print("\n=== PRD DEBUG: Invalid PRD state type ===")
        print(f"Type: {type(prd_state)} - Value: {prd_state}")
        return
    if not prd_state:
        print("\n=== PRD DEBUG: PRD state is None ===")
        return
    
    project_name = prd_state.get("project_name", "Unknown Project")
    print(f"\n=== PRD DEBUG: {project_name} ===")
    
    if "sections" in prd_state:
        for section, content in prd_state["sections"].items():
            if isinstance(content, dict):
                print(f"{section}: {len(content)} subsections")
                for subsection, subcontent in content.items():
                    if isinstance(subcontent, list):
                        print(f"  {subsection}: {len(subcontent)} items")
                    else:
                        print(f"  {subsection}: {len(str(subcontent))} chars")
            elif isinstance(content, list):
                print(f"{section}: {len(content)} items")
            else:
                print(f"{section}: {len(str(content))} chars")
    else:
        print("No sections found in PRD state")
    
    print("=== END PRD DEBUG ===\n")

# Helper functions (private)

def _ensure_prd_sections_exist(prd_state):
    """Ensure all required PRD sections exist in the state"""
    if "sections" not in prd_state:
        prd_state["sections"] = {}
    
    for section in PRD_SECTIONS:
        if section not in prd_state["sections"]:
            if section in SECTION_SUBSECTIONS:
                prd_state["sections"][section] = {}
                for subsection in SECTION_SUBSECTIONS[section]:
                    if section in LIST_SECTIONS:
                        prd_state["sections"][section][subsection] = []
                    else:
                        prd_state["sections"][section][subsection] = ""
            else:
                if section in LIST_SECTIONS:
                    prd_state["sections"][section] = []
                else:
                    prd_state["sections"][section] = ""

def _clean_agent_content(content):
    """Clean agent content by removing metadata and formatting issues"""
    # Remove common metadata patterns
    content = re.sub(r'\{[^}]*\}', '', content)  # Remove JSON-like structures
    content = re.sub(r'Generated on:.*?\n', '', content)
    content = re.sub(r'Project:.*?\n', '', content)
    content = re.sub(r'\\n\\n', '\n\n', content)  # Fix escaped newlines
    content = re.sub(r'\\[nt]', ' ', content)  # Remove escaped characters
    content = re.sub(r'\*\*([^*]+)\*\*', r'\1', content)  # Remove bold markdown
    content = re.sub(r'\s+', ' ', content)  # Normalize whitespace
    content = re.sub(r'[\'"]{2,}', '', content)  # Remove multiple quotes
    
    return content.strip()

def _is_generic_content(text):
    """Check if content is generic/placeholder text"""
    return is_generic(text)

def _extract_list_items(text):
    """Extract list items from text content"""
    items = []
    
    # Split by common list separators
    lines = text.replace('\r\n', '\n').split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Remove bullet points, numbers, and dashes
        clean_line = re.sub(r'^[-•*\d+\.\)\s]+', '', line).strip()
        if clean_line and len(clean_line) > 5:  # Avoid very short items
            items.append(clean_line)
    
    # If no clear list structure, split by sentences
    if not items and len(text) > 50:
        sentences = re.split(r'[.!?]+', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 10:
                items.append(sentence)
    
    return items[:10]  # Limit to 10 items max

def _extract_agent_insights(agent_name, content):
    """Extract structured insights from agent responses based on agent expertise"""
    insights = {}
    content = _clean_agent_content(content)
    
    if not content or _is_generic_content(content):
        return insights
    
    # Map agents to their primary focus areas
    agent_mapping = {
        "ux_designer": {
            "primary_sections": ["user_stories", "design_notes"],
            "subsections": {
                "design_notes": ["ux_considerations"],
                "functional_requirements": ["core_functionality"]
            }
        },
        "database_expert": {
            "primary_sections": ["technical_specifications"],
            "subsections": {
                "technical_specifications": ["database_design"],
                "non_functional_requirements": ["performance_and_scalability"]
            }
        },
        "backend_developer": {
            "primary_sections": ["technical_specifications", "functional_requirements"],
            "subsections": {
                "technical_specifications": ["backend_architecture"],
                "functional_requirements": ["api_requirements"],
                "non_functional_requirements": ["security_and_reliability"]
            }
        },
        "frontend_developer": {
            "primary_sections": ["functional_requirements", "design_notes"],
            "subsections": {
                "functional_requirements": ["core_functionality"],
                "technical_specifications": ["frontend_framework"],
                "non_functional_requirements": ["user_experience"]
            }
        },
        "business_analyst": {
            "primary_sections": ["objectives", "success_metrics", "project_overview"],
            "subsections": {
                "success_metrics": ["key_performance_indicators", "business_metrics"]
            }
        }
    }
    
    # Extract content using general patterns first
    extracted_content = extract_prd_content_from_text(content)
    
    # Then map to agent-specific areas
    agent_key = agent_name.lower().replace(" ", "_")
    if agent_key in agent_mapping:
        mapping = agent_mapping[agent_key]
        
        # Prioritize content for agent's primary sections
        for section in mapping["primary_sections"]:
            if section in extracted_content:
                insights[section] = extracted_content[section]
        
        # Handle subsections
        if "subsections" in mapping:
            for section, subsections in mapping["subsections"].items():
                for subsection in subsections:
                    # Look for subsection-specific content in the text
                    subsection_content = _extract_subsection_content(content, subsection)
                    if subsection_content:
                        if section not in insights:
                            insights[section] = {}
                        # Ensure the section is a dict before assigning subsection
                        elif not isinstance(insights[section], dict):
                            # Convert existing content to dict structure
                            existing_content = insights[section]
                            insights[section] = {subsection: subsection_content}
                            # Try to fit existing content in appropriate subsection
                            if subsections and len(subsections) > 1:
                                insights[section][subsections[0]] = existing_content
                        else:
                            insights[section][subsection] = subsection_content
    
    # If no specific mapping, use general extraction
    if not insights:
        insights = extracted_content
    
    return insights

def _extract_subsection_content(content, subsection):
    """Extract content for specific subsections"""
    subsection_patterns = {
        "ux_considerations": [
            r'(?:ux|user experience|interface|usability)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:design|ui|interface)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "database_design": [
            r'(?:database|schema|data model)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:storage|persistence)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "backend_architecture": [
            r'(?:backend|server|api)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:architecture|system design)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "frontend_framework": [
            r'(?:frontend|client|ui framework)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:react|vue|angular)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "performance_and_scalability": [
            r'(?:performance|scalability|scale)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:load|capacity|throughput)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "security_and_reliability": [
            r'(?:security|authentication|authorization)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:reliability|availability|uptime)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "user_experience": [
            r'(?:user experience|ux|usability)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:accessibility|responsive)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "core_functionality": [
            r'(?:core|main|primary)\s+(?:functionality|features?)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:key features?|main capabilities)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "api_requirements": [
            r'(?:api|rest|endpoint)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:service|integration)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "key_performance_indicators": [
            r'(?:kpi|key performance|metrics)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:measure|track|monitor)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ],
        "business_metrics": [
            r'(?:business|revenue|profit)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)',
            r'(?:roi|return on investment)[:\s]+(.*?)(?=\n\n|\n[A-Z]|\Z)'
        ]
    }
    
    patterns = subsection_patterns.get(subsection, [])
    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        if matches:
            match_content = matches[0].strip()
            if match_content and not _is_generic_content(match_content):
                return match_content
    
    return ""

def _update_prd_state_with_insights(prd_state, insights):
    """Update PRD state with extracted insights"""
    # Ensure sections exist before updating
    if "sections" not in prd_state:
        prd_state["sections"] = {}
    
    _ensure_prd_sections_exist(prd_state)
    
    updated = False
    
    for section, content in insights.items():
        if section in prd_state["sections"]:
            if isinstance(content, dict):
                # Handle subsections
                current_section = prd_state["sections"][section]
                
                # Ensure current section is a dict to support subsections
                if not isinstance(current_section, dict):
                    # Convert to dict structure if it's not already
                    if section in SECTION_SUBSECTIONS:
                        # Initialize with proper subsection structure
                        prd_state["sections"][section] = {}
                        for subsection in SECTION_SUBSECTIONS[section]:
                            if section in LIST_SECTIONS:
                                prd_state["sections"][section][subsection] = []
                            else:
                                prd_state["sections"][section][subsection] = ""
                        current_section = prd_state["sections"][section]
                    else:
                        # Convert existing content to first subsection
                        existing_content = current_section
                        prd_state["sections"][section] = {}
                        first_key = list(content.keys())[0] if content else "general"
                        prd_state["sections"][section][first_key] = existing_content
                        current_section = prd_state["sections"][section]
                
                # Now update subsections
                for subsection, subcontent in content.items():
                    if subsection in current_section:
                        if not current_section[subsection] or _is_generic_content(str(current_section[subsection])):
                            current_section[subsection] = subcontent
                            updated = True
                    else:
                        # Add new subsection
                        current_section[subsection] = subcontent
                        updated = True
            else:
                # Handle simple content
                current_content = prd_state["sections"][section]
                if isinstance(current_content, list):
                    if not current_content:
                        if isinstance(content, list):
                            prd_state["sections"][section] = content
                        else:
                            prd_state["sections"][section] = [content]
                        updated = True
                elif isinstance(current_content, dict):
                    # Convert content to fit dict structure if needed
                    if isinstance(content, str):
                        # Add to first empty subsection
                        for subsection in current_content:
                            if not current_content[subsection]:
                                current_content[subsection] = content
                                updated = True
                                break
                else:
                    # Simple string content
                    if not current_content or _is_generic_content(current_content):
                        prd_state["sections"][section] = content
                        updated = True
    
    return updated

def _generate_clean_prd_markdown(prd_state):
    """Generate clean PRD markdown from state"""
    project_name = prd_state.get("project_name", "Untitled Project")
    generated_date = prd_state.get("generated_date", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    markdown = f"""# {project_name} - Product Requirements Document

*Generated on: {generated_date}*

"""
    
    # Section title mapping
    section_titles = {
        "project_overview": "Project Overview",
        "objectives": "Objectives", 
        "user_stories": "User Stories",
        "functional_requirements": "Functional Requirements",
        "non_functional_requirements": "Non-Functional Requirements",
        "technical_specifications": "Technical Specifications",
        "success_metrics": "Success Metrics",
        "design_notes": "Design Notes",
        "next_steps": "Next Steps"
    }
    
    # Subsection title mapping
    subsection_titles = {
        "core_functionality": "Core Functionality",
        "api_requirements": "API Requirements",
        "integration_capabilities": "Integration Capabilities",
        "performance_and_scalability": "Performance and Scalability",
        "security_and_reliability": "Security and Reliability",
        "user_experience": "User Experience",
        "database_design": "Database Design",
        "backend_architecture": "Backend Architecture",
        "frontend_framework": "Frontend Framework",
        "key_performance_indicators": "Key Performance Indicators (KPIs)",
        "business_metrics": "Business Metrics",
        "ux_considerations": "UX Considerations",
        "technical_considerations": "Technical Considerations"
    }
    
    sections = prd_state.get("sections", {})
    
    for section_key in PRD_SECTIONS:
        if section_key in sections:
            section_content = sections[section_key]
            section_title = section_titles.get(section_key, section_key.replace('_', ' ').title())
            
            markdown += f"## {section_title}\n\n"
            
            if isinstance(section_content, dict):
                # Handle sections with subsections
                has_content = False
                for subsection_key, subsection_content in section_content.items():
                    if subsection_content and not _is_generic_content(str(subsection_content)):
                        has_content = True
                        subsection_title = subsection_titles.get(subsection_key, subsection_key.replace('_', ' ').title())
                        markdown += f"### {subsection_title}\n\n"
                        
                        if isinstance(subsection_content, list):
                            for item in subsection_content:
                                markdown += f"- {item}\n"
                        else:
                            markdown += f"{subsection_content}\n"
                        markdown += "\n"
                
                if not has_content:
                    markdown += "*To be defined based on further analysis*\n\n"
            elif isinstance(section_content, list):
                # Handle list sections
                if section_content:
                    for item in section_content:
                        markdown += f"- {item}\n"
                    markdown += "\n"
                else:
                    markdown += "*To be defined based on further analysis*\n\n"
            else:
                # Handle text sections
                if section_content and not _is_generic_content(section_content):
                    markdown += f"{section_content}\n\n"
                else:
                    markdown += "*To be defined based on further analysis*\n\n"
    
    return markdown