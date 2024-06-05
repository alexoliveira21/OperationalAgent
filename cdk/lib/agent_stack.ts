import { Stack, StackProps, RemovalPolicy, aws_cloudfront_origins, CfnOutput, Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class AgentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for storing repository data
    const repoBucket = new s3.Bucket(this, 'AgentBucket', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // IAM role for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    const gitLambdaLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'GitLambdaLayer', 'arn:aws:lambda:us-east-1:553035198032:layer:git-lambda2:8');

    // Lambda function for uploading repository
    const uploadLambda = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'handler.lambda_handler',
      layers: [gitLambdaLayer],
      timeout: Duration.minutes(5),
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/upload_code'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_8.bundlingImage,
          command: [
            'bash', '-c', 
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
          ],
        },
      }),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: repoBucket.bucketName,
      },
    });

    // Lambda function for querying repository
    const queryLambda = new lambda.Function(this, 'QueryHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'handler.lambda_handler',
      layers: [gitLambdaLayer],
      timeout: Duration.minutes(5),
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/query'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_8.bundlingImage,
          command: [
            'bash', '-c', 
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
          ],
        },
      }),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: repoBucket.bucketName,
      },
    });

    // API Gateway to expose the Lambda functions
    const api = new apigateway.RestApi(this, 'AgentApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const uploadIntegration = new apigateway.LambdaIntegration(uploadLambda);
    api.root.resourceForPath('upload').addMethod('POST', uploadIntegration);

    const queryIntegration = new apigateway.LambdaIntegration(queryLambda);
    api.root.resourceForPath('query').addMethod('POST', queryIntegration);
    
    // S3 bucket for hosting the frontend
    const agentFrontendBucket = new s3.Bucket(this, 'AgentFrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Origin Access Identity for CloudFront to access the S3 bucket
    const originAccessIdentity = new OriginAccessIdentity(this, 'AgentOAI');

    // Grant read access to the OAI
    agentFrontendBucket.grantRead(originAccessIdentity)
    // CloudFront distribution for the frontend
    const distribution = new Distribution(this, 'AgentFrontendDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(agentFrontendBucket, {
          originAccessIdentity: originAccessIdentity,
        })
      },
    });

    // Deploy React app to the S3 bucket
    new BucketDeployment(this, 'AgentFrontendDeployment', {
      sources: [
        Source.asset(path.join(__dirname, '../../frontend/build')),
      ],
      destinationBucket: agentFrontendBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    new CfnOutput(this, 'AgentFrontendUrl', {
      value: distribution.distributionDomainName,
      description: 'URL of the deployed agent frontend',
    });
  }
}