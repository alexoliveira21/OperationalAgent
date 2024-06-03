import json
import requests
from langchain import Agent, BaseTool
from langchain.llms import OpenAI

class GitHubTool(BaseTool):
    def __init__(self, github_token):
        self.github_token = github_token

    def fetch_repo_contents(self, owner, repo, path=''):
        url = f'https://api.github.com/repos/{owner}/{repo}/contents/{path}'
        headers = {'Authorization': f'token {self.github_token}'}
        response = requests.get(url, headers=headers)
        return response.json()

    def run(self, query):
        owner, repo, path = query.split('/')
        contents = self.fetch_repo_contents(owner, repo, path)
        return contents

def lambda_handler(event, context):
    # Extract the chat history and new message from the event
    body = json.loads(event['body'])
    chat_history = body.get('chat_history', [])
    new_message = body.get('message', '')

    # Initialize the agent
    github_tool = GitHubTool(github_token='your_github_token')
    llm = OpenAI(api_key='your_openai_api_key')
    agent = Agent(llm=llm, tools=[github_tool])

    # Process the new message
    response = agent.run(new_message)

    # Update the chat history
    chat_history.append({"user": new_message, "agent": response})

    return {
        'statusCode': 200,
        'body': json.dumps(chat_history)
    }