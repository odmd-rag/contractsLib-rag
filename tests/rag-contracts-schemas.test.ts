import { App } from 'aws-cdk-lib';
import { RagContracts } from '../src';

describe('RagContracts Schema Contracts', () => {
    // Setup environment variables and create instance
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    
    const app = new App();
    const ragContracts = new RagContracts(app);

    test('should have schema contracts for document ingestion events', () => {
        const docIngestionDev = ragContracts.ragDocumentIngestionBuild.dev;
        const eventProducer = docIngestionDev.documentValidationEvents;
        
        // Check EventBridge bus endpoint
        expect(eventProducer.eventBridge).toBeDefined();
        
        // Check schema contracts
        expect(eventProducer.documentValidatedSchema).toBeDefined();
        expect(eventProducer.documentRejectedSchema).toBeDefined();
        expect(eventProducer.documentQuarantinedSchema).toBeDefined();
    });

    test('should have schema contracts for user-auth identity provider', () => {
        const userAuthEnver = ragContracts.userAuth!.envers[0] as any;
        
        // Check identity provider producers
        expect(userAuthEnver.idProviderName).toBeDefined();
        expect(userAuthEnver.idProviderClientId).toBeDefined();
        expect(userAuthEnver.idProviderClientSecret).toBeDefined();
        
        // Check user pool producers
        expect(userAuthEnver.userPoolId).toBeDefined();
        expect(userAuthEnver.userPoolClientId).toBeDefined();
        expect(userAuthEnver.userPoolDomain).toBeDefined();
        
        // Check authentication endpoints
        expect(userAuthEnver.loginUrl).toBeDefined();
        expect(userAuthEnver.logoutUrl).toBeDefined();
        expect(userAuthEnver.signupUrl).toBeDefined();
    });

    test('should have schema contracts for document processing events and streams', () => {
        const docProcessingDev = ragContracts.ragDocumentProcessingBuild.dev;
        
        // Check processed content events
        const eventProducer = docProcessingDev.processedContentEvents;
        expect(eventProducer.eventBridge).toBeDefined();
        expect(eventProducer.contentExtractedSchema).toBeDefined();
        expect(eventProducer.contentChunkedSchema).toBeDefined();
        expect(eventProducer.processingFailedSchema).toBeDefined();
        expect(eventProducer.processingMetricsSchema).toBeDefined();
        
        // Check Kinesis streams and their schemas
        const streamsProducer = docProcessingDev.processingStreams;
        
        // Main processing stream
        expect(streamsProducer.mainProcessingStream).toBeDefined();
        expect(streamsProducer.mainDocumentRecordSchema).toBeDefined();
        expect(streamsProducer.mainProcessingResultSchema).toBeDefined();
        
        // Priority processing stream
        expect(streamsProducer.priorityProcessingStream).toBeDefined();
        expect(streamsProducer.priorityDocumentRecordSchema).toBeDefined();
        expect(streamsProducer.slaTrackingSchema).toBeDefined();
        
        // Batch processing stream
        expect(streamsProducer.batchProcessingStream).toBeDefined();
        expect(streamsProducer.batchJobRecordSchema).toBeDefined();
        expect(streamsProducer.batchProgressSchema).toBeDefined();
        
        // DLQ stream
        expect(streamsProducer.dlqStream).toBeDefined();
        expect(streamsProducer.failedRecordSchema).toBeDefined();
        expect(streamsProducer.errorContextSchema).toBeDefined();
        
        // Metrics stream
        expect(streamsProducer.metricsStream).toBeDefined();
        expect(streamsProducer.performanceMetricsSchema).toBeDefined();
        expect(streamsProducer.resourceUsageSchema).toBeDefined();
    });

    test('should have schema contracts for embedding events', () => {
        const embeddingDev = ragContracts.ragEmbeddingBuild.dev;
        const eventProducer = embeddingDev.embeddingEvents;
        
        // Check EventBridge bus endpoint
        expect(eventProducer.eventBridge).toBeDefined();
        
        // Check schema contracts
        expect(eventProducer.embeddingsGeneratedSchema).toBeDefined();
        expect(eventProducer.embeddingFailedSchema).toBeDefined();
        expect(eventProducer.batchEmbeddingsSchema).toBeDefined();
        expect(eventProducer.embeddingMetricsSchema).toBeDefined();
    });

    test('should have schema contracts for vector storage API', () => {
        const vectorStorageDev = ragContracts.ragVectorStorageBuild.dev;
        const apiProducer = vectorStorageDev.vectorSearchApi;
        
        // Check API Gateway endpoint
        expect(apiProducer.searchApi).toBeDefined();
        
        // Check schema contracts
        expect(apiProducer.similaritySearchRequestSchema).toBeDefined();
        expect(apiProducer.similaritySearchResponseSchema).toBeDefined();
        expect(apiProducer.vectorIndexRequestSchema).toBeDefined();
        expect(apiProducer.vectorIndexResponseSchema).toBeDefined();
        expect(apiProducer.searchMetadataSchema).toBeDefined();
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