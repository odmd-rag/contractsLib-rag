module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Process isolation settings
    maxWorkers: 1,                    // Force sequential execution in separate workers
    workerIdleMemoryLimit: '512MB',   // Force worker restart between files
    
    // Module and mock isolation
    clearMocks: true,                 // Clear mocks between tests
    resetModules: true,               // Reset module registry between tests  
    restoreMocks: true,               // Restore mocks between tests
    
    // Force Jest to exit cleanly
    forceExit: true,                  // Force exit after tests complete
    detectOpenHandles: true,          // Detect handles that prevent Jest from exiting
    
    // File patterns
    testMatch: [
        '<rootDir>/tests/**/*.test.ts'
    ],
    
    // TypeScript support
    preset: 'ts-jest',
    
    // Coverage settings
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts'
    ],
    
    // Timeout settings
    testTimeout: 30000,               // 30 second timeout per test
    
    // Verbose output for debugging
    verbose: true,
    
    // Setup and teardown
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}; 