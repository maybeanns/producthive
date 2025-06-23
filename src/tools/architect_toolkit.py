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

# Enhanced metadata removal patterns
METADATA_PATTERNS = [
    r'\{[^}]*\}',  # JSON-like structures
    r'Generated on:.*?\n',
    r'Project:.*?\n',
    r'content\':.*?\'text\':',  # Specific to your sample
    r'\'parts\':\s*\[.*?\]',
    r'\'role\':\s*\'.*?\'',
    r'\\n\\n',  # Escaped newlines
    r'\\[nt]',  # Escaped characters
    r'[\'"]{3,}',  # Multiple quotes
    r'\s*\.\s*\\n\s*["\']',  # Malformed endings
    r'parts\'\].*?\'model\'',  # More specific patterns from your sample
    r'\'content\':\s*\{',
    r'\}\s*,\s*,',  # Double commas
    r'^\s*[,\}\]]+',  # Leading punctuation
    r'[,\}\]]+\s*$',  # Trailing punctuation
]

# Generic/placeholder content patterns
GENERIC_PATTERNS = [
    r'^to\s+be\s+defined.*',
    r'^tbd\s*$',
    r'^n/?a\s*$',
    r'^not\s+applicable.*',
    r'^placeholder.*',
    r'^coming\s+soon.*',
    r'^(\s)*$',
    r'^•\s*$',
    r'^-\s*$',
    r'^\d+\.\s*$',
    r'^\*+\s*$',
    r'^no\s+(data|entries|content).*',
    r'^_\(.*\)_$',  # Markdown italics like _(no entries)_
]

def initialize_prd_state():
    """Initialize empty PRD state with proper structure"""
    prd_state = {
        "project_name": "AI Website Builder",
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

def _deep_clean_content(text):
    """Aggressively clean content of metadata, malformed JSON, and artifacts"""
    if not text or not isinstance(text, str):
        return ""
    
    # Apply all metadata removal patterns
    for pattern in METADATA_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE | re.DOTALL)
    
    # Remove markdown formatting that's not needed
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)  # Italic
    
    # Clean up whitespace and normalize
    text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Multiple newlines to double
    
    # Remove remaining artifacts
    text = re.sub(r'[^a-zA-Z0-9\s\.,!?;:()\-\n\']', '', text)
    
    return text.strip()

def _is_generic_content(text):
    """Enhanced check for generic/placeholder content"""
    if not text or not isinstance(text, str):
        return True
    
    text = text.strip().lower()
    
    # Check length - very short content is likely generic
    if len(text) < 5:
        return True
    
    # Check against generic patterns
    for pattern in GENERIC_PATTERNS:
        if re.match(pattern, text, re.IGNORECASE):
            return True
    
    # Check for repetitive characters
    if len(set(text.replace(' ', ''))) < 3:
        return True
    
    # Check for incomplete sentences
    if text.count('.') == 0 and text.count('!') == 0 and text.count('?') == 0 and len(text) > 20:
        # Likely incomplete content
        return True
    
    return False

def _extract_meaningful_sentences(text):
    """Extract meaningful, complete sentences from text"""
    if not text:
        return []
    
    # Split into sentences
    sentences = re.split(r'[.!?]+', text)
    meaningful_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if (len(sentence) > 10 and 
            not _is_generic_content(sentence) and
            any(word in sentence.lower() for word in ['user', 'system', 'application', 'feature', 'data', 'design', 'requirement', 'performance', 'security', 'interface', 'api', 'database', 'website', 'builder', 'ai'])):
            meaningful_sentences.append(sentence)
    
    return meaningful_sentences[:5]  # Limit to 5 most relevant sentences

def extract_prd_content_from_text(text):
    """Enhanced extraction of PRD content with better cleaning"""
    extracted_content = {}
    
    # Deep clean the text first
    text = _deep_clean_content(text)
    
    if not text or _is_generic_content(text):
        return extracted_content
    
    # Strategy 1: Extract meaningful content by keywords
    keyword_extractors = {
        'project_overview': [
            r'(?:AI website builder|platform|system|application)(?:\s+is|\s+provides|\s+enables|\s+allows)([^.]+)',
            r'(?:This|The)\s+(?:project|product|platform|system)\s+([^.]+)',
            r'(?:building|creating|developing)\s+(?:websites?|web\s+applications?)([^.]+)'
        ],
        'objectives': [
            r'(?:goal|objective|aim|purpose)\s+(?:is|are)\s+to\s+([^.]+)',
            r'(?:we|I)\s+(?:want|need|aim)\s+to\s+([^.]+)',
            r'(?:primary|main|key)\s+(?:goal|objective|focus)\s+([^.]+)'
        ],
        'user_stories': [
            r'(?:as\s+a\s+user|users?\s+(?:can|should|need|want))([^.]+)',
            r'(?:user\s+experience|usability|interface)([^.]+)',
            r'(?:intuitive|easy\s+to\s+use|user-friendly)([^.]+)'
        ],
        'functional_requirements': [
            r'(?:feature|functionality|capability|function)(?:s?)\s+(?:include|are|provide)([^.]+)',
            r'(?:system|application|platform)\s+(?:must|should|will)\s+([^.]+)',
            r'(?:API|interface|endpoint)([^.]+)'
        ],
        'non_functional_requirements': [
            r'(?:performance|scalability|security|reliability)([^.]+)',
            r'(?:system|application)\s+(?:must\s+be|should\s+be)\s+(?:fast|secure|scalable|reliable)([^.]+)',
            r'(?:load|capacity|throughput|response\s+time)([^.]+)'
        ],
        'technical_specifications': [
            r'(?:database|backend|frontend|architecture|technology|stack)([^.]+)',
            r'(?:using|built\s+with|based\s+on)\s+([^.]+)',
            r'(?:programming\s+language|framework|library)([^.]+)'
        ],
        'success_metrics': [
            r'(?:KPI|metric|measure|track|monitor)([^.]+)',
            r'(?:success|performance)\s+(?:will\s+be\s+)?(?:measured|tracked)([^.]+)',
            r'(?:user\s+acquisition|conversion|revenue|satisfaction)([^.]+)'
        ]
    }
    
    for section, patterns in keyword_extractors.items():
        section_content = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                cleaned_match = match.strip()
                if cleaned_match and not _is_generic_content(cleaned_match):
                    section_content.append(cleaned_match)
        
        if section_content:
            if section in LIST_SECTIONS:
                extracted_content[section] = section_content[:3]  # Limit items
            else:
                # Join the best content
                extracted_content[section] = '. '.join(section_content[:2])
    
    # Strategy 2: Extract based on agent roles mentioned in text
    if 'ux designer' in text.lower() or 'user experience' in text.lower():
        sentences = _extract_meaningful_sentences(text)
        if sentences:
            extracted_content['user_stories'] = sentences
    
    if 'database' in text.lower() or 'data storage' in text.lower():
        sentences = _extract_meaningful_sentences(text)
        if sentences:
            if 'technical_specifications' not in extracted_content:
                extracted_content['technical_specifications'] = {}
            extracted_content['technical_specifications']['database_design'] = '. '.join(sentences[:2])
    
    if 'backend' in text.lower() or 'api' in text.lower():
        sentences = _extract_meaningful_sentences(text)
        if sentences:
            extracted_content['functional_requirements'] = sentences
    
    if 'business' in text.lower() or 'market' in text.lower():
        sentences = _extract_meaningful_sentences(text)
        if sentences:
            extracted_content['objectives'] = sentences
    
    return extracted_content

def update_prd_from_agent(agent_name, content, prd_state):
    """Enhanced PRD update with better content filtering"""
    # Ensure PRD state is properly initialized
    if not prd_state or "sections" not in prd_state:
        prd_state = initialize_prd_state()
    
    _ensure_prd_sections_exist(prd_state)
    
    # Deep clean content first
    content = _deep_clean_content(content)
    
    if not content or _is_generic_content(content):
        return prd_state, False
    
    updated = False
    
    # Extract meaningful content
    extracted_content = extract_prd_content_from_text(content)
    
    if extracted_content:
        updated = _update_prd_state_with_insights(prd_state, extracted_content)
    
    # Agent-specific mapping as fallback
    if not updated:
        agent_section_map = {
            "ux_designer": ("user_stories", "UX and interface design insights"),
            "database_expert": ("technical_specifications", "Database architecture and design"),
            "backend_developer": ("functional_requirements", "Backend services and API design"),
            "frontend_developer": ("functional_requirements", "Frontend interface and user interaction"),
            "business_analyst": ("objectives", "Business requirements and market analysis"),
        }
        
        agent_key = agent_name.lower().replace(" ", "_")
        if agent_key in agent_section_map:
            section, description = agent_section_map[agent_key]
            
            # Extract the most meaningful content
            meaningful_sentences = _extract_meaningful_sentences(content)
            if meaningful_sentences:
                if section in prd_state["sections"]:
                    if isinstance(prd_state["sections"][section], list):
                        if not prd_state["sections"][section]:
                            prd_state["sections"][section] = meaningful_sentences[:3]
                            updated = True
                    elif isinstance(prd_state["sections"][section], dict):
                        # Add to appropriate subsection
                        subsections = SECTION_SUBSECTIONS.get(section, [])
                        if subsections:
                            target_subsection = subsections[0]  # Use first subsection
                            if not prd_state["sections"][section][target_subsection]:
                                prd_state["sections"][section][target_subsection] = '. '.join(meaningful_sentences[:2])
                                updated = True
                    else:
                        if not prd_state["sections"][section]:
                            prd_state["sections"][section] = '. '.join(meaningful_sentences[:2])
                            updated = True

    return prd_state, updated

def validate_prd_state(prd_state):
    """Enhanced validation and cleanup"""
    if not prd_state or "sections" not in prd_state:
        prd_state = initialize_prd_state()
    
    _ensure_prd_sections_exist(prd_state)
    
    # Clean up any remaining generic content
    for section_key, section_content in prd_state["sections"].items():
        if isinstance(section_content, dict):
            for subsection_key, subsection_content in section_content.items():
                if _is_generic_content(str(subsection_content)):
                    prd_state["sections"][section_key][subsection_key] = ""
        elif isinstance(section_content, list):
            prd_state["sections"][section_key] = [
                item for item in section_content 
                if not _is_generic_content(str(item))
            ]
        else:
            if _is_generic_content(str(section_content)):
                prd_state["sections"][section_key] = ""
    
    # Add meaningful next steps if empty
    if not prd_state["sections"]["next_steps"]:
        prd_state["sections"]["next_steps"] = [
            "Conduct user research and market analysis",
            "Define detailed technical architecture",
            "Create development timeline and milestones",
            "Establish testing and quality assurance process"
        ]
    
    return _generate_clean_prd_markdown(prd_state)

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

def _update_prd_state_with_insights(prd_state, insights):
    """Update PRD state with extracted insights"""
    if "sections" not in prd_state:
        prd_state["sections"] = {}
    
    _ensure_prd_sections_exist(prd_state)
    
    updated = False
    
    for section, content in insights.items():
        if section in prd_state["sections"]:
            current_section = prd_state["sections"][section]
            
            if isinstance(content, dict):
                # Handle subsections
                if not isinstance(current_section, dict):
                    # Convert to dict structure
                    prd_state["sections"][section] = {}
                    for subsection in SECTION_SUBSECTIONS.get(section, []):
                        prd_state["sections"][section][subsection] = ""
                    current_section = prd_state["sections"][section]
                
                for subsection, subcontent in content.items():
                    if (subsection in current_section and 
                        (not current_section[subsection] or _is_generic_content(str(current_section[subsection])))):
                        current_section[subsection] = subcontent
                        updated = True
            else:
                # Handle simple content
                if isinstance(current_section, list):
                    if not current_section:
                        if isinstance(content, list):
                            prd_state["sections"][section] = content
                        else:
                            prd_state["sections"][section] = [content] if not _is_generic_content(content) else []
                        updated = True
                elif isinstance(current_section, str):
                    if not current_section or _is_generic_content(current_section):
                        prd_state["sections"][section] = content
                        updated = True
    
    return updated

def _generate_clean_prd_markdown(prd_state):
    """Generate clean, professional PRD markdown"""
    project_name = prd_state.get("project_name", "AI Website Builder")
    generated_date = prd_state.get("generated_date", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    markdown = f"""# {project_name}
## Product Requirements Document

*Generated: {generated_date}*

---

"""
    
    section_titles = {
        "project_overview": "📋 Project Overview",
        "objectives": "🎯 Objectives", 
        "user_stories": "👤 User Stories",
        "functional_requirements": "⚙️ Functional Requirements",
        "non_functional_requirements": "🔧 Non-Functional Requirements",
        "technical_specifications": "💻 Technical Specifications",
        "success_metrics": "📊 Success Metrics",
        "design_notes": "🎨 Design Notes",
        "next_steps": "🚀 Next Steps"
    }
    
    subsection_titles = {
        "core_functionality": "Core Functionality",
        "api_requirements": "API Requirements",
        "integration_capabilities": "Integration Capabilities",
        "performance_and_scalability": "Performance & Scalability",
        "security_and_reliability": "Security & Reliability",
        "user_experience": "User Experience",
        "database_design": "Database Design",
        "backend_architecture": "Backend Architecture",
        "frontend_framework": "Frontend Framework",
        "key_performance_indicators": "Key Performance Indicators",
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
                has_content = False
                for subsection_key, subsection_content in section_content.items():
                    if subsection_content and not _is_generic_content(str(subsection_content)):
                        has_content = True
                        subsection_title = subsection_titles.get(subsection_key, subsection_key.replace('_', ' ').title())
                        markdown += f"### {subsection_title}\n\n"
                        
                        if isinstance(subsection_content, list):
                            for item in subsection_content:
                                if not _is_generic_content(item):
                                    markdown += f"• {item}\n"
                        else:
                            markdown += f"{subsection_content}\n"
                        markdown += "\n"
                
                if not has_content:
                    markdown += "*To be defined during detailed analysis phase*\n\n"
                    
            elif isinstance(section_content, list):
                if section_content and any(not _is_generic_content(item) for item in section_content):
                    for item in section_content:
                        if not _is_generic_content(item):
                            markdown += f"• {item}\n"
                    markdown += "\n"
                else:
                    markdown += "*To be defined during detailed analysis phase*\n\n"
            else:
                if section_content and not _is_generic_content(section_content):
                    markdown += f"{section_content}\n\n"
                else:
                    markdown += "*To be defined during detailed analysis phase*\n\n"
    
    # Add separator
    markdown += "\n---\n\n*This PRD will be iteratively refined as the project progresses and more requirements are gathered.*"
    
    return markdown

def debug_prd_state(prd_state):
    """Enhanced debug function"""
    if not isinstance(prd_state, dict):
        print(f"\n=== PRD DEBUG: Invalid state type: {type(prd_state)} ===")
        return
    
    project_name = prd_state.get("project_name", "Unknown Project")
    print(f"\n=== PRD DEBUG: {project_name} ===")
    
    if "sections" in prd_state:
        total_content = 0
        for section, content in prd_state["sections"].items():
            if isinstance(content, dict):
                subsection_count = sum(1 for v in content.values() if v and not _is_generic_content(str(v)))
                print(f"{section}: {subsection_count}/{len(content)} subsections with content")
                total_content += subsection_count
            elif isinstance(content, list):
                valid_items = len([item for item in content if not _is_generic_content(str(item))])
                print(f"{section}: {valid_items} valid items")
                total_content += valid_items
            else:
                has_content = content and not _is_generic_content(str(content))
                print(f"{section}: {'✓' if has_content else '✗'}")
                total_content += 1 if has_content else 0
        
        print(f"Total content sections: {total_content}")
    else:
        print("No sections found in PRD state")
    
    print("=== END PRD DEBUG ===\n")