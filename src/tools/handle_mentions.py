# tools/handle_mentions.py

def extract_mention(user_message):
    """
    Returns: ("agent_name", "message") if mention exists
    """
    if user_message.startswith("@") and " " in user_message:
        parts = user_message.split(" ", 1)
        return parts[0][1:], parts[1]
    return None, None
