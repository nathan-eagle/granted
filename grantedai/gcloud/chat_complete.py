import openai
import requests
from llm_helpers import initialize_data, add_error, chat_complete_openai
import document

def chat_complete(request, api_key, request_timeout=540, evaluation=False):
    
    data = initialize_data(request.get_json())
    DEBUG = data['debug']
    if DEBUG: print(data)
    response_function = "add_response"

    if data['model_title'] in ["NSF SBIR"]:
        single_shot = document.Document(data['model_title'])
        if evaluation:
             bubble_data = single_shot.evaluate(data, api_key, request_timeout)
             response_function = "nsf_response"
        else:
            bubble_data = single_shot.draft(data, api_key, request_timeout)
    else:
        bubble_data = chat_complete_openai(data, api_key, request_timeout)
    
    # Set the URL for the Bubble.io API endpoint 
    if 'initialize_url' in data:
        bubble_api_url = data['initialize_url']
    elif data['branch'] =="live":
        bubble_api_url = 'https://grantedai.com/api/1.1/wf/' + response_function
    else:
        bubble_api_url =  'https://grantedai.com/version-' + data['branch'] + '/api/1.1/wf/' + response_function # for actually triggering the workflow
    if DEBUG: print("API URL:",bubble_api_url)  

    # Make the API request to trigger the workflow
    if DEBUG: print("Sending to Bubble.io",data['email'], data['model_title'])  
    response = requests.post(bubble_api_url, data=bubble_data)
    return(response.text)
