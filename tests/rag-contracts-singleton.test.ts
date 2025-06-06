import { App } from 'aws-cdk-lib';
import { RagContracts } from '../src';

describe('RagContracts Singleton', () => {
    // Setup environment variables
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';

    beforeEach(() => {
        // Clear any existing singleton state completely
        (RagContracts as any)._inst = undefined;
        
        // Clear global CDK state if possible
        if (global.gc) {
            global.gc();
        }
    });

    afterEach(() => {
        // Nuclear cleanup
        (RagContracts as any)._inst = undefined;
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
    });

    test('should check singleton behavior without CDK instantiation', () => {
        // Test that singleton getter returns undefined when no instance exists
        expect(RagContracts.inst).toBeUndefined();
    });

    // Commented out actual CDK instantiation test due to construct name conflicts
    // This demonstrates the singleton concept without triggering CDK conflicts
    

    test('should create RagContracts instance', () => {
        const app = new App({
            context: {
                'test-run': Date.now().toString() // Unique per test run
            }
        });
        
        const ragContracts = new RagContracts(app);
        
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