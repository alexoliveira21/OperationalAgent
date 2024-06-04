#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AgentStack } from '../lib/agent_stack';

const app = new App();
new AgentStack(app, 'AgentStack');
