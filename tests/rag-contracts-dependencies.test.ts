import { App } from 'aws-cdk-lib';
import {RagContracts, RagUserAuthEnver} from '../src';

describe('RagContracts Service Dependencies', () => {
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    
    const app = new App();
    const ragContracts = new RagContracts(app);

    test('should have proper service communication dependencies', () => {
        const docProcessingDev = ragContracts.ragDocumentProcessingBuild.dev;
        
        const embeddingDev = ragContracts.ragEmbeddingBuild.dev;
        expect(embeddingDev.processedContentSubscription).toBeDefined();
        
        const vectorStorageDev = ragContracts.ragVectorStorageBuild.dev;
        expect(vectorStorageDev.embeddingSubscription).toBeDefined();
        
        const knowledgeRetrievalDev = ragContracts.ragKnowledgeRetrievalBuild.dev;
        
        const generationDev = ragContracts.ragGenerationBuild.dev;
        
        const docIngestionDev = ragContracts.ragDocumentIngestionBuild.dev;
        expect(docIngestionDev.authProviderClientId).toBeDefined();
        expect(docIngestionDev.authProviderName).toBeDefined();
        
        expect(docIngestionDev.authCallbackUrl).toBeDefined();
        expect(docIngestionDev.logoutUrl).toBeDefined();
        
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver;
        expect(userAuthEnver.logoutUrls.length).toBeGreaterThan(0)
        expect(userAuthEnver.callbackUrls.length).toBeGreaterThan(0)
    });

    test('should have correct producer-consumer relationships for document flow', () => {
        const docIngestion = ragContracts.ragDocumentIngestionBuild.dev;
        const docProcessing = ragContracts.ragDocumentProcessingBuild.dev;

        const embedding = ragContracts.ragEmbeddingBuild.dev;
        
        expect(docProcessing.processedContentStorage).toBeDefined();
        expect(embedding.processedContentSubscription).toBeDefined();
        
        const vectorStorage = ragContracts.ragVectorStorageBuild.dev;
        
        expect(embedding.embeddingStorage).toBeDefined();
        expect(vectorStorage.embeddingSubscription).toBeDefined();
    });

    test('should have correct API consumption chain for hybrid retrieval', () => {
        const vectorStorage = ragContracts.ragVectorStorageBuild.dev;
        const knowledgeRetrieval = ragContracts.ragKnowledgeRetrievalBuild.dev;
        
        expect(vectorStorage.vectorStorage).toBeDefined();
        
        const generation = ragContracts.ragGenerationBuild.dev;
        
        expect(knowledgeRetrieval.vectorSearchProxyApi).toBeDefined();
    });

    test('should have correct authentication integration', () => {
        const userAuth = ragContracts.userAuth!.envers[0] as RagUserAuthEnver;
        const docIngestion = ragContracts.ragDocumentIngestionBuild.dev;
        
        expect(userAuth.idProviderName).toBeDefined();
        expect(userAuth.idProviderClientId).toBeDefined();
        
        expect(docIngestion.authProviderClientId).toBeDefined()
        expect(docIngestion.authProviderName).toBeDefined()
        
        expect(docIngestion.authCallbackUrl).toBeDefined();
        expect(docIngestion.logoutUrl).toBeDefined();
        
        expect(userAuth.logoutUrls.length).toBeGreaterThan(0);
        expect(userAuth.callbackUrls.length).toBeGreaterThan(0);
    });
}); 