import { RagContracts } from '../src';

// Mock AWS CDK to avoid construct conflicts
jest.mock('aws-cdk-lib', () => {
    return {
        App: jest.fn().mockImplementation(() => ({
            node: {
                id: 'MockedApp',
                scope: undefined,
                children: [],
                metadata: []
            }
        }))
    };
});

// Mock OndemandEnv base classes to avoid construct creation
jest.mock('@ondemandenv/contracts-lib-base', () => {
    const actualBase = jest.requireActual('@ondemandenv/contracts-lib-base');
    return {
        ...actualBase,
        OndemandContracts: class MockOndemandContracts {
            constructor(app: any, name: string) {
                this.app = app;
                this.contractsName = name;
                this.node = {
                    id: name,
                    scope: undefined,
                    children: [],
                    metadata: []
                };
                this.odmdBuilds = [];
            }
            app: any;
            contractsName: string;
            node: any;
            odmdBuilds: any[];
            get scope() { return undefined; }
        },
        OdmdBuild: class MockOdmdBuild {
            constructor(scope: any, name: string, repo?: any) {
                this.scope = scope;
                this.buildName = name;
                this.repo = repo;
                this.node = {
                    id: name,
                    scope: scope,
                    children: [],
                    metadata: []
                };
                // Add to parent's builds if applicable
                if (scope && scope.odmdBuilds) {
                    scope.odmdBuilds.push(this);
                }
            }
            scope: any;
            buildName: string;
            repo: any;
            node: any;
        },
        OdmdEnverCdk: class MockOdmdEnverCdk {
            constructor(owner: any, accountId: string, region: string, revision: any) {
                this.owner = owner;
                this.targetAWSAccountID = accountId;
                this.targetAWSRegion = region;
                this.targetRevision = revision;
                this.node = {
                    id: `${revision.branch}..${revision.tag}`,
                    scope: owner,
                    children: [],
                    metadata: []
                };
            }
            owner: any;
            targetAWSAccountID: string;
            targetAWSRegion: string;
            targetRevision: any;
            node: any;
        },
        OdmdCrossRefProducer: class MockOdmdCrossRefProducer {
            constructor(owner: any, name: string) {
                this.owner = owner;
                this.name = name;
                this.node = {
                    id: name,
                    scope: owner,
                    children: [],
                    metadata: []
                };
            }
            owner: any;
            name: string;
            node: any;
        },
        OdmdCrossRefConsumer: class MockOdmdCrossRefConsumer {
            constructor(owner: any, name: string, producer: any) {
                this.owner = owner;
                this.name = name;
                this.producer = producer;
                this.node = {
                    id: name,
                    scope: owner,
                    children: [],
                    metadata: []
                };
            }
            owner: any;
            name: string;
            producer: any;
            node: any;
        },
        OdmdBuildNetworking: class MockOdmdBuildNetworking {
            constructor(scope: any) {
                this.scope = scope;
                this.node = {
                    id: 'networking',
                    scope: scope,
                    children: [],
                    metadata: []
                };
            }
            scope: any;
            node: any;
        },
        SRC_Rev_REF: class MockSRC_Rev_REF {
            constructor(branch: string, tag: string) {
                this.branch = branch;
                this.tag = tag;
            }
            branch: string;
            tag: string;
        }
    };
});

describe('RagContracts Singleton (With Mocks)', () => {
    // Setup environment variables
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';

    beforeEach(() => {
        // Clear singleton state
        (RagContracts as any)._inst = undefined;
    });

    afterEach(() => {
        // Clean up singleton
        (RagContracts as any)._inst = undefined;
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    test('should create RagContracts instance with mocked CDK', () => {
        const { App } = require('aws-cdk-lib');
        const app = new App();
        
        const ragContracts = new RagContracts(app);
        
        expect(ragContracts).toBeInstanceOf(RagContracts);
        expect(RagContracts.inst).toBe(ragContracts);
        expect((ragContracts as any).contractsName).toBe('RagContracts');
    });

    test('should enforce singleton pattern', () => {
        const { App } = require('aws-cdk-lib');
        const app1 = new App();
        const app2 = new App();
        
        const ragContracts1 = new RagContracts(app1);
        
        expect(() => new RagContracts(app2)).toThrow('RagContracts is a singleton - not allowed to create multiple instances');
        expect(RagContracts.inst).toBe(ragContracts1);
    });

    test('should have all required service builds', () => {
        const { App } = require('aws-cdk-lib');
        const app = new App();
        
        const ragContracts = new RagContracts(app);
        
        expect(ragContracts.ragDocumentIngestionBuild).toBeDefined();
        expect(ragContracts.ragDocumentProcessingBuild).toBeDefined();
        expect(ragContracts.ragEmbeddingBuild).toBeDefined();
        expect(ragContracts.ragVectorStorageBuild).toBeDefined();
        expect(ragContracts.ragKnowledgeRetrievalBuild).toBeDefined();
        expect(ragContracts.ragGenerationBuild).toBeDefined();
        expect(ragContracts.ragUserAuthBuild).toBeDefined();
    });

    test('should initialize accounts configuration', () => {
        const { App } = require('aws-cdk-lib');
        const app = new App();
        
        const ragContracts = new RagContracts(app);
        
        expect(ragContracts.accounts).toBeDefined();
        expect(ragContracts.accounts.central).toBe('877679826644');
        expect(ragContracts.accounts.workspace1).toBe('366920167720');
        expect(ragContracts.accounts.workspace2).toBe('217471730138');
    });

    test('should initialize github repos configuration', () => {
        const { App } = require('aws-cdk-lib');
        const app = new App();
        
        const ragContracts = new RagContracts(app);
        
        expect(ragContracts.githubRepos).toBeDefined();
        expect(ragContracts.githubRepos.githubAppId).toBe('1351746');
        expect(ragContracts.githubRepos.ragDocumentIngestion.name).toBe('rag-document-ingestion-service');
        expect(ragContracts.githubRepos.__userAuth?.name).toBe('user-auth');
    });

    test('should call wireConsuming on service builds without errors', () => {
        const { App } = require('aws-cdk-lib');
        const app = new App();
        
        const ragContracts = new RagContracts(app);
        
        // These should not throw with mocked dependencies
        expect(() => ragContracts.ragUserAuthBuild.wireConsuming()).not.toThrow();
        expect(() => ragContracts.ragDocumentIngestionBuild.wireConsuming()).not.toThrow();
    });
}); 