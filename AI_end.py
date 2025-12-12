import imp
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from pathlib import Path

app = Flask(__name__)
CORS(app)  # 允许所有来源的跨域请求


@app.route("/")
def index():
    return jsonify({"message": "Welcome to the basic Flask project!"})


@app.route("/test", methods=["POST"])
def test():
    data = request.get_json(force=True, silent=True) or {}
    print(data)

    data_file = Path("test_connect.json")
    data_file.write_text(json.dumps(data, indent=4))

    return jsonify({"information": "test success"})


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({"status": "running"})


@app.route("/api/echo", methods=["POST"])
def echo():
    data = request.get_json(force=True, silent=True) or {}
    return jsonify({"echo": data})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
