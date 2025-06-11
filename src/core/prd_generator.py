# src/core/prd_generator.py

from docx import Document

def generate_prd_docx(topic, debate_history, prd_state):
    doc = Document()

    doc.add_heading('Product Requirements Document', 0)
    doc.add_paragraph(f'Topic: {topic}')

    doc.add_heading('Overview', level=1)
    doc.add_paragraph(prd_state.get('overview', ''))

    doc.add_heading('Goals', level=1)
    for goal in prd_state.get('goals', []):
        doc.add_paragraph(goal, style='List Bullet')

    doc.add_heading('Functional Requirements', level=1)
    for req in prd_state.get('functional_requirements', []):
        doc.add_paragraph(req, style='List Bullet')

    doc.add_heading('Non-Functional Requirements', level=1)
    for req in prd_state.get('non_functional_requirements', []):
        doc.add_paragraph(req, style='List Bullet')

    doc.add_heading('Risks / Constraints', level=1)
    for risk in prd_state.get('risks', []):
        doc.add_paragraph(risk, style='List Bullet')

    doc.add_heading('User Stories', level=1)
    for story in prd_state.get('user_stories', []):
        doc.add_paragraph(story, style='List Bullet')

    doc.add_heading('Architecture Notes', level=1)
    for note in prd_state.get('architecture_notes', []):
        doc.add_paragraph(note, style='List Bullet')

    doc.add_heading('Kanban Tasks', level=1)
    for task in prd_state.get('kanban_tasks', []):
        doc.add_paragraph(task, style='List Bullet')

    # Optional — Add full debate history at the end
    doc.add_page_break()
    doc.add_heading('Debate History', level=1)
    for round_data in debate_history:
        doc.add_heading(f"Round {round_data['round']}", level=2)
        for argument in round_data['results']:
            doc.add_paragraph(f"{argument['agent']} — Position: {argument['position']}")
            for step in argument['reasoning']:
                doc.add_paragraph(step, style='List Bullet')

    return doc
