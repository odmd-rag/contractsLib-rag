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
 * Embedding Storage Resources (S3 Buckets)
 * Provides S3 buckets for embeddings that vector storage service polls
 * Replaces EventBridge with S3 polling architecture
 */
export class EmbeddingStorageProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'embeddings-bucket'},           // S3 bucket for embedding JSON files
                {pathPart: 'embedding-status-bucket'}      // S3 bucket for embedding status/completion files
            ]
        });
    }

    /**
     * S3 bucket for embedding files
     * Contains JSON files with generated embeddings and metadata
     * Consumed by vector storage service via S3 polling
     */
    public get embeddingsBucket() {
        return this.children![0]!
    }

    /**
     * S3 bucket for embedding status files
     * Contains JSON files with embedding completion status and metrics
     * Used for monitoring and debugging
     */
    public get embeddingStatusBucket() {
        return this.children![1]!
    }
}

/**
 * RAG Embedding Service Enver
 */
export class RagEmbeddingEnver extends OdmdEnverCdk {
    constructor(owner: RagEmbeddingBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        // Subscribe to processed content storage from document processing service
        const documentProcessingEnver = owner.contracts.ragDocumentProcessingBuild.dev; // Use appropriate env
        this.processedContentSubscription = new OdmdCrossRefConsumer(this, 'processedContentSubscription', documentProcessingEnver.processedContentStorage.processedContentBucket);

        // Produce embedding storage for vector storage service
        this.embeddingStorage = new EmbeddingStorageProducer(this, 'embedding-storage');
    }

    /**
     * S3 bucket subscription to processed document content
     * Polls S3 bucket for processed content JSON files ready for embedding generation
     */
    readonly processedContentSubscription: OdmdCrossRefConsumer<RagEmbeddingEnver, OdmdEnverCdk>;

    /**
     * S3 storage producer for embeddings
     * Provides S3 buckets for embeddings that vector storage service polls
     */
    readonly embeddingStorage: EmbeddingStorageProducer;
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