import { Stack, StackProps, RemovalPolicy, aws_cloudfront_origins, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CfnIndex } from 'aws-cdk-lib/aws-kendra';
import { CloudFrontWebDistribution, Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import path from 'path';

export class AgentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket for storing repository data
    const bucket = new s3.Bucket(this, 'AgentBucket', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // IAM role for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
      ]
    });

    // Lambda function for processing requests
    const agentLambda = new lambda.Function(this, 'AgentHandler', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole
    });

    // API Gateway to expose the Lambda function
    new apigateway.LambdaRestApi(this, 'AgentApi', {
      handler: agentLambda,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    }).root.addMethod('POST');

    // S3 bucket for hosting the frontent
    const agentFrontendBucket = new s3.Bucket(this, 'AgentFrontendBucket', {
      websiteIndexDocument: 'index.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // Origin Access identity for cloudfront to access s3 bucket
    const originAccessIdentity = new OriginAccessIdentity(this, 'AgentOAI');

    // Grant read access to the OIA identity 
    agentFrontendBucket.grantRead(originAccessIdentity);

    // CloudFront distribution for the frontend
    const distribution = new Distribution(this, 'AgentFrontentDistribution', {
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(agentFrontendBucket, {
          originAccessIdentity: originAccessIdentity
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      }
    });

    // Deploy React app to the s3 bucket
    new BucketDeployment(this, 'AgentFrontendDeployment', {
      sources: [
        Source.asset(path.join(__dirname, '../../frontend/build'))
      ],
      destinationBucket: agentFrontendBucket,
      distribution: distribution,
      distributionPaths: ['/*']
    });

    new CfnOutput(this, 'AgentFrontendUrl', {
      value: distribution.distributionDomainName,
      description: 'URL of the deployed agent frontend'
    });

  }
}
