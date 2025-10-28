import time
import requests
import random

API_URL = "http://localhost:3000/complexes/1/devices/6/telemetry"


def send_rainfall(value: float):
    payload = {
        "value": value,
    }
    try:
        response = requests.post(API_URL, json=payload)
        print(f"[OK] {payload} -> {response.status_code}")
    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    print("Simulación de pluviómetro iniciada...")

    while True:
        intensity = round(random.uniform(0, 30), 2)
        send_rainfall(intensity)

        # Simulación de lluvia:
        # - Si no llueve mucho (<2.5 mm/h), cada 30 min (simulado aquí con 30s)
        # - Si llueve bastante (>=2.5 mm/h), cada 5 min (simulado aquí con 5s)
        if intensity < 2.5:
            time.sleep(15)
        else:
            time.sleep(5)
