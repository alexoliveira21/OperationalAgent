import json
import os
import tempfile
import logging
from git import Repo
import boto3

s3 = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']
KNOWLEDGE_BASE_KEY = 'combined_knowledge_base.json'

# Configure logging
logging.basicConfig(level=logging.INFO)

def lambda_handler(event, context):
    try:
        logging.info("Received event: %s", json.dumps(event))
        body = json.loads(event['body'])
        repo_url = body['repo_url']
        
        logging.info("Cloning repository: %s", repo_url)
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Clone the GitHub repository
            repo = Repo.clone_from(repo_url, tmpdirname)
            logging.info("Repository cloned successfully")
            
            # Get the repository name from the .git/config file
            config_path = os.path.join(tmpdirname, '.git', 'config')
            repo_name = None
            with open(config_path, 'r') as config_file:
                for line in config_file:
                    if 'url = ' in line:
                        repo_name = line.split('/')[-1].strip().replace('.git', '')
                        break
            if not repo_name:
                raise Exception('Failed to get repository name from .git/config')
            
            # Process the repository files into a nested JSON structure
            def process_directory(directory_path):
                directory_contents = []
                for item in os.listdir(directory_path):
                    item_path = os.path.join(directory_path, item)
                    if os.path.isdir(item_path):
                        # If item is a directory, recursively process it
                        directory_contents.append({
                            'directory': item,
                            'contents': process_directory(item_path)
                        })
                    else:
                        # If item is a file, read its content
                        with open(item_path, 'r', errors='ignore') as f:
                            content = f.read()
                        directory_contents.append({
                            'file': item,
                            'path': os.path.relpath(item_path, tmpdirname),
                            'content': content
                        })
                return directory_contents
            
            # Start processing from the root of the cloned repository
            repo_structure = process_directory(tmpdirname)
            
            # Create a JSON object for the repository
            repo_json = {
                'repository': repo_name,
                'contents': repo_structure
            }
            
            # Retrieve the existing knowledge base from S3
            try:
                response = s3.get_object(Bucket=BUCKET_NAME, Key=KNOWLEDGE_BASE_KEY)
                knowledge_base = json.loads(response['Body'].read().decode('utf-8'))
            except s3.exceptions.NoSuchKey:
                knowledge_base = {}
            
            # Add the new repository to the knowledge base
            knowledge_base[repo_name] = repo_json
            
            # Convert the updated knowledge base to a string
            knowledge_base_str = json.dumps(knowledge_base, indent=2)
            
            # Upload the updated knowledge base to S3
            s3.put_object(Body=knowledge_base_str, Bucket=BUCKET_NAME, Key=KNOWLEDGE_BASE_KEY)
            logging.info("Updated knowledge base uploaded to S3")
            
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Repository processed and uploaded successfully'})
        }
    
    except Exception as e:
        logging.error("Error: %s", str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }