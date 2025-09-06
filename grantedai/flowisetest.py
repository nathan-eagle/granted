import requests

API_URL = "https://calebflowise.onrender.com/api/v1/prediction/7b4c17dc-4a6a-4855-8e14-5d4c60279446"

def query(payload):
    response = requests.post(API_URL, json=payload)
    return response.json()
    
output = query({
    "question": "Hey, how are you?",
})
