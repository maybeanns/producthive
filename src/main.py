from google.cloud import aiplatform
aiplatform.init(project="producthive-462420", location="us-central1")

from flask import Flask, render_template
from flask_cors import CORS

from core.user_interface_api import api_blueprint                               

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

app.register_blueprint(api_blueprint, url_prefix="/api")

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)