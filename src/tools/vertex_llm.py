import vertexai
from vertexai.preview.generative_models import GenerativeModel, ChatSession
from google.api_core.exceptions import GoogleAPIError

class VertexLLM:
    def __init__(self, project: str, location: str = "us-central1", model: str = "gemini-2.0-flash-lite-001"):
        self.project = project
        self.location = location
        self.model_name = model
        vertexai.init(project=self.project, location=self.location)
        self.model = GenerativeModel(self.model_name)

    def ask(self, prompt: str, max_tokens: int = 1024, temperature: float = 0.7) -> str:
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "max_output_tokens": max_tokens,
                    "temperature": temperature,
                    "top_p": 1,
                    "top_k": 32,
                }
            )
            return response.text
        except GoogleAPIError as e:
            return f"❌ Vertex AI error: {str(e)}"
        except Exception as e:
            return f"❌ Unexpected LLM error: {str(e)}"