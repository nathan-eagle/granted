import openai
import requests

def add_error(error_message, email, branch, DEBUG):
    bubble_data = {"exception": error_message, "email": email}
    if branch =="live":
        bubble_api_url = 'https://grantedai.com/api/1.1/wf/add_error'
    else:
        bubble_api_url =  'https://grantedai.com/version-' + branch + '/api/1.1/wf/add_error' # for actually triggering the workflow
    if DEBUG: print("API URL: ",bubble_api_url)  
    if DEBUG: print("Sending to Bubble.io: ",error_message)  
    response = requests.post(bubble_api_url, data=bubble_data)
    return(response.text)

def initialize_data(request_json):
    default_data = {
        "body": "", 
        "model_title": "Humor", 
        "branch": "live",
        "email": "nathan.eagle@gmail.com",
        "project_id": "1683121929445x949068210706579500",
        "debug": False}
    
    if not request_json: 
        return(default_data)
    
    for key, value in default_data.items():
        if key not in request_json:
            request_json[key] = value

    return(request_json)

def chat_complete_openai(data, api_key, request_timeout=540, temperature=0.3, top_p=0.3):
    openai.api_key = api_key
    tokens = 0
    text = ""
    error = False
    DEBUG = data['debug']
    
    system_prompt = "You are a helpful grant writer"
    if 'system_prompt' in data:
        system_prompt = data['system_prompt']

    try:
        if DEBUG: print("Sending to OpenAI with body %s" % data['body'][0:100])
        if DEBUG: print("Sending to OpenAI with prompt %s" % system_prompt)
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data['body']},
                ],
            temperature=temperature,
            top_p=top_p,
            request_timeout=request_timeout,
            )
        text = response['choices'][0]['message']['content']
        tokens = response['usage']['total_tokens']
        if DEBUG: print("Received from OpenAI")
    except openai.error.InvalidRequestError as e:
        if DEBUG: print(e)
        error = True
        if "reduce the length" in str(e):
            text = "Error generating response.  The input is too long, please reduce length and try again."
        else:
            text = "Error generating response."
        add_error(str(e), data['email'], data['branch'], DEBUG)
    except Exception as e:
        if DEBUG: print(e)
        error = True
        text = "Error generating response, please try again."
        add_error(str(e), data['email'], data['branch'], DEBUG)

    if DEBUG: print("GPT returned: "+text[0:100])

    bubble_data = {"tokens" : tokens, "model": data['model_title'], "email": data['email'], "text": text, "error": error}
    if 'project_id' in data.keys(): bubble_data["project"] = data['project_id']
    if 'response_id' in data.keys(): bubble_data["response_id"] = data['response_id']


    return(bubble_data)
