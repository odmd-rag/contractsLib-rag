import { App } from 'aws-cdk-lib';
import { RagContracts } from '../src';
import * as packageJson from '../package.json';

describe('RagContracts', () => {
    let app: App;
    let ragContracts: RagContracts;

    beforeEach(() => {
        // Clear singleton instance before each test
        (RagContracts as any)._inst = undefined;
        
        // Set required environment variables
        process.env.CDK_CLI_VERSION = '2.0.0';
        process.env.CDK_DEFAULT_REGION = 'us-east-1';
        process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
        
        app = new App();
        ragContracts = new RagContracts(app);
    });

    afterEach(() => {
        // Clean up environment variables and singleton
        delete process.env.CDK_CLI_VERSION;
        delete process.env.CDK_DEFAULT_REGION;
        delete process.env.CDK_DEFAULT_ACCOUNT;
        (RagContracts as any)._inst = undefined;
    });

    test('should create RagContracts instance', () => {
        expect(ragContracts).toBeInstanceOf(RagContracts);
        expect(RagContracts.inst).toBe(ragContracts);
    });

    test('should be singleton', () => {
        const app2 = new App();
        expect(() => new RagContracts(app2)).toThrow('RagContracts is a singleton - not allowed to create multiple instances');
    });

    test('should initialize all RAG service builds', () => {
        expect(ragContracts.ragDocumentIngestionBuild).toBeDefined();
        expect(ragContracts.ragDocumentProcessingBuild).toBeDefined();
        expect(ragContracts.ragEmbeddingBuild).toBeDefined();
        expect(ragContracts.ragVectorStorageBuild).toBeDefined();
        expect(ragContracts.ragKnowledgeRetrievalBuild).toBeDefined();
        expect(ragContracts.ragGenerationBuild).toBeDefined();
    });

    test('should have correct GitHub repositories configuration', () => {
        const githubRepos = ragContracts.githubRepos;
        
        expect(githubRepos.ragDocumentIngestion.owner).toBe('odmd-rag');
        expect(githubRepos.ragDocumentProcessing.owner).toBe('odmd-rag');
        expect(githubRepos.ragEmbedding.owner).toBe('odmd-rag');
        expect(githubRepos.ragVectorStorage.owner).toBe('odmd-rag');
        expect(githubRepos.ragKnowledgeRetrieval.owner).toBe('odmd-rag');
        expect(githubRepos.ragGeneration.owner).toBe('odmd-rag');
        
        expect(githubRepos.ragDocumentIngestion.name).toBe('rag-document-ingestion-service');
        expect(githubRepos.ragDocumentProcessing.name).toBe('rag-document-processing-service');
        expect(githubRepos.ragEmbedding.name).toBe('rag-embedding-service');
        expect(githubRepos.ragVectorStorage.name).toBe('rag-vector-storage-service');
        expect(githubRepos.ragKnowledgeRetrieval.name).toBe('rag-knowledge-retrieval-service');
        expect(githubRepos.ragGeneration.name).toBe('rag-generation-service');
    });

    test('should have correct AWS accounts configuration', () => {
        const accounts = ragContracts.accounts;
        
        expect(accounts.central).toBe('877679826644');
        expect(accounts.workspace0).toBe('447839931803');
        expect(accounts.workspace1).toBe('366920167720');
        expect(accounts.workspace2).toBe('217471730138');

        expect(ragContracts.allAccounts).toContain('877679826644');
        expect(ragContracts.allAccounts).toContain('447839931803');
        expect(ragContracts.allAccounts).toContain('366920167720');
        expect(ragContracts.allAccounts).toContain('217471730138');
    });

    test('should have dev and prod environments for all services', () => {
        // Check document ingestion service
        expect(ragContracts.ragDocumentIngestionBuild.dev).toBeDefined();
        expect(ragContracts.ragDocumentIngestionBuild.prod).toBeDefined();
        expect(ragContracts.ragDocumentIngestionBuild.envers).toHaveLength(2);
        
        // Check document processing service
        expect(ragContracts.ragDocumentProcessingBuild.dev).toBeDefined();
        expect(ragContracts.ragDocumentProcessingBuild.prod).toBeDefined();
        expect(ragContracts.ragDocumentProcessingBuild.envers).toHaveLength(2);
        
        // Check embedding service
        expect(ragContracts.ragEmbeddingBuild.dev).toBeDefined();
        expect(ragContracts.ragEmbeddingBuild.prod).toBeDefined();
        expect(ragContracts.ragEmbeddingBuild.envers).toHaveLength(2);
        
        // Check vector storage service
        expect(ragContracts.ragVectorStorageBuild.dev).toBeDefined();
        expect(ragContracts.ragVectorStorageBuild.prod).toBeDefined();
        expect(ragContracts.ragVectorStorageBuild.envers).toHaveLength(2);
        
        // Check knowledge retrieval service
        expect(ragContracts.ragKnowledgeRetrievalBuild.dev).toBeDefined();
        expect(ragContracts.ragKnowledgeRetrievalBuild.prod).toBeDefined();
        expect(ragContracts.ragKnowledgeRetrievalBuild.envers).toHaveLength(2);
        
        // Check generation service
        expect(ragContracts.ragGenerationBuild.dev).toBeDefined();
        expect(ragContracts.ragGenerationBuild.prod).toBeDefined();
        expect(ragContracts.ragGenerationBuild.envers).toHaveLength(2);
    });

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

    test('should have proper service communication dependencies', () => {
        // Document Processing consumes Document Ingestion events
        const docProcessingDev = ragContracts.ragDocumentProcessingBuild.dev;
        expect(docProcessingDev.documentEventsSubscription).toBeDefined();
        
        // Embedding consumes Document Processing events
        const embeddingDev = ragContracts.ragEmbeddingBuild.dev;
        expect(embeddingDev.processedContentSubscription).toBeDefined();
        
        // Vector Storage consumes Embedding events
        const vectorStorageDev = ragContracts.ragVectorStorageBuild.dev;
        expect(vectorStorageDev.embeddingEventsSubscription).toBeDefined();
        
        // Knowledge Retrieval consumes Vector Storage API
        const knowledgeRetrievalDev = ragContracts.ragKnowledgeRetrievalBuild.dev;
        expect(knowledgeRetrievalDev.vectorSearchSubscription).toBeDefined();
        
        // Generation consumes Knowledge Retrieval API
        const generationDev = ragContracts.ragGenerationBuild.dev;
        expect(generationDev.contextRetrievalSubscription).toBeDefined();
    });

    test('should have packageName and pkgOrg consistent with package.json', () => {
        const buildContracts = ragContracts.contractsLibBuild;
        
        // Extract package name and organization from package.json
        const expectedPackageName = packageJson.name;
        const expectedPkgOrg = packageJson.name.split('/')[0];
        
        // Check that OdmdBuildContractsLib instance matches package.json
        expect(buildContracts.packageName).toBe(expectedPackageName);
        expect(buildContracts.pkgOrg).toBe(expectedPkgOrg);
        
        // Validate the expected values are what we expect
        expect(expectedPackageName).toBe('@odmd-rag/contracts-lib-rag');
        expect(expectedPkgOrg).toBe('@odmd-rag');
    });
}); 