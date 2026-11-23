import json
import os

import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "gps_tracker/a9g/location")
MQTT_USERNAME = os.getenv("MQTT_USERNAME") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8081").rstrip("/")
ANIMAL_ID = os.getenv("ANIMAL_ID", "1")  # temporaire : supprimé en phase 4


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"[MQTT] Échec de connexion : {reason_code}")
        return
    client.subscribe(MQTT_TOPIC)
    print(f"[MQTT] Connecté à {MQTT_BROKER}, abonné à {MQTT_TOPIC}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        print(f"[MQTT] Message ignoré (JSON invalide) : {msg.payload!r}")
        return

    lat, lng = payload.get("latitude"), payload.get("longitude")
    if lat is None or lng is None:
        print(f"[MQTT] Message ignoré (latitude/longitude manquante) : {payload}")
        return

    url = f"{BACKEND_URL}/api/gps/{ANIMAL_ID}"
    try:
        response = requests.post(url, json={"latitude": str(lat), "longitude": str(lng)}, timeout=10)
        print(f"[HTTP] POST {url} -> {response.status_code} {response.text}")
    except requests.RequestException as e:
        print(f"[HTTP] Erreur d'envoi vers le backend : {e}")


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()