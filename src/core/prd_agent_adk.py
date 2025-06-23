"""
PRD Quality Assurance Agent using Google Agent Development Kit (ADK)
Ensures data accuracy and maintains high standards for PRD creation from debate data.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Optional
from google.adk.agents import Agent
from google.genai import types
from vertexai.preview.reasoning_engines import AdkApp


@dataclass
class DebateData:
    """Structure for debate data input"""
    topic: str
    participants: List[str]
    arguments: List[Dict[str, Any]]
    consensus_points: List[str]
    disagreements: List[str]
    timestamp: datetime
    metadata: Dict[str, Any]


@dataclass
class ValidationResult:
    """Structure for validation results"""
    is_valid: bool
    quality_score: float
    issues: List[str]
    suggestions: List[str]
    section: str


def validate_debate_data(debate_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates debate data for completeness and quality before PRD generation.
    
    Args:
        debate_data: Dictionary containing debate information including topic,
                    participants, arguments, consensus_points, and disagreements.
    
    Returns:
        dict: Validation results with is_valid, quality_score, issues, and suggestions.
    """
    issues = []
    suggestions = []
    quality_score = 1.0
    
    # Check topic quality
    topic = debate_data.get('topic', '')
    if not topic or len(topic.strip()) < 10:
        issues.append("Topic is too brief or missing")
        quality_score -= 0.2
        
    # Check participants
    participants = debate_data.get('participants', [])
    if len(participants) < 2:
        issues.append("Insufficient participants for meaningful debate")
        quality_score -= 0.3
        
    # Check arguments
    arguments = debate_data.get('arguments', [])
    if len(arguments) < 3:
        issues.append("Too few arguments captured")
        quality_score -= 0.2
        
    # Check consensus points
    consensus_points = debate_data.get('consensus_points', [])
    if not consensus_points:
        suggestions.append("No consensus points identified - may need manual review")
        quality_score -= 0.1
        
    # Check argument quality
    if arguments:
        avg_arg_length = sum(len(str(arg.get('content', ''))) for arg in arguments) / len(arguments)
        if avg_arg_length < 50:
            issues.append("Arguments appear too brief or low quality")
            quality_score -= 0.2
    
    return {
        'is_valid': quality_score >= 0.75,
        'quality_score': max(0.0, quality_score),
        'issues': issues,
        'suggestions': suggestions,
        'validation_timestamp': datetime.now().isoformat()
    }


def extract_requirements(arguments: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Extracts and categorizes requirements from debate arguments.
    
    Args:
        arguments: List of argument dictionaries with content and metadata.
    
    Returns:
        dict: Categorized requirements (functional, non_functional, user_needs, constraints).
    """
    requirements = {
        "functional": [],
        "non_functional": [],
        "user_needs": [],
        "constraints": []
    }
    
    # Keywords for categorization
    functional_keywords = ["feature", "function", "capability", "behavior", "action", "perform"]
    non_functional_keywords = ["performance", "security", "scalability", "usability", "reliability"]
    user_keywords = ["user", "customer", "experience", "interface", "interaction"]
    constraint_keywords = ["limit", "constraint", "restriction", "requirement", "must not"]
    
    for argument in arguments:
        content = str(argument.get('content', ''))
        
        if any(keyword in content for keyword in functional_keywords):
            requirements["functional"].append(argument.get('content', ''))
        elif any(keyword in content for keyword in non_functional_keywords):
            requirements["non_functional"].append(argument.get('content', ''))
        elif any(keyword in content for keyword in user_keywords):
            requirements["user_needs"].append(argument.get('content', ''))
        elif any(keyword in content for keyword in constraint_keywords):
            requirements["constraints"].append(argument.get('content', ''))
        else:
            # Default categorization for uncategorized arguments
            requirements["functional"].append(argument.get('content', ''))
    
    return requirements


def validate_prd_section(section_name: str, content: str) -> Dict[str, Any]:
    """
    Validates individual PRD sections against Google standards.
    
    Args:
        section_name: Name of the PRD section being validated.
        content: Text content of the section.
    
    Returns:
        dict: Validation results with quality score, issues, and suggestions.
    """
    issues = []
    suggestions = []
    quality_score = 1.0
    
    validation_rules = {
        "min_word_count": 50,
        "banned_phrases": ["maybe", "possibly", "might", "could be"],
        "clarity_keywords": ["clear", "specific", "measurable", "actionable"],
        "required_elements": {
            "objectives": ["success criteria", "measurable goals", "target", "metric"],
            "user_stories": ["as a user", "i want", "so that"],
            "success_metrics": ["metric", "target", "measurement", "kpi"]
        }
    }
    
    # Check minimum length
    word_count = len(content.split())
    if word_count < validation_rules["min_word_count"]:
        issues.append(f"Section {section_name} is too brief ({word_count} words)")
        quality_score -= 0.3
        
    # Check for banned phrases
    content_lower = content
    for phrase in validation_rules["banned_phrases"]:
        if phrase in content_lower:
            issues.append(f"Avoid uncertain language: '{phrase}'")
            quality_score -= 0.1
            
    # Check section-specific requirements
    if section_name in validation_rules["required_elements"]:
        required = validation_rules["required_elements"][section_name]
        missing_elements = []
        for req in required:
            if req not in content_lower:
                missing_elements.append(req)
        
        if missing_elements:
            issues.append(f"Missing required elements: {', '.join(missing_elements)}")
            quality_score -= 0.2 * len(missing_elements) / len(required)
                
    # Check for clarity indicators
    clarity_count = sum(1 for keyword in validation_rules["clarity_keywords"] 
                      if keyword in content_lower)
    clarity_score = clarity_count / len(validation_rules["clarity_keywords"])
    
    if clarity_score < 0.3:
        suggestions.append("Consider adding more specific and measurable language")
        quality_score -= 0.1
    
    return {
        'is_valid': quality_score >= 0.75,
        'quality_score': max(0.0, quality_score),
        'issues': issues,
        'suggestions': suggestions,
        'section': section_name,
        'section_validation_timestamp': datetime.now().isoformat()
    }


def generate_prd_overview(topic: str, participants: List[str], consensus_points: List[str]) -> str:
    """
    Generates PRD Overview section.
    
    Args:
        topic: Product topic from debate data.
        participants: List of stakeholder participants.
        consensus_points: Key consensus points from debate.
    
    Returns:
        str: Formatted overview section content.
    """
    overview = f"""This Product Requirements Document outlines the requirements and specifications for {topic}. 

The requirements have been derived from stakeholder discussions and consensus-building sessions involving {len(participants)} key stakeholders: {', '.join(participants)}.

Key consensus points that drive this PRD include:
{chr(10).join(f'• {point}' for point in consensus_points[:5])}

This document serves as the foundation for product development, ensuring alignment among all stakeholders and clear direction for the development team."""
    
    return overview


def generate_prd_objectives(consensus_points: List[str]) -> str:
    """
    Generates measurable objectives section.
    
    Args:
        consensus_points: Key consensus points from debate.
    
    Returns:
        str: Formatted objectives section content.
    """
    objectives = "The primary objectives for this product are:\n\n"
    
    for i, point in enumerate(consensus_points[:5], 1):
        objectives += f"{i}. **{point}**\n   - Success criteria: Measurable improvement in related metrics\n   - Target timeline: To be defined during planning phase\n\n"
    
    if not consensus_points:
        objectives += """1. **Deliver core functionality** as identified by stakeholders
   - Success criteria: 100% of core features implemented and tested
   - Target: Initial release milestone

2. **Ensure user satisfaction** through intuitive design
   - Success criteria: User satisfaction score > 4.0/5.0
   - Target: Post-launch user surveys

3. **Maintain system reliability** and performance standards
   - Success criteria: 99.9% uptime, <2s response time
   - Target: Continuous monitoring and optimization"""
    
    return objectives


def generate_user_stories(user_needs: List[str], functional_reqs: List[str]) -> str:
    """
    Generates user stories from requirements.
    
    Args:
        user_needs: List of identified user needs.
        functional_reqs: List of functional requirements.
    
    Returns:
        str: Formatted user stories section content.
    """
    user_stories = "User stories derived from stakeholder input:\n\n"
    
    story_count = 1
    
    # Convert user needs to user stories
    for need in user_needs[:3]:
        user_stories += f"**US-{story_count:03d}**: As a user, I want {need}, so that I can accomplish my goals efficiently.\n\n"
        story_count += 1
    
    # Convert functional requirements to user stories
    for req in functional_reqs[:3]:
        user_stories += f"**US-{story_count:03d}**: As a user, I want the system to {req}, so that my workflow is streamlined.\n\n"
        story_count += 1
    
    if not user_needs and not functional_reqs:
        user_stories += """**US-001**: As a user, I want to access core functionality intuitively, so that I can complete tasks efficiently.

**US-002**: As a user, I want reliable system performance, so that I can depend on the product for my work.

**US-003**: As a user, I want clear feedback and guidance, so that I understand how to use the product effectively."""
    
    return user_stories


def create_prd_from_debate(
    topic: str,
    participants: List[str],
    arguments: List[Dict[str, Any]],
    consensus_points: List[str],
    disagreements: List[str],
    timestamp: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main function to create a complete PRD from debate data with quality assurance.
    
    Args:
        topic: The debate topic/product name.
        participants: List of debate participants.
        arguments: List of argument dictionaries from the debate.
        consensus_points: Points where stakeholders reached agreement.
        disagreements: Points of disagreement or unresolved issues.
        timestamp: Optional timestamp of the debate session.
        metadata: Optional additional metadata.
    
    Returns:
        dict: Complete PRD document with quality report and validation results.
    """
    # Prepare debate data
    debate_data = {
        'topic': topic,
        'participants': participants,
        'arguments': arguments,
        'consensus_points': consensus_points,
        'disagreements': disagreements,
        'timestamp': timestamp or datetime.now().isoformat(),
        'metadata': metadata or {}
    }
    
    # Step 1: Validate debate data
    validation_result = validate_debate_data(debate_data)
    if not validation_result['is_valid']:
        return {
            'success': False,
            'message': f"Input data quality insufficient: {', '.join(validation_result['issues'])}",
            'validation_failed': True
        }
    
    # Step 2: Extract requirements
    requirements = extract_requirements(arguments)
    
    # Step 3: Generate PRD sections
    prd_sections = {
        'overview': generate_prd_overview(topic, participants, consensus_points),
        'objectives': generate_prd_objectives(consensus_points),
        'user_stories': generate_user_stories(requirements.get('user_needs', []), requirements.get('functional', [])),
        'functional_requirements': _generate_functional_requirements(requirements.get('functional', [])),
        'non_functional_requirements': _generate_non_functional_requirements(requirements.get('non_functional', []), requirements.get('constraints', [])),
        'success_metrics': _generate_success_metrics()
    }
    
    # Add risks section if disagreements exist
    if disagreements:
        prd_sections['risks'] = _generate_risks(disagreements)
    
    # Step 4: Validate each section
    section_validations = []
    for section_name, content in prd_sections.items():
        section_validation = validate_prd_section(section_name, content)
        section_validations.append(section_validation)
    
    # Step 5: Compile final PRD
    final_prd = _compile_final_prd(debate_data, prd_sections, section_validations)
    
    # Step 6: Generate quality report
    quality_report = _generate_quality_report(section_validations)
    
    return {
        'success': True,
        'message': 'PRD successfully created and validated',
        'prd': final_prd,
        'quality_report': quality_report,
        'section_validations': section_validations,
        'requirements': requirements,
        'generation_timestamp': datetime.now().isoformat(),
        'overall_quality_score': sum(v['quality_score'] for v in section_validations) / len(section_validations) if section_validations else 0
    }

def _generate_functional_requirements(functional_reqs: List[str]) -> str:
    """Generate functional requirements section"""
    if not functional_reqs:
        return """1. The system shall provide core functionality as identified by stakeholders
2. The system shall support user authentication and authorization
3. The system shall maintain data integrity and consistency
4. The system shall provide appropriate user feedback for all actions
5. The system shall support standard CRUD operations where applicable"""
    else:
        requirements = ""
        for i, req in enumerate(functional_reqs, 1):
            # Handle both string and dictionary inputs
            if isinstance(req, dict):
                # Extract requirement text from dictionary
                req_text = (req.get('text') or 
                           req.get('requirement') or 
                           req.get('description') or 
                           req.get('content') or 
                           str(req))
            elif isinstance(req, str):
                req_text = req
            else:
                # Convert other types to string
                req_text = str(req)
            
            # Safe strip operation
            try:
                req_text = req_text.strip('.')
            except AttributeError:
                # If req_text doesn't have strip method, convert to string first
                req_text = str(req_text).strip('.')
            
            requirements += f"{i}. The system shall {req_text}\n"
        return requirements

def _generate_non_functional_requirements(non_functional_reqs: List[str], constraints: List[str]) -> str:
    """Generate non-functional requirements section"""
    all_reqs = non_functional_reqs + constraints
    
    if not all_reqs:
        return """**Performance:**
- Response time: < 2 seconds for 95pc of requests
- Throughput: Support minimum 1000 concurrent users
- Availability: 99.9pc uptime during business hours

**Security:**
- Data encryption in transit and at rest
- Regular security audits and vulnerability assessments
- Compliance with relevant data protection regulations

**Usability:**
- Intuitive user interface requiring minimal training
- Accessibility compliance (WCAG 2.1 AA)
- Multi-browser and mobile device support

**Scalability:**
- Horizontal scaling capability
- Database optimization for growing data volumes
- Cloud-native architecture considerations"""
    else:
        requirements = ""
        for i, req in enumerate(all_reqs, 1):
            requirements += f"{i}. {req}\n"
        return requirements


def _generate_success_metrics() -> str:
    """Generate success metrics section"""
    return """Key Performance Indicators (KPIs) and success metrics:

**User Adoption Metrics:**
- Monthly Active Users (MAU): Target TBD
- User retention rate: >85pc after 30 days
- Feature adoption rate: >70%pc for core features

**Performance Metrics:**
- System availability: >99.9
- Average response time: <2 seconds
- Error rate: <0.1pc of all requests

**Business Metrics:**
- User satisfaction score: >4.0/5.0
- Support ticket volume: <5pc of user base monthly
- Time to complete core tasks: Baseline improvement of 25%

**Quality Metrics:**
- Bug escape rate: <2 post-release
- Code coverage: >80pc for critical components
- Security vulnerability count: Zero critical, minimal high-priority

These metrics will be tracked continuously and reviewed in regular stakeholder meetings to ensure product success and alignment with business objectives."""


def _generate_risks(disagreements: List[str]) -> str:
    """Generate risks section from disagreements"""
    risks = "Identified risks and mitigation strategies:\n\n"
    
    for i, disagreement in enumerate(disagreements[:5], 1):
        risks += f"**Risk {i}:** {disagreement}\n"
        risks += f"   - Impact: Medium to High\n"
        risks += f"   - Mitigation: Conduct additional stakeholder alignment sessions\n"
        risks += f"   - Owner: Product Manager\n\n"
    
    risks += """**Additional Standard Risks:**
- Technical complexity exceeding estimates
- Resource availability constraints  
- External dependency failures
- Changing market conditions or requirements

All risks should be monitored regularly and mitigation plans activated as needed."""
    
    return risks


def _compile_final_prd(debate_data: Dict[str, Any], sections: Dict[str, str], validations: List[Dict]) -> str:
    """Compile the final PRD document"""
    overall_quality = sum(v['quality_score'] for v in validations) / len(validations) if validations else 0
    timestamp_str = debate_data.get('timestamp', datetime.now().isoformat())

    final_prd = f"""# Product Requirements Document

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Quality Score:** {overall_quality:.2f}/1.00
**Topic:** {debate_data.get('topic', 'Product Development')}

## Overview
{sections.get('overview', 'Overview section not generated')}

## Objectives
{sections.get('objectives', 'Objectives section not generated')}

## User Stories
{sections.get('user_stories', 'User stories section not generated')}

## Functional Requirements
{sections.get('functional_requirements', 'Functional requirements section not generated')}

## Non-Functional Requirements
{sections.get('non_functional_requirements', 'Non-functional requirements section not generated')}

## Success Metrics
{sections.get('success_metrics', 'Success metrics section not generated')}
"""

    if sections.get('risks'):
        final_prd += f"\n## Risks\n{sections['risks']}\n"

    final_prd += f"""
---
*This PRD was generated and validated by the Google ADK PRD Quality Assurance Agent*
*Stakeholders: {', '.join(debate_data.get('participants', []))}*
*Debate Session: {timestamp_str}*
"""

    return final_prd


def _generate_quality_report(validations: List[Dict]) -> str:
    """Generate comprehensive quality report"""
    if not validations:
        return "No validations performed"
        
    total_score = sum(v['quality_score'] for v in validations) / len(validations)
    all_issues = [issue for v in validations for issue in v['issues']]
    all_suggestions = [sug for v in validations for sug in v['suggestions']]
    
    quality_level = ("EXCELLENT" if total_score >= 0.9 else 
                    "GOOD" if total_score >= 0.8 else 
                    "ACCEPTABLE" if total_score >= 0.75 else 
                    "POOR")
    
    report = f"""# PRD Quality Assurance Report

**Overall Quality Score:** {total_score:.2f}/1.00
**Quality Level:** {quality_level}
**Sections Validated:** {len(validations)}
**Generated by:** Google ADK PRD Quality Agent

## Issues Identified ({len(all_issues)})
{chr(10).join(f"- {issue}" for issue in all_issues) if all_issues else "None identified"}

## Suggestions ({len(all_suggestions)})
{chr(10).join(f"- {sug}" for sug in all_suggestions) if all_suggestions else "None provided"}

## Section Validation Summary
{chr(10).join(f"- {v['section']}: {v['quality_score']:.2f} ({'PASS' if v['is_valid'] else 'FAIL'})" for v in validations)}

## Recommendations
{"- PRD meets quality standards and is ready for stakeholder review" if quality_level in ["EXCELLENT", "GOOD"] else "- PRD requires revision before stakeholder review"}
{"- Consider implementing suggested improvements for optimal quality" if all_suggestions else ""}
    """
    
    return report


# Create the Google ADK Agent
def create_prd_quality_agent():
    """
    Creates and configures the Google ADK PRD Quality Assurance Agent.
    
    Returns:
        AdkApp: Configured ADK application with PRD quality tools.
    """
    # Configure model and safety settings
    model = "gemini-2.0-flash"
    
    safety_settings = [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.OFF,
        ),
    ]
    
    generate_content_config = types.GenerateContentConfig(
        safety_settings=safety_settings,
        temperature=0.2,  # Lower temperature for more consistent, factual responses
        max_output_tokens=4000,
        top_p=0.95,
    )
    
    # Create the agent with PRD quality tools
    agent = Agent(
        model=model,
        name='prd_quality_agent',
        generate_content_config=generate_content_config,
        tools=[
            validate_debate_data,
            extract_requirements,
            validate_prd_section,
            generate_prd_overview,
            generate_prd_objectives,
            generate_user_stories,
            create_prd_from_debate
        ],
        instruction="""
        You are a PRD Quality Assurance Agent responsible for creating high-quality 
        Product Requirements Documents from debate data. Your role is to:
        
        1. Validate incoming debate data for quality and completeness
        2. Extract structured requirements from debate arguments
        3. Generate well-structured PRD sections following Google standards
        4. Validate each PRD section for quality and accuracy
        5. Ensure final PRD meets professional standards
        
        Always prioritize data accuracy, clarity, and measurable objectives.
        Use specific, actionable language and avoid uncertain terminology.
        Follow Google's PRD documentation standards consistently.
        
        When a user provides debate data, use the create_prd_from_debate function
        to generate a complete PRD with quality assurance validation.
        """,
    )
    
    # Create the ADK application
    app = AdkApp(agent=agent)
    
    return app


# Example usage
if __name__ == "__main__":
    # Create the ADK agent
    prd_agent = create_prd_quality_agent()
    
    # Example query to test the agent
    sample_query = """
    Please create a PRD from this debate data:
    
    Topic: Mobile Task Management Application
    Participants: Product Manager, UX Designer, Engineering Lead, Business Analyst
    
    Arguments:
    - Users need ability to create and organize tasks efficiently
    - Interface must be intuitive and accessible across devices  
    - System should support real-time synchronization and offline capability
    - Performance metrics and user analytics are essential for business success
    
    Consensus Points:
    - Task creation and management is core functionality
    - Multi-device synchronization is required
    - User experience should be intuitive and accessible
    - Performance monitoring and analytics needed
    
    Disagreements:
    - Offline functionality complexity vs. time-to-market
    - Advanced features vs. simplicity in initial release
    """
    
    # Test the agent locally
    for event in prd_agent.stream_query(
        user_id="test_user",
        message=sample_query,
    ):
        print(event)