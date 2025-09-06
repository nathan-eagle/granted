import requests
import yaml
import time
from llm_helpers import chat_complete_openai

class Document:
    def __init__(self, model_name):
        self.model_name = model_name
        self.config_file = "config/"+ model_name + ".yaml"
        with open(self.config_file,'r', encoding='utf-8') as file:
            self.document = yaml.safe_load(file)

    def split_body(self, body):
        scratchpad = {}
        counter = 0
        user_inputs = body.split("qinput:")
        for user_input in user_inputs:
            scratchpad["page_q"+str(counter)] = user_input
            counter += 1
        return(scratchpad)
    
    def sub_user_inputs(self, body, scratchpad, page):
        for key,value in self.document[page]['qs'].items():
            if value in scratchpad.keys():
                value = scratchpad[value]
                body = body.replace(key,value)
        return(body)

    def get_section_title(self, section):
        for key in self.document.keys():
            if section in key:
                return(key)


    def evaluate(self, page_data, my_secret_value, request_timeout=540):
        #section_title = self.document['output_order'][int(page_data['section'])]
        section_title = self.get_section_title("Project Summary")
        if page_data['debug']: print("Evaluating section:",section_title)
        
        system_prompt = page_data['prompt']
        
        evaluation_prompt = 'Make this sound better'
        if 'evaluation_prompt' in self.document[section_title].keys():
            evaluation_prompt = self.document[section_title]['evaluation_prompt']
        user_prompt = self.document['reviewer_characteristics']+ "\n" + evaluation_prompt
        if page_data['debug']: print("User Prompt:",user_prompt[0:100])
        if page_data['debug']: print("System Prompt:",system_prompt[0:100])

        # Data to be sent
        data = {
            "email": page_data['email'],
            "branch": page_data['branch'],
            "debug": page_data['debug'],
            "system_prompt" : system_prompt,
            "body" : user_prompt,
            "model_title": page_data['model_title'],
        }

        response = chat_complete_openai(data, my_secret_value)
       
        # need full bubble_data to get the final output
        bubble_data = {"tokens" : response['tokens'], "model": page_data['model_title'], "response_id": page_data['response_id'], "email": page_data['email'], "text": response['text']}
        return(bubble_data)

    def draft(self, page_data, my_secret_value, request_timeout=540):       
        # get the qs from the page_data
        tokens = 0
        scratchpad = self.split_body(page_data['body'])
       
        for page in self.document['draft_order']:
            # construct body from model_data and project_data
            body = ""
            if self.document[page]['include_header']: body += scratchpad['page_q0']
            body += self.document[page]['prompt']
            body = self.sub_user_inputs(body, scratchpad, page)

            # Data to be sent
            data = {
                "email": page_data['email'],
                "branch": page_data['branch'],
                "debug": "True",
                "body" : body,
                "model_title": page_data['model_title'],
                "project_id": page_data['project_id']
                }
            
            response = chat_complete_openai(data, my_secret_value)
            if response['error']:   
                time.sleep(20)  # Pause for 20 seconds
                if page_data['debug']: print("Retrying OpenAI call due to error")
                response = chat_complete_openai(data, my_secret_value)

            text = response['text']
            tokens += response['tokens']

            scratchpad[page] = text

        output = ""
        for page in self.document['output_order']:
            if 'fixed_out' in self.document[page].keys():
                output += self.document[page]['fixed_out'] + "\n"
            output += scratchpad[page] + "\n"
                                    
        # need full bubble_data to get the final output
        bubble_data = {"tokens" : tokens, "model": page_data['model_title'], "project": page_data['project_id'], "email": page_data['email'], "text": output}
        return(bubble_data)
