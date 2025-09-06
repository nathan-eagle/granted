from urllib import parse
import bs4
import tiktoken
import requests
import re
import openai

encoding = tiktoken.encoding_for_model("gpt-4")
MAX_TOKENS = 8000
MAX_TOKENS_CHUNK = 4000

def find_valid_url(url):
    stripped_url = url.replace('http://', '').replace('https://', '').replace('www.', '')
    
    # Generate all possible variations
    url_variations = [
        url,  # include the original url as the first item
        f'http://{stripped_url}',
        f'https://{stripped_url}',
        f'http://www.{stripped_url}',
        f'https://www.{stripped_url}',
    ]
    
    valid_url = None
    for url in url_variations:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                valid_url = url
                break
        except requests.exceptions.RequestException:
            continue
    return valid_url


def text_summary(text, prompt, DEBUG=False, request_timeout=540):
    if DEBUG: print("Summarizing a text of %d tokens" % len(encoding.encode(text)))
    sentences = text.split('.')
    summarized_text = ""
    chunk_counter = 0

    while len(sentences) > 0:
        chunk = ""
        while len(encoding.encode(chunk)) < MAX_TOKENS_CHUNK and len(sentences)>0:
            chunk += sentences.pop(0)
        chunk_counter += 1
        if DEBUG: print("Chunk %d: %d tokens" % (chunk_counter, len(encoding.encode(chunk))))
        try:
            response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are an expert assistant."},
                        {"role": "user", "content":  prompt + chunk},
                        ],
                    temperature=0,
                    max_tokens = 999,
                    request_timeout=request_timeout,
                    )
            summarized_text += response['choices'][0]['message']['content']
        except:
            return("Web summarization encountered an error.")
    if chunk_counter > 1: summarized_text = text_summary(summarized_text, prompt, DEBUG)
    return(summarized_text)

def web_summary(request, api_key, request_timeout=540):
    """Responds to any HTTP request.
    Args:
        request (flask.Request): HTTP request object.
    Returns:
        The response text or any set of values that can be turned into a
        Response object using
        `make_response <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>`.
    """
    BLANK_MESSAGE = "No information provided. "

    PROMPTS = {"mission": "Summarize the following text in a few sentences that capture the mission of the organization: ",
               "rfp": "Summarize the following text in a few sentences the capture the most important details of the funding opportunity: ",
               "applicant": "Summarize the following text in a few sentences that capture information about the grant applicant: "}

    openai.api_key = api_key

    DEBUG = False
    if request.args and 'debug' in request.args:
        DEBUG = True
        print("Debugging mode on")

    prompt = "Summarize the following text in a few sentences: "
    if request.args and 'reader' in request.args:
        reader = request.args.get('reader')
        if reader in PROMPTS.keys():
            prompt = PROMPTS[reader]
            
    valid_url = None
    if request.args and 'URL' in request.args:
        URL = request.args.get('URL')
        valid_url = find_valid_url(URL)

    if valid_url is None:
        return(BLANK_MESSAGE)
    else:
        page = requests.get(valid_url)
        soup = bs4.BeautifulSoup(page.content, "html.parser")
        text = soup.get_text() # dont need strip =True because next line takes care of it
        text = repr(re.sub(r'\s+', ' ', text)) # converts consecutive newline and space to single space
        tokens = encoding.encode(text)
        if len(tokens) > MAX_TOKENS: text = encoding.decode(tokens[0:MAX_TOKENS])
        # timeout estimate 
        timeout = int(request_timeout / int(max(1,min(MAX_TOKENS,len(tokens)) / MAX_TOKENS_CHUNK)))
        if DEBUG: 
            print("Timeout estimate per single call: %d seconds" % timeout) 
        return(text_summary(text, prompt, DEBUG, request_timeout=timeout))