import json
import os
import tempfile
import logging
from langchain.document_loaders import S3DirectoryLoader
import boto3
import requests

s3 = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']
BEDROCK_API_ENDPOINT = os.environ['BEDROCK_API_ENDPOINT']
BEDROCK_API_KEY = os.environ['BEDROCK_API_KEY']

# Configure logging
logging.basicConfig(level=logging.INFO)

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        query = body['query']
        
        # Load documents directly from S3 using S3DirectoryLoader
        loader = S3DirectoryLoader(bucket=BUCKET_NAME, prefix="")
        documents = loader.load()
        
        # Combine the documents into a single string for querying
        combined_text = "\n\n".join([doc.page_content for doc in documents])
        
        # Create a prompt with the combined text and query
        prompt = {
            "input": combined_text,
            "query": query
        }
        
        # Use Bedrock's API to process the query
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {BEDROCK_API_KEY}"
        }
        response = requests.post(
            BEDROCK_API_ENDPOINT,
            headers=headers,
            json=prompt
        )
        
        answer = response.json().get('output', 'No response from Bedrock')
        
        return {
            'statusCode': 200,
            'body': json.dumps({'response': answer})
        }
    
    except Exception as e:
        logging.error("Error: %s", str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }