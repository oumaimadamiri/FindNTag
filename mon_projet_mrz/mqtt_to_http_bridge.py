import json
import os

import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
# Un topic par traceur : gps_tracker/<deviceId>/location
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "gps_tracker/+/location")
MQTT_USERNAME = os.getenv("MQTT_USERNAME") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None
MQTT_TLS = os.getenv("MQTT_TLS", "false").lower() == "true"
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8081").rstrip("/")
GPS_INGEST_KEY = os.getenv("GPS_INGEST_KEY", "")


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"[MQTT] Échec de connexion : {reason_code}")
        return
    client.subscribe(MQTT_TOPIC)
    print(f"[MQTT] Connecté à {MQTT_BROKER}, abonné à {MQTT_TOPIC}")


def on_message(client, userdata, msg):
    # Topic attendu : gps_tracker/<deviceId>/location
    parts = msg.topic.split("/")
    if len(parts) != 3:
        print(f"[MQTT] Topic ignoré : {msg.topic}")
        return
    device_id = parts[1]

    try:
        payload = json.loads(msg.payload.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        print(f"[MQTT] Message ignoré (JSON invalide) : {msg.payload!r}")
        return

    lat, lng = payload.get("latitude"), payload.get("longitude")
    if lat is None or lng is None:
        print(f"[MQTT] Message ignoré (latitude/longitude manquante) : {payload}")
        return

    url = f"{BACKEND_URL}/api/gps/ingest"
    try:
        response = requests.post(
            url,
            headers={"X-Device-Key": GPS_INGEST_KEY},
            json={"deviceId": device_id, "latitude": str(lat), "longitude": str(lng)},
            timeout=10,
        )
        print(f"[HTTP] {device_id} -> {response.status_code} {response.text}")
    except requests.RequestException as e:
        print(f"[HTTP] Erreur d'envoi vers le backend : {e}")


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    if MQTT_TLS:
        client.tls_set()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
