import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";

/**
 * Context Retrieval API Producer (API Gateway + Lambda)
 * Provides context retrieval endpoints for Generation Service consumption
 */
export class ContextRetrievalApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'context-retrieval-api',      // API Gateway for context retrieval
                    children: [
                        {pathPart: 'query-understanding-request-schema'},   // Schema for query analysis requests
                        {pathPart: 'query-understanding-response-schema'},  // Schema for query analysis responses
                        {pathPart: 'context-retrieval-request-schema'},     // Schema for context retrieval requests
                        {pathPart: 'context-retrieval-response-schema'},    // Schema for context retrieval responses
                        {pathPart: 'context-ranking-schema'},               // Schema for context ranking and scoring
                        {pathPart: 'retrieval-metadata-schema'}             // Schema for retrieval metadata and filters
                    ]
                }
            ]
        });
    }

    /**
     * API Gateway endpoint for intelligent context retrieval
     * This is the contract interface that Generation Service consumes
     */
    public get contextApi() {
        return this.children![0]!
    }

    /**
     * Schema contract for query understanding request payloads
     * Defines the data structure for natural language query analysis
     */
    public get queryUnderstandingRequestSchema() {
        return this.contextApi.children![0]!
    }

    /**
     * Schema contract for query understanding response payloads
     * Defines the data structure for analyzed queries and intents
     */
    public get queryUnderstandingResponseSchema() {
        return this.contextApi.children![1]!
    }

    /**
     * Schema contract for context retrieval request payloads
     * Defines the data structure for context search requests
     */
    public get contextRetrievalRequestSchema() {
        return this.contextApi.children![2]!
    }

    /**
     * Schema contract for context retrieval response payloads
     * Defines the data structure for retrieved context and relevance scores
     */
    public get contextRetrievalResponseSchema() {
        return this.contextApi.children![3]!
    }

    /**
     * Schema contract for context ranking and scoring
     * Defines the data structure for context relevance and quality scores
     */
    public get contextRankingSchema() {
        return this.contextApi.children![4]!
    }

    /**
     * Schema contract for retrieval metadata and filtering
     * Defines the data structure for retrieval filters, sources, and metadata
     */
    public get retrievalMetadataSchema() {
        return this.contextApi.children![5]!
    }
}

/**
 * RAG Knowledge Retrieval Service Enver
 */
export class RagKnowledgeRetrievalEnver extends OdmdEnverCdk {
    constructor(owner: RagKnowledgeRetrievalBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Consume vector search API from Vector Storage Service
        const vectorStorageEnver = owner.contracts.ragVectorStorageBuild.dev; // Use appropriate env
        this.vectorSearchSubscription = new OdmdCrossRefConsumer(this, 'vectorSearchSubscription', vectorStorageEnver.vectorSearchApi.searchApi);
        
        // Produce context retrieval API for Generation Service
        this.contextRetrievalApi = new ContextRetrievalApiProducer(this, 'context-retrieval-api');
    }

    /**
     * Vector Storage search API subscription
     * Consumes similarity search capabilities from Vector Storage Service
     */
    readonly vectorSearchSubscription: OdmdCrossRefConsumer<RagKnowledgeRetrievalEnver, OdmdEnverCdk>;
    
    /**
     * API Gateway endpoint for context retrieval
     * Consumed by Generation Service for intelligent context discovery
     */
    readonly contextRetrievalApi: ContextRetrievalApiProducer;
}

/**
 * RAG Knowledge Retrieval Service Build
 */
export class RagKnowledgeRetrievalBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagKnowledgeRetrievalEnver>;
    get envers(): Array<RagKnowledgeRetrievalEnver> {
        return this._envers;
    }

    private _dev!: RagKnowledgeRetrievalEnver;
    get dev(): RagKnowledgeRetrievalEnver {
        return this._dev;
    }

    private _prod!: RagKnowledgeRetrievalEnver;
    get prod(): RagKnowledgeRetrievalEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragKnowledgeRetrieval', scope.githubRepos.ragKnowledgeRetrieval);
    }

    protected initializeEnvers(): void {
        this._dev = new RagKnowledgeRetrievalEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagKnowledgeRetrievalEnver(this,
            this.contracts.accounts.workspace2, 'us-east-2',
            new SRC_Rev_REF('b', 'main')
        );

        this._envers = [this._dev, this._prod];
    }

    get contracts(): RagContracts {
        return super.contracts as RagContracts;
    }
} 