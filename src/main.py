# import os

# from flask import Flask, send_file

# app = Flask(__name__)

# @app.route("/")
# def index():
#     return send_file('src/templates/index.html')

# def main():
#     app.run(port=int(os.environ.get('PORT', 80)))

# if __name__ == "__main__":
#     main()

# src/main.py
import os
from flask import Flask, render_template, send_file
from core.user_interface_api import api_blueprint

app = Flask(__name__, template_folder="templates", static_folder="static")
app.register_blueprint(api_blueprint, url_prefix='/api')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
