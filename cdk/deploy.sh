#!/bin/bash
# Exit immediately for any failures
set -e

# Build the CDK app (if using TypeScript)
echo "Building the CDK app..."
npm run build

# Bootstrap the environment (if not already bootstrapped)
echo "Bootstrapping the AWS environment..."
npx cdk bootstrap

# Synthesize the CloudFormation template
echo "Synthesizing the CloudFormation template..."
npx cdk synth

# Deploy the CDK stack
echo "Deploying the CDK stack..."
npx cdk deploy

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed!"
  exit 1
fi