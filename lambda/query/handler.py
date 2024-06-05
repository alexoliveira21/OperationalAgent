import json
from langchain.agents import create_agent
from langchain.document_loaders import S3DirectoryLoader

BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        query = body['query']
        
        # Load documents directly from S3 using S3DirectoryLoader
        loader = S3DirectoryLoader(bucket=BUCKET_NAME, prefix="")
        documents = loader.load()
        
        # Initialize the LangChain agent
        agent = create_agent(documents)
        
        # Process the user query
        response = agent.run(query)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'response': response})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
