import time
import requests
import random

API_URL = "http://localhost:3000/complexes/1/devices/1/telemetry"


def send_presence(value: int):
    payload = {
        "value": value
    }
    try:
        response = requests.post(API_URL, json=payload)
        print(f"[OK] {payload} -> {response.status_code}")
    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    print("Simulación de sensor de presencia iniciada...")

    while True:
        presence = random.randint(0, 1)
        send_presence(bool(presence))

        time.sleep(15)
