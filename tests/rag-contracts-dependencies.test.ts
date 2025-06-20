import { App } from 'aws-cdk-lib';
import {RagContracts, RagUserAuthEnver} from '../src';

describe('RagContracts Service Dependencies', () => {
    // Setup environment variables and create instance
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    
    const app = new App();
    const ragContracts = new RagContracts(app);

    test('should have proper service communication dependencies', () => {
        // Document Processing consumes Document Ingestion events
        const docProcessingDev = ragContracts.ragDocumentProcessingBuild.dev;
        // expect(docProcessingDev.documentEventsSubscription).toBeDefined();
        
        // Embedding consumes Document Processing events
        const embeddingDev = ragContracts.ragEmbeddingBuild.dev;
        expect(embeddingDev.processedContentSubscription).toBeDefined();
        
        // Vector Storage consumes Embedding events
        const vectorStorageDev = ragContracts.ragVectorStorageBuild.dev;
        expect(vectorStorageDev.embeddingSubscription).toBeDefined();
        
        // Knowledge Retrieval (Proxy) - No Vector Storage dependency in hybrid architecture
        const knowledgeRetrievalDev = ragContracts.ragKnowledgeRetrievalBuild.dev;
        // Knowledge Retrieval is now a simple proxy to home server, no Vector Storage subscription needed
        
        // Generation service - Direct API consumption in hybrid architecture (no subscription property)
        const generationDev = ragContracts.ragGenerationBuild.dev;
        // Generation directly calls Knowledge Retrieval proxy API without explicit subscription in hybrid architecture
        
        // Document Ingestion consumes User-Auth identity provider details
        const docIngestionDev = ragContracts.ragDocumentIngestionBuild.dev;
        expect(docIngestionDev.authProviderClientId).toBeDefined();
        expect(docIngestionDev.authProviderName).toBeDefined();
        
        // Document Ingestion produces callback/logout URLs for User-Auth to consume
        expect(docIngestionDev.authCallbackUrl).toBeDefined();
        expect(docIngestionDev.logoutUrl).toBeDefined();
        
        // User-Auth consumes callback/logout URLs from services
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver;
        expect(userAuthEnver.logoutUrls.length).toBeGreaterThan(0)
        expect(userAuthEnver.callbackUrls.length).toBeGreaterThan(0)
    });

    test('should have correct producer-consumer relationships for document flow', () => {
        // Document Ingestion → Document Processing
        const docIngestion = ragContracts.ragDocumentIngestionBuild.dev;
        const docProcessing = ragContracts.ragDocumentProcessingBuild.dev;

        // Document Processing → Embedding
        const embedding = ragContracts.ragEmbeddingBuild.dev;
        
        expect(docProcessing.processedContentStorage).toBeDefined();
        expect(embedding.processedContentSubscription).toBeDefined();
        
        // Embedding → Vector Storage
        const vectorStorage = ragContracts.ragVectorStorageBuild.dev;
        
        expect(embedding.embeddingStorage).toBeDefined();
        expect(vectorStorage.embeddingSubscription).toBeDefined();
    });

    test('should have correct API consumption chain for hybrid retrieval', () => {
        // Vector Storage API exists but is not consumed by Knowledge Retrieval in hybrid architecture
        const vectorStorage = ragContracts.ragVectorStorageBuild.dev;
        const knowledgeRetrieval = ragContracts.ragKnowledgeRetrievalBuild.dev;
        
        expect(vectorStorage.vectorStorage).toBeDefined();
        // Knowledge Retrieval no longer consumes Vector Storage - it proxies directly to home server
        
        // Knowledge Retrieval Proxy API → Generation (Hybrid Architecture)
        const generation = ragContracts.ragGenerationBuild.dev;
        
        expect(knowledgeRetrieval.vectorSearchProxyApi).toBeDefined();
        // Generation service directly calls proxy API without explicit subscription in hybrid architecture
    });

    test('should have correct authentication integration', () => {
        const userAuth = ragContracts.userAuth!.envers[0] as RagUserAuthEnver;
        const docIngestion = ragContracts.ragDocumentIngestionBuild.dev;
        
        // User-Auth produces identity provider details
        expect(userAuth.idProviderName).toBeDefined();
        expect(userAuth.idProviderClientId).toBeDefined();
        
        // Document Ingestion consumes auth details
        expect(docIngestion.authProviderClientId).toBeDefined()
        expect(docIngestion.authProviderName).toBeDefined()
        
        // Document Ingestion produces callback URLs
        expect(docIngestion.authCallbackUrl).toBeDefined();
        expect(docIngestion.logoutUrl).toBeDefined();
        
        // User-Auth consumes callback URLs
        expect(userAuth.logoutUrls.length).toBeGreaterThan(0);
        expect(userAuth.callbackUrls.length).toBeGreaterThan(0);
    });
}); 