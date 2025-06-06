import { App } from 'aws-cdk-lib';
import { RagContracts } from '../src';

describe('RagContracts Structure', () => {
    // Setup environment variables and create instance
    process.env.CDK_CLI_VERSION = '2.0.0';
    process.env.CDK_DEFAULT_REGION = 'us-east-1';
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    
    const app = new App();
    const ragContracts = new RagContracts(app);

    test('should initialize all RAG service builds', () => {
        expect(ragContracts.ragDocumentIngestionBuild).toBeDefined();
        expect(ragContracts.ragDocumentProcessingBuild).toBeDefined();
        expect(ragContracts.ragEmbeddingBuild).toBeDefined();
        expect(ragContracts.ragVectorStorageBuild).toBeDefined();
        expect(ragContracts.ragKnowledgeRetrievalBuild).toBeDefined();
        expect(ragContracts.ragGenerationBuild).toBeDefined();
        expect(ragContracts.userAuth).toBeDefined();
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
        expect(githubRepos.__userAuth).toBeDefined();
        expect(githubRepos.__userAuth!.name).toBe('user-auth');
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
        
        // Check user-auth service
        expect(ragContracts.userAuth!.envers).toHaveLength(1);
        expect(ragContracts.userAuth!.envers[0].targetRevision.value).toBe('odmd-rag');
    });
}); 