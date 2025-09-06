import openai
import requests
import os
from web_summary import web_summary
from chat_complete import chat_complete


from google.cloud import secretmanager

# accessing openai api key through google secrets manager

project_id = 'python-backend-v1'
client = secretmanager.SecretManagerServiceClient()
name = f"projects/{project_id}/secrets/OPENAI_API_KEY/versions/2"
response = client.access_secret_version(request={"name": name})
my_secret_value = response.payload.data.decode("UTF-8")
openai.api_key = my_secret_value

FUNCTION_TIMEOUT = 538

def main(request):
    
    """Responds to any HTTP request.
    Args:
        request (flask.Request): HTTP request object.
    Returns:
        The response text or any set of values that can be turned into a
        Response object using
        `make_response <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>`.
    """
    
    # switch based on function
    func = ''
    if request.headers and 'function' in request.headers:
        func = request.headers.get('function')
    if request.args and 'function' in request.args:
        func = request.args.get('function')
    
    if func == 'web_summary':
        return(web_summary(request, api_key=my_secret_value, request_timeout=FUNCTION_TIMEOUT))
    elif func == 'chat_complete':
        return(chat_complete(request, api_key=my_secret_value, request_timeout=FUNCTION_TIMEOUT))
    elif func == 'nsf_complete':
        return(chat_complete(request, api_key=my_secret_value, request_timeout=FUNCTION_TIMEOUT, evaluation=True))
    else:
        if func != '':
            return(f'Function {func} not found')
        else:
            return f'Hello World!'

