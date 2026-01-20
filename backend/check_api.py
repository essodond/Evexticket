import requests
import json

url = "http://localhost:8001/api/scheduled_trips/search/"
headers = {"Content-Type": "application/json"}
data = {"departure_city": "Kara", "arrival_city": "Tsevie", "travel_date": "2025-12-14", "passengers": 1}

try:
    response = requests.post(url, headers=headers, data=json.dumps(data))
    response.raise_for_status()  # Raise an exception for HTTP errors
    print(json.dumps(response.json(), indent=4))
except requests.exceptions.RequestException as e:
    print(f"Error during API request: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Response content: {e.response.text}")
