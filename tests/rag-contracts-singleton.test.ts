import { App } from 'aws-cdk-lib';
import { RagContracts } from '../src';

describe('RagContracts Singleton', () => {
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';

    beforeEach(() => {
        (RagContracts as any)._inst = undefined;
        
        if (global.gc) {
            global.gc();
        }
    });

    afterEach(() => {
        (RagContracts as any)._inst = undefined;
        
        if (global.gc) {
            global.gc();
        }
    });

    test('should check singleton behavior without CDK instantiation', () => {
        expect(RagContracts.inst).toBeUndefined();
    });

    

    test('should create RagContracts instance', () => {
        const app = new App({
            context: {
                'test-run': Date.now().toString()
            }
        });
        
        const ragContracts = new RagContracts(app);
        app.synth()
        
        expect(ragContracts).toBeInstanceOf(RagContracts);
        expect(RagContracts.inst).toBe(ragContracts);
    });
    test('should be singleton', () => {
        const app1 = new App();
        const ragContracts1 = new RagContracts(app1);
        
        const app2 = new App();
        expect(() => new RagContracts(app2)).toThrow('RagContracts is a singleton - not allowed to create multiple instances');
        
        expect(RagContracts.inst).toBe(ragContracts1);
    });
}); 