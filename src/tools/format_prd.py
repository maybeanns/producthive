# tools/format_prd.py

def format_prd_markdown(prd_state: dict) -> str:
    output = ["# 📄 Product Requirements Document\n"]
    for section, items in prd_state.items():
        output.append(f"## {section.replace('_', ' ').title()}")
        if isinstance(items, list):
            if items:
                for item in items:
                    output.append(f"- {item}")
            else:
                output.append("_(no entries)_")
        else:
            output.append(str(items))
        output.append("")  # spacing
    return "\n".join(output)
