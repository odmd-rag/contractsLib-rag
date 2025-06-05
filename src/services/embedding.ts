import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefConsumer,
    OdmdCrossRefProducer
} from "@ondemandenv/contracts-lib-base";
import type {RagContracts} from "../rag-contracts";
import {RagDocumentProcessingEnver} from "./document-processing";

/**
 * Embedding Events Producer (EventBridge)
 * Publishes "Embeddings Generated" events for vector storage service consumption
 */
export class EmbeddingEventsProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'embedding-events-bus',      // EventBridge bus for embedding events
                    children: [
                        {pathPart: 'embeddings-generated-event-schema'},   // Schema for successful embedding generation
                        {pathPart: 'embedding-failed-event-schema'},       // Schema for embedding generation failures
                        {pathPart: 'batch-embeddings-event-schema'},       // Schema for batch embedding completion
                        {pathPart: 'embedding-metrics-event-schema'}       // Schema for embedding performance metrics
                    ]
                }
            ]
        });
    }

    /**
     * EventBridge custom bus for embedding events
     * This is the contract interface that vector storage service subscribes to
     */
    public get eventBridge() {
        return this.children![0]!
    }

    /**
     * Schema contract for successful embedding generation events
     * Defines the data structure for generated vector embeddings
     */
    public get embeddingsGeneratedSchema() {
        return this.eventBridge.children![0]!
    }

    /**
     * Schema contract for embedding generation failure events
     * Defines the data structure for embedding errors and retry information
     */
    public get embeddingFailedSchema() {
        return this.eventBridge.children![1]!
    }

    /**
     * Schema contract for batch embedding completion events
     * Defines the data structure for batch embedding job results
     */
    public get batchEmbeddingsSchema() {
        return this.eventBridge.children![2]!
    }

    /**
     * Schema contract for embedding performance metrics events
     * Defines the data structure for embedding generation metrics
     */
    public get embeddingMetricsSchema() {
        return this.eventBridge.children![3]!
    }
}

/**
 * RAG Embedding Service Enver
 */
export class RagEmbeddingEnver extends OdmdEnverCdk {
    constructor(owner: RagEmbeddingBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        // Subscribe to processed content events from document processing service
        const documentProcessingEnver = owner.contracts.ragDocumentProcessingBuild.dev; // Use appropriate env
        this.processedContentSubscription = new OdmdCrossRefConsumer(this, 'processedContentSubscription', documentProcessingEnver.processedContentEvents.eventBridge);

        // Produce embedding events for vector storage service
        this.embeddingEvents = new EmbeddingEventsProducer(this, 'embedding-events');
    }

    /**
     * EventBridge subscription to processed document content events
     * Receives chunked content ready for embedding generation
     */
    readonly processedContentSubscription: OdmdCrossRefConsumer<RagEmbeddingEnver, OdmdEnverCdk>;

    /**
     * EventBridge producer for embedding events
     * Published after embedding generation is complete
     */
    readonly embeddingEvents: EmbeddingEventsProducer;
}

/**
 * RAG Embedding Service Build
 */
export class RagEmbeddingBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagEmbeddingEnver>;
    get envers(): Array<RagEmbeddingEnver> {
        return this._envers;
    }

    private _dev!: RagEmbeddingEnver;
    get dev(): RagEmbeddingEnver {
        return this._dev;
    }

    private _prod!: RagEmbeddingEnver;
    get prod(): RagEmbeddingEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragEmbedding', scope.githubRepos.ragEmbedding);
    }

    protected initializeEnvers(): void {
        this._dev = new RagEmbeddingEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagEmbeddingEnver(this,
            this.contracts.accounts.workspace2, 'us-east-2',
            new SRC_Rev_REF('b', 'main')
        );

        this._envers = [this._dev, this._prod];
    }

    get contracts(): RagContracts {
        return super.contracts as RagContracts;
    }
} 