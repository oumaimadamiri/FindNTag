import os
import re

import cv2
import easyocr
import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

OCR_HOST = os.getenv("OCR_HOST", "127.0.0.1")   # seul le backend appelle ce service
OCR_PORT = int(os.getenv("OCR_PORT", "5001"))
OCR_GPU = os.getenv("OCR_GPU", "false").lower() == "true"

app = Flask(__name__)
reader = easyocr.Reader(["fr", "en"], gpu=OCR_GPU)
CIN_PATTERN = re.compile(r"\b[A-Z]{1,2}[0-9]{5,6}\b", re.IGNORECASE)


def parse_results(results):
    """results : liste [(bbox, texte, confiance), ...] renvoyée par EasyOCR."""
    cin = nom = prenom = ""

    for _, text, _ in results:
        cleaned = text.strip()
        if not cin and CIN_PATTERN.match(cleaned):
            cin = cleaned.upper()

    if results:
        # Dernière ligne MRZ = ligne la plus basse de l'image
        last_line = max(results, key=lambda r: max(point[1] for point in r[0]))
        parts = last_line[1].strip().split("<<", 1)
        if len(parts) == 2:
            nom = parts[0].replace("<", "").strip()
            prenom = parts[1].replace("<", "").strip()

    return {"cin": cin, "nom": nom, "prenom": prenom}


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