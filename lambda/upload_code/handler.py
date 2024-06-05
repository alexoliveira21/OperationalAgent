import json
import os
import tempfile
from git import Repo
import boto3

s3 = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        repo_url = body['repo_url']
        
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Clone the GitHub repository
            Repo.clone_from(repo_url, tmpdirname)

            # Get the repository ID from the .git/config file
            config_path = os.path.join(tmpdirname, '.git', 'config')
            repo_id = None
            with open(config_path, 'r') as config_file:
                for line in config_file:
                    if 'url = ' in line:
                        repo_id = line.split('/')[-1].strip().replace('.git', '')
                        break
            if not repo_id:
                raise Exception('Failed to get repository ID from .git/config')

            # Upload the repository content to S3
            for root, dirs, files in os.walk(tmpdirname):
                for file in files:
                    file_path = os.path.join(root, file)
                    s3_key = os.path.relpath(file_path, tmpdirname)
                    s3.upload_file(file_path, BUCKET_NAME, s3_key)
            
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Repository uploaded successfully'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }