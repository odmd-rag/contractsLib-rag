import { App } from 'aws-cdk-lib';
import {RagContracts, RagUserAuthEnver} from '../src';

describe('RagContracts Schema Contracts', () => {
    // Setup environment variables and create instance
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    
    const app = new App();
    const ragContracts = new RagContracts(app);

    test('should have schema contracts for user-auth identity provider', () => {
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver;
        
        // Check identity provider producers
        expect(userAuthEnver.idProviderName).toBeDefined();
        expect(userAuthEnver.idProviderClientId).toBeDefined();
    });

    test('should have schema contracts for document processing with status-in-metadata', () => {
        const docProcessingDev = ragContracts.ragDocumentProcessingBuild.dev;
        
        // Check processed content storage with metadata status
        const eventProducer = docProcessingDev.processedContentStorage;
        expect(eventProducer.processedContentBucket).toBeDefined();
        
        // Status tracking now embedded in S3 object metadata
        // No separate status bucket - status in processedContentBucket metadata
    });

    test('should have schema contracts for embedding with status-in-metadata', () => {
        const embeddingDev = ragContracts.ragEmbeddingBuild.dev;
        const eventProducer = embeddingDev.embeddingStorage;
        
        // Check embeddings bucket with metadata status
        expect(eventProducer.embeddingsBucket).toBeDefined();
        
        // Status tracking now embedded in S3 object metadata
        // No separate embeddingStatusBucket - status in embeddingsBucket metadata
    });

    test('should have schema contracts for vector storage API', () => {
        const vectorStorageDev = ragContracts.ragVectorStorageBuild.dev;
        const apiProducer = vectorStorageDev.vectorStorage;
        
        // Check API Gateway endpoint
        expect(apiProducer.vectorDatabaseEndpoint).toBeDefined();
        
        // Check schema contracts
        expect(apiProducer.vectorBackupBucket).toBeDefined();
        expect(apiProducer.vectorIndexName).toBeDefined();
        expect(apiProducer.vectorBackupBucket).toBeDefined();
        expect(apiProducer.vectorMetadataBucket).toBeDefined();
    });

    test('should have schema contracts for vector search proxy API (hybrid architecture)', () => {
        const knowledgeRetrievalDev = ragContracts.ragKnowledgeRetrievalBuild.dev;
        const apiProducer = knowledgeRetrievalDev.vectorSearchProxyApi;
        
        // Check API Gateway endpoint
        expect(apiProducer.proxyApi).toBeDefined();
        
        // Check schema contracts for hybrid proxy architecture
        expect(apiProducer.vectorSearchEndpoint).toBeDefined();
        expect(apiProducer.healthCheckEndpoint).toBeDefined();
        expect(apiProducer.searchRequestSchema).toBeDefined();
        expect(apiProducer.searchResponseSchema).toBeDefined();
        expect(apiProducer.homeServerConfig).toBeDefined();
    });

    test('should have schema contracts for generation API', () => {
        const generationDev = ragContracts.ragGenerationBuild.dev;
        const apiProducer = generationDev.generationApi;
        
        // Check API Gateway endpoint  
        expect(apiProducer.generationApi).toBeDefined();
        
        // Check schema contracts for generation service
        expect(apiProducer.generationRequestSchema).toBeDefined();
        expect(apiProducer.generationResponseSchema).toBeDefined();
        expect(apiProducer.conversationSchema).toBeDefined();
        expect(apiProducer.feedbackSchema).toBeDefined();
        
        // Check web UI components
        expect(apiProducer.webUiCloudFrontUrl).toBeDefined();
        expect(apiProducer.webUiS3Bucket).toBeDefined();
    });
}); 