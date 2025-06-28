
beforeAll(() => {
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
});

afterAll(() => {
    delete process.env.CDK_CLI_VERSION;
    delete process.env.CDK_DEFAULT_REGION;
    delete process.env.CDK_DEFAULT_ACCOUNT;
    
    try {
        const { RagContracts } = require('../src');
        (RagContracts as any)._inst = undefined;
    } catch (e) {
    }
    
    if (global.gc) {
        global.gc();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in test process:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection in test process:', reason);
    process.exit(1);
}); 