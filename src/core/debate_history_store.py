# src/core/debate_history_store.py

from google.cloud import firestore
import uuid

class DebateHistoryStore:
    def __init__(self):
        self.db = firestore.Client(project="producthive-462420")
        self.collection = self.db.collection("debate_sessions")

    def save_debate(self, topic, debate_history):
        session_id = str(uuid.uuid4())
        self.collection.document(session_id).set({
            "topic": topic,
            "history": debate_history
        })
        return session_id

    def load_debate(self, session_id):
        doc = self.collection.document(session_id).get()
        if doc.exists:
            return doc.to_dict()
        else:
            return None
