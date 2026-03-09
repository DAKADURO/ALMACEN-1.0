import requests
import sys

API_URL = "http://localhost:8000"
CONTEXT = "tuberia"

def test_create_product():
    headers = {
        "Content-Type": "application/json",
        "X-Inventory-Context": CONTEXT
    }
    
    payload = {
        "code": "TEST-PROD-999",
        "name": "Test Product",
        "family": "TUBERIA",
        "unit_of_measure": "PZA",
        "cost_price": 10.5
    }
    
    print(f"Testing product creation at {API_URL}/products/ with context {CONTEXT}...")
    try:
        response = requests.post(f"{API_URL}/products/", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_create_product()
