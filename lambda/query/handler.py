import json
import os
import logging
import boto3
import requests

s3 = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']
KNOWLEDGE_BASE_KEY = 'combined_knowledge_base.json'
BEDROCK_API_ENDPOINT = os.environ['BEDROCK_API_ENDPOINT']

# Configure logging
logging.basicConfig(level=logging.INFO)

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        query = body['query']
        
        # Create the payload for Bedrock API
        payload = {
            "knowledge_base_s3_uri": f"s3://{BUCKET_NAME}/{KNOWLEDGE_BASE_KEY}",
            "query": query
        }
        
        # Use Bedrock's API to process the query
        response = requests.post(
            f"{BEDROCK_API_ENDPOINT}/v1/models/gpt-3/invoke",
            headers={"Content-Type": "application/json"},
            json=payload
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