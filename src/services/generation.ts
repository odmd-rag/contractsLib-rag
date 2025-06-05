import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefConsumer,
    OdmdCrossRefProducer
} from "@ondemandenv/contracts-lib-base";
import type {RagContracts} from "../rag-contracts";

/**
 * Response Generation API Producer (API Gateway + Lambda)
 * Provides AI response generation endpoints for user interfaces and applications
 */
export class ResponseGenerationApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'response-generation-api',      // API Gateway for AI response generation
                    children: [
                        {pathPart: 'chat-completion-request-schema'},       // Schema for chat completion requests
                        {pathPart: 'chat-completion-response-schema'},      // Schema for chat completion responses
                        {pathPart: 'streaming-response-schema'},            // Schema for streaming response chunks
                        {pathPart: 'generation-config-schema'},             // Schema for generation configuration
                        {pathPart: 'prompt-template-schema'},               // Schema for prompt templates and context injection
                        {pathPart: 'generation-metrics-schema'}             // Schema for generation performance metrics
                    ]
                }
            ]
        });
    }

    /**
     * API Gateway endpoint for AI-powered response generation
     * This is the contract interface that user interfaces and applications consume
     */
    public get generationApi() {
        return this.children![0]!
    }

    /**
     * Schema contract for chat completion request payloads
     * Defines the data structure for natural language generation requests
     */
    public get chatCompletionRequestSchema() {
        return this.generationApi.children![0]!
    }

    /**
     * Schema contract for chat completion response payloads
     * Defines the data structure for generated responses and metadata
     */
    public get chatCompletionResponseSchema() {
        return this.generationApi.children![1]!
    }

    /**
     * Schema contract for streaming response chunks
     * Defines the data structure for real-time streaming responses
     */
    public get streamingResponseSchema() {
        return this.generationApi.children![2]!
    }

    /**
     * Schema contract for generation configuration
     * Defines the data structure for LLM parameters and generation settings
     */
    public get generationConfigSchema() {
        return this.generationApi.children![3]!
    }

    /**
     * Schema contract for prompt templates and context injection
     * Defines the data structure for prompt engineering and context formatting
     */
    public get promptTemplateSchema() {
        return this.generationApi.children![4]!
    }

    /**
     * Schema contract for generation performance metrics
     * Defines the data structure for generation timing and quality metrics
     */
    public get generationMetricsSchema() {
        return this.generationApi.children![5]!
    }
}

/**
 * RAG Generation Service Enver
 */
export class RagGenerationEnver extends OdmdEnverCdk {
    constructor(owner: RagGenerationBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        // Consume context retrieval API from Knowledge Retrieval Service
        const knowledgeRetrievalEnver = owner.contracts.ragKnowledgeRetrievalBuild.dev; // Use appropriate env
        this.contextRetrievalSubscription = new OdmdCrossRefConsumer(this, 'contextRetrievalSubscription', knowledgeRetrievalEnver.contextRetrievalApi.contextApi);

        // Produce response generation API for user interfaces and applications
        this.responseGenerationApi = new ResponseGenerationApiProducer(this, 'response-generation-api');
    }

    /**
     * Knowledge Retrieval context API subscription
     * Consumes intelligent context curation from Knowledge Retrieval Service
     */
    readonly contextRetrievalSubscription: OdmdCrossRefConsumer<RagGenerationEnver, OdmdEnverCdk>;

    /**
     * API Gateway endpoint for AI response generation
     * Consumed by user interfaces and applications for natural language responses
     */
    readonly responseGenerationApi: ResponseGenerationApiProducer;
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
} 