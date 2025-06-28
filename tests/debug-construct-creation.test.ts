import { App } from 'aws-cdk-lib';

describe('Debug Construct Creation', () => {
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';

    test('debug individual service creation', () => {
        const app = new App();
        
        console.log('1. Creating App...');
        
        console.log('2. About to import RagContracts...');
        const { RagContracts } = require('../src');
        
        console.log('3. About to create RagContracts...');
        
        const ragContracts = new RagContracts(app);
        
        console.log('4. RagContracts created successfully');
        expect(ragContracts).toBeDefined();
    });
}); 