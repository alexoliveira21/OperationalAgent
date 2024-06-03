#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AgentStack } from '../lib/agent_stack';

const app = new cdk.App();
new AgentStack(app, 'AgentStack');
