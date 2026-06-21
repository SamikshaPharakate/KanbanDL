import time
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def wait_for_server():
    print("Waiting for FastAPI server to start...")
    for _ in range(10):
        try:
            res = requests.get(BASE_URL)
            if res.status_code == 200:
                print("Server is online!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    print("Server failed to respond in time.")
    return False

def test_endpoints():
    print("\n1. Testing POST /predict-time...")
    time_payload = {
        "title": "Configure MongoDB Database",
        "description": "Establish connection, write schemas, and test endpoints",
        "priority": "high",
        "num_subtasks": 3,
        "avg_user_completion_time": 10.0
    }
    res = requests.post(f"{BASE_URL}/predict-time", json=time_payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert "predicted_time" in res.json()
    assert "difficulty" in res.json()
    
    print("\n2. Testing POST /predict-productivity...")
    prod_payload = {
        "streak_length": 5,
        "focus_hours": 6.5,
        "tasks_completed": 4,
        "energy_level": 4
    }
    res = requests.post(f"{BASE_URL}/predict-productivity", json=prod_payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert "productivity_zone" in res.json()
    assert "burnout_risk" in res.json()

    print("\n3. Testing POST /analyze-nlp...")
    nlp_payload = {
        "title": "Setup Express Server with Auth",
        "description": "Create registration and login routes, hash passwords with bcrypt, sign tokens with JWT."
    }
    res = requests.post(f"{BASE_URL}/analyze-nlp", json=nlp_payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    assert res.status_code == 200
    assert "subtasks" in res.json()
    assert len(res.json()["subtasks"]) > 0

    print("\n=== ALL ENDPOINT INTEGRATION TESTS PASSED ===")

if __name__ == "__main__":
    if wait_for_server():
        try:
            test_endpoints()
            sys.exit(0)
        except Exception as e:
            print(f"Test failed: {e}")
            sys.exit(1)
    else:
        sys.exit(1)
