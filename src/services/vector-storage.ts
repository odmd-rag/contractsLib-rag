import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagEmbeddingEnver } from "./embedding";

/**
 * Vector Search API Producer (API Gateway + Lambda)
 * Provides similarity search endpoints for Knowledge Retrieval Service consumption
 */
export class VectorSearchApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'vector-search-api',      // API Gateway for similarity search
                    children: [
                        {pathPart: 'similarity-search-request-schema'},    // Schema for similarity search requests
                        {pathPart: 'similarity-search-response-schema'},   // Schema for similarity search responses
                        {pathPart: 'vector-index-request-schema'},         // Schema for vector indexing requests
                        {pathPart: 'vector-index-response-schema'},        // Schema for vector indexing responses
                        {pathPart: 'search-metadata-schema'}               // Schema for search metadata and filters
                    ]
                }
            ]
        });
    }

    /**
     * API Gateway endpoint for vector similarity search
     * This is the contract interface that Knowledge Retrieval Service consumes
     */
    public get searchApi() {
        return this.children![0]!
    }

    /**
     * Schema contract for similarity search request payloads
     * Defines the data structure for incoming search queries
     */
    public get similaritySearchRequestSchema() {
        return this.searchApi.children![0]!
    }

    /**
     * Schema contract for similarity search response payloads
     * Defines the data structure for search results and similarity scores
     */
    public get similaritySearchResponseSchema() {
        return this.searchApi.children![1]!
    }

    /**
     * Schema contract for vector indexing request payloads
     * Defines the data structure for vector storage and indexing requests
     */
    public get vectorIndexRequestSchema() {
        return this.searchApi.children![2]!
    }

    /**
     * Schema contract for vector indexing response payloads
     * Defines the data structure for indexing operation results
     */
    public get vectorIndexResponseSchema() {
        return this.searchApi.children![3]!
    }

    /**
     * Schema contract for search metadata and filtering
     * Defines the data structure for search filters, facets, and metadata
     */
    public get searchMetadataSchema() {
        return this.searchApi.children![4]!
    }
}

/**
 * RAG Vector Storage Service Enver
 */
export class RagVectorStorageEnver extends OdmdEnverCdk {
    constructor(owner: RagVectorStorageBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Subscribe to embedding events from embedding service
        const embeddingEnver = owner.contracts.ragEmbeddingBuild.dev; // Use appropriate env
        this.embeddingEventsSubscription = new OdmdCrossRefConsumer(this, 'embeddingEventsSubscription', embeddingEnver.embeddingEvents.eventBridge);
        
        // Produce vector search API for Knowledge Retrieval Service
        this.vectorSearchApi = new VectorSearchApiProducer(this, 'vector-search-api');
    }

    /**
     * EventBridge subscription to embedding events
     * Receives vector embeddings ready for storage and indexing
     */
    readonly embeddingEventsSubscription: OdmdCrossRefConsumer<RagVectorStorageEnver, OdmdEnverCdk>;
    
    /**
     * API Gateway endpoint for vector similarity search
     * Consumed by Knowledge Retrieval Service for semantic search operations
     */
    readonly vectorSearchApi: VectorSearchApiProducer;
}

/**
 * RAG Vector Storage Service Build
 */
export class RagVectorStorageBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagVectorStorageEnver>;
    get envers(): Array<RagVectorStorageEnver> {
        return this._envers;
    }

    private _dev!: RagVectorStorageEnver;
    get dev(): RagVectorStorageEnver {
        return this._dev;
    }

    private _prod!: RagVectorStorageEnver;
    get prod(): RagVectorStorageEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragVectorStorage', scope.githubRepos.ragVectorStorage);
    }

    protected initializeEnvers(): void {
        this._dev = new RagVectorStorageEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagVectorStorageEnver(this,
            this.contracts.accounts.workspace2, 'us-east-2',
            new SRC_Rev_REF('b', 'main')
        );

        this._envers = [this._dev, this._prod];
    }

    get contracts(): RagContracts {
        return super.contracts as RagContracts;
    }
} 