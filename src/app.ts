#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { RagContracts } from './rag-contracts';

const app = new App();
new RagContracts(app);