import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefConsumer,
    OdmdCrossRefProducer
} from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagKnowledgeRetrievalEnver } from "./knowledge-retrieval";
import { RagUserAuthEnver } from "./user-auth";

/**
 * Generation API Producer (API Gateway + Lambda + WebUI)
 * Provides generation endpoints and web interface for user consumption
 */
export class GenerationApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'generation-api',             // API Gateway for generation
                    children: [
                        {pathPart: 'generation-request-schema'},     // Schema for generation requests
                        {pathPart: 'generation-response-schema'},    // Schema for generation responses
                        {pathPart: 'conversation-schema'},           // Schema for conversation management
                        {pathPart: 'feedback-schema'}                // Schema for response feedback
                    ]
                },
                {pathPart: 'web-ui-cloudfront-url'},       // CloudFront URL for web interface
                {pathPart: 'web-ui-s3-bucket'}             // S3 bucket for web UI assets
            ]
        });
    }

    /**
     * API Gateway endpoint for RAG generation
     * This is the main contract interface for client applications
     */
    public get generationApi() {
        return this.children![0]!
    }

    /**
     * Schema contract for generation request payloads
     * Defines the data structure for RAG generation requests
     */
    public get generationRequestSchema() {
        return this.generationApi.children![0]!
    }

    /**
     * Schema contract for generation response payloads
     * Defines the data structure for generated responses with sources
     */
    public get generationResponseSchema() {
        return this.generationApi.children![1]!
    }

    /**
     * Schema contract for conversation management
     * Defines the data structure for conversation history and context
     */
    public get conversationSchema() {
        return this.generationApi.children![2]!
    }

    /**
     * Schema contract for response feedback
     * Defines the data structure for user feedback on generated responses
     */
    public get feedbackSchema() {
        return this.generationApi.children![3]!
    }

    /**
     * CloudFront URL for web UI
     * Public URL for accessing the RAG web interface
     */
    public get webUiCloudFrontUrl() {
        return this.children![1]!
    }

    /**
     * S3 bucket for web UI assets
     * Bucket containing the compiled web application
     */
    public get webUiS3Bucket() {
        return this.children![2]!
    }
}

/**
 * RAG Generation Service Enver
 */
export class RagGenerationEnver extends OdmdEnverCdk {
    constructor(owner: RagGenerationBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Produce generation API and web UI for client consumption
        this.generationApi = new GenerationApiProducer(this, 'generation-api');
    }

    /**
     * Vector Search Proxy subscriptions
     * Consumes vector search proxy API from Knowledge Retrieval Service
     */
    vectorSearchProxySubscription!: OdmdCrossRefConsumer<RagGenerationEnver, OdmdEnverCdk>;
    healthCheckSubscription!: OdmdCrossRefConsumer<RagGenerationEnver, OdmdEnverCdk>;
    searchSchemaSubscription!: OdmdCrossRefConsumer<RagGenerationEnver, OdmdEnverCdk>;

    // Auth provider subscriptions
    authProviderClientId!: OdmdCrossRefConsumer<this, any>;
    authProviderName!: OdmdCrossRefConsumer<this, any>;

    wireConsuming() {
        // Wire consumption from knowledge retrieval service for vector search
        const ragContracts = this.owner.contracts as RagContracts;
        const knowledgeRetrievalEnver = ragContracts.ragKnowledgeRetrievalBuild.dev; // Use appropriate env
        
        this.vectorSearchProxySubscription = new OdmdCrossRefConsumer(
            this, 'vector-search-proxy-subscription',
            knowledgeRetrievalEnver.vectorSearchProxyApi.vectorSearchEndpoint, {
                defaultIfAbsent: 'default-vector-search-api',
                trigger: 'no'
            }
        );

        this.healthCheckSubscription = new OdmdCrossRefConsumer(
            this, 'health-check-subscription',
            knowledgeRetrievalEnver.vectorSearchProxyApi.healthCheckEndpoint, {
                defaultIfAbsent: 'default-health-check-api',
                trigger: 'no'
            }
        );

        this.searchSchemaSubscription = new OdmdCrossRefConsumer(
            this, 'search-schema-subscription',
            knowledgeRetrievalEnver.vectorSearchProxyApi.searchRequestSchema, {
                defaultIfAbsent: 'default-search-schema',
                trigger: 'no'
            }
        );

        // Wire consumption from user-auth service for authentication
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver
        
        this.authProviderClientId = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId, {
            defaultIfAbsent: 'default-client-id',
            trigger: 'no'
        });
        
        this.authProviderName = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName, {
            defaultIfAbsent: 'default-provider-name',
            trigger: 'no'
        });
    }
    
    /**
     * Generation API and web UI producer
     * Provides generation endpoints and web interface for client consumption
     */
    readonly generationApi: GenerationApiProducer;
}

/**
 * RAG Generation Service Build
 */
export class RagGenerationBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagGenerationEnver>;
    get envers(): Array<RagGenerationEnver> {
        return this._envers;
    }

    private _dev!: RagGenerationEnver;
    get dev(): RagGenerationEnver {
        return this._dev;
    }

    private _prod!: RagGenerationEnver;
    get prod(): RagGenerationEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragGeneration', scope.githubRepos.ragGeneration);
    }

    protected initializeEnvers(): void {
        this._dev = new RagGenerationEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagGenerationEnver(this,
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