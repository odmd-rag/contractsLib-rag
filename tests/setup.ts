// Jest setup file for process isolation and cleanup

// Global setup for all test files
beforeAll(() => {
    // Set required environment variables for all tests
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
});

// Global cleanup after all tests in a file complete
afterAll(() => {
    // Clean up environment variables
    delete process.env.CDK_CLI_VERSION;
    delete process.env.CDK_DEFAULT_REGION;
    delete process.env.CDK_DEFAULT_ACCOUNT;
    
    // Clear any singleton instances
    try {
        const { RagContracts } = require('../src');
        (RagContracts as any)._inst = undefined;
    } catch (e) {
        // Ignore if module not loaded
    }
    
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in test process:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection in test process:', reason);
    process.exit(1);
}); 