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

    test('should have schema contracts for document processing events and streams', () => {
        const docProcessingDev = ragContracts.ragDocumentProcessingBuild.dev;
        
        // Check processed content events
        const eventProducer = docProcessingDev.processedContentStorage;
        expect(eventProducer.processedContentBucket).toBeDefined();
        expect(eventProducer.processedContentBucket).toBeDefined();
    });

    test('should have schema contracts for embedding events', () => {
        const embeddingDev = ragContracts.ragEmbeddingBuild.dev;
        const eventProducer = embeddingDev.embeddingStorage;
        
        // Check EventBridge bus endpoint
        expect(eventProducer.embeddingsBucket).toBeDefined();
        expect(eventProducer.embeddingStatusBucket).toBeDefined();

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

    test('should have schema contracts for knowledge retrieval API', () => {
        const knowledgeRetrievalDev = ragContracts.ragKnowledgeRetrievalBuild.dev;
        const apiProducer = knowledgeRetrievalDev.contextRetrievalApi;
        
        // Check API Gateway endpoint
        expect(apiProducer.contextApi).toBeDefined();
        
        // Check schema contracts
        expect(apiProducer.queryUnderstandingRequestSchema).toBeDefined();
        expect(apiProducer.queryUnderstandingResponseSchema).toBeDefined();
        expect(apiProducer.contextRetrievalRequestSchema).toBeDefined();
        expect(apiProducer.contextRetrievalResponseSchema).toBeDefined();
        expect(apiProducer.contextRankingSchema).toBeDefined();
        expect(apiProducer.retrievalMetadataSchema).toBeDefined();
    });

    test('should have schema contracts for response generation API', () => {
        const generationDev = ragContracts.ragGenerationBuild.dev;
        const apiProducer = generationDev.responseGenerationApi;
        
        // Check API Gateway endpoint
        expect(apiProducer.generationApi).toBeDefined();
        
        // Check schema contracts
        expect(apiProducer.chatCompletionRequestSchema).toBeDefined();
        expect(apiProducer.chatCompletionResponseSchema).toBeDefined();
        expect(apiProducer.streamingResponseSchema).toBeDefined();
        expect(apiProducer.generationConfigSchema).toBeDefined();
        expect(apiProducer.promptTemplateSchema).toBeDefined();
        expect(apiProducer.generationMetricsSchema).toBeDefined();
    });
}); 