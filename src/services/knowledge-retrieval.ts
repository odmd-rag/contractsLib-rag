import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefConsumer,
    OdmdCrossRefProducer,
    OdmdEnverUserAuth
} from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagUserAuthEnver } from "./user-auth";

/**
 * Vector Search Proxy API Producer (API Gateway + Lambda)
 * Provides vector search proxy endpoints that forward to home server
 */
export class VectorSearchProxyApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'vector-search-proxy-api',    // API Gateway for vector search proxy
                    children: [
                        {pathPart: 'vector-search-endpoint'},       // Main vector search endpoint
                        {pathPart: 'health-check-endpoint'},        // Health check endpoint
                        {pathPart: 'search-request-schema'},        // Schema for search requests
                        {pathPart: 'search-response-schema'},       // Schema for search responses
                        {pathPart: 'home-server-config'}            // Home server configuration
                    ]
                }
            ]
        });
    }

    /**
     * API Gateway endpoint for vector search proxy
     * This is the contract interface that Generation Service consumes
     */
    public get proxyApi() {
        return this.children![0]!
    }

    /**
     * Vector search endpoint for RAG queries
     * Forwards authenticated requests to home server
     */
    public get vectorSearchEndpoint() {
        return this.proxyApi.children![0]!
    }

    /**
     * Health check endpoint for monitoring
     * Checks both proxy and home server health
     */
    public get healthCheckEndpoint() {
        return this.proxyApi.children![1]!
    }

    /**
     * Schema contract for vector search request payloads
     * Defines the data structure for vector search requests
     */
    public get searchRequestSchema() {
        return this.proxyApi.children![2]!
    }

    /**
     * Schema contract for vector search response payloads
     * Defines the data structure for search results with metadata
     */
    public get searchResponseSchema() {
        return this.proxyApi.children![3]!
    }

    /**
     * Home server configuration contract
     * Defines the endpoint and authentication configuration for home server
     */
    public get homeServerConfig() {
        return this.proxyApi.children![4]!
    }
}

/**
 * RAG Knowledge Retrieval Service Enver (Hybrid Architecture)
 * Implements proxy service that forwards to home vector server
 */
export class RagKnowledgeRetrievalEnver extends OdmdEnverCdk {
    constructor(
        owner: RagKnowledgeRetrievalBuild, 
        targetAWSAccountID: string, 
        targetAWSRegion: string, 
        targetRevision: SRC_Rev_REF
    ) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Produce vector search proxy API for Generation Service
        this.vectorSearchProxyApi = new VectorSearchProxyApiProducer(this, 'vector-search-proxy-api');
    }

    // Auth provider subscriptions
    authProviderClientId!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    authProviderName!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    
    // Home server domain from user-auth service
    homeServerDomain!: OdmdCrossRefConsumer<this, RagUserAuthEnver>;

    wireConsuming() {
        // Wire consumption from user-auth service for authentication
        const ragContracts = this.owner.contracts as RagContracts;
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver
        
        this.authProviderClientId = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId, {
            defaultIfAbsent: 'default-client-id',
                trigger: 'no'
        });

        this.authProviderName = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName, {
            defaultIfAbsent: 'default-provider-name',
                trigger: 'no'
        });
        
        this.homeServerDomain = new OdmdCrossRefConsumer(this, userAuthEnver.homeServerDomainName.node.id, userAuthEnver.homeServerDomainName, {
            defaultIfAbsent: 'https://localhost:3000',
            trigger: 'no'
        });
    }
    
    /**
     * Vector Search Proxy API producer
     * Provides vector search endpoints that forward to home server
     */
    readonly vectorSearchProxyApi: VectorSearchProxyApiProducer;
    
    /**
     * Get the home vector server endpoint for this environment
     * Note: This will be available via homeServerDomain.getSharedValue() in CDK stack
     */
    getHomeVectorEndpoint(): string {
        // This method is deprecated - use homeServerDomain.getSharedValue() instead
        return 'https://localhost:3000';
    }
}

/**
 * RAG Knowledge Retrieval Service Build (Hybrid Architecture)
 * Manages proxy services that forward vector searches to home servers
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
        super(scope, 'ragRetr', scope.githubRepos.ragKnowledgeRetrieval);
    }

    protected initializeEnvers(): void {
        // Development environment - home server domain from user-auth contract
        this._dev = new RagKnowledgeRetrievalEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        // Production environment - home server domain from user-auth contract
        this._prod = new RagKnowledgeRetrievalEnver(this,
            this.contracts.accounts.workspace2, 'us-east-2',
            new SRC_Rev_REF('b', 'main')
        );

        this._envers = [this._dev, this._prod];
    }

    get contracts(): RagContracts {
        return super.contracts as RagContracts;
    }

    wireConsuming() {
        this.envers.forEach(e => e.wireConsuming());
    }
} 