#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LangchainAgentCdkStack } from '../lib/langchain_agent_cdk-stack';

const app = new cdk.App();
new LangchainAgentCdkStack(app, 'LangchainAgentCdkStack');
