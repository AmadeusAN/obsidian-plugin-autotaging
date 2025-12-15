import imp
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from pathlib import Path
from vector_db_port import (
    collection,
    chroma_client,
    generate_hierarchical_tags,
    assign_index_tags,
    entry_generate_tags_for_alldoc,
    get_internal_link_for_current_file,
)

app = Flask(__name__)
CORS(app, origins=["app://obsidian.md"])

# 允许所有来源的跨域请求
CORS(app)


@app.route("/")
def index():
    return jsonify({"message": "Welcome to the basic Flask project!"})


@app.route("/get-tags", methods=["POST"])
def test():
    data = request.get_json(force=True, silent=True) or {}
    api_key = data.get("api_key")
    data = data.get("files")
    # data_file = Path("test_connect.json")
    # data_file.write_text(json.dumps(data, indent=4))

    ids_tags_maps = entry_generate_tags_for_alldoc(data, api_key)

    return jsonify({"tags": ids_tags_maps})


@app.route("/internal-links", methods=["POST"])
def internal_link():
    data = request.get_json(force=True, silent=True) or {}
    Path("internal_links.json").write_text(json.dumps(data, indent=4))
    if not data.get("path"):
        return jsonify({"error": "file_path is required"}), 400

    # return jsonify({"file_path": data.get("path")})
    result = get_internal_link_for_current_file(data)
    if "result" in result.keys():
        internal_link = result["result"]
    else:
        internal_link = result["error"]
    return jsonify({"internal_link": internal_link})


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({"status": "running"})


@app.route("/api/echo", methods=["POST"])
def echo():
    data = request.get_json(force=True, silent=True) or {}
    return jsonify({"echo": data})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
