from google.cloud import aiplatform
aiplatform.init(project="producthive-462420", location="us-central1")

from flask import Flask, render_template
from flask_cors import CORS

from core.user_interface_api import api_blueprint

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)  # Optional: Enable CORS for local frontend JS

# Register API blueprint (no prefix if routes already start with /api)
app.register_blueprint(api_blueprint)

# Home route
@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)