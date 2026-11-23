import os

import cv2
import easyocr
import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify, request

from ocr_parser import parse_results

load_dotenv()

OCR_HOST = os.getenv("OCR_HOST", "127.0.0.1")   # seul le backend appelle ce service
OCR_PORT = int(os.getenv("OCR_PORT", "5001"))
OCR_GPU = os.getenv("OCR_GPU", "false").lower() == "true"

app = Flask(__name__)
reader = easyocr.Reader(["fr", "en"], gpu=OCR_GPU)


def extract_info_with_easyocr(image_bytes):
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Image illisible")
    return {"data": parse_results(reader.readtext(img))}


@app.route("/extract_info", methods=["POST"])
def extract_info():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    try:
        result = extract_info_with_easyocr(request.files["file"].read())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    app.logger.info("OCR terminé (CIN trouvée : %s)", bool(result["data"]["cin"]))
    return jsonify(result)


@app.route("/", methods=["GET"])
def status():
    return "Serveur OCR opérationnel. Utilisez POST /extract_info avec un fichier."


if __name__ == "__main__":
    from waitress import serve

    print(f"Serveur OCR sur {OCR_HOST}:{OCR_PORT} (GPU={OCR_GPU})")
    serve(app, host=OCR_HOST, port=OCR_PORT)