import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefConsumer,
    OdmdCrossRefProducer, OdmdEnverUserAuth
} from "@ondemandenv/contracts-lib-base";
import type {RagContracts} from "../rag-contracts";
import {RagUserAuthEnver} from "./user-auth";
import {RagDocumentProcessingEnver} from "./document-processing";

/**
 * Embedding Storage Resources (S3 Buckets)
 * Provides S3 bucket for embeddings with status-in-metadata pattern
 * Status tracking is now embedded in object metadata instead of separate bucket
 */
export class EmbeddingStorageProducer extends OdmdCrossRefProducer<RagEmbeddingEnver> {
    constructor(owner: RagEmbeddingEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'embeddings-bucket'}
            ]
        });
    }

    /**
     * S3 bucket for embedding files with status metadata
     * Contains JSON files with generated embeddings, metadata, and status in object metadata
     * Status tracking uses metadata keys: 'processing-status', 'placeholder', 'chunk-id', etc.
     * Consumed by vector storage service via S3 event notifications
     */
    public get embeddingsBucket() {
        return this.children![0]!
    }
}

/**
 * Embedding Service Status API Producer
 * Provides HTTP API endpoints for embedding status tracking
 * Status is retrieved from S3 object metadata instead of separate status bucket
 */
export class EmbeddingStatusApiProducer extends OdmdCrossRefProducer<RagEmbeddingEnver> {
    constructor(owner: RagEmbeddingEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'status-api-endpoint'},
                {pathPart: 'status-response-schema'}
            ]
        });
    }

    /**
     * HTTP API Gateway endpoint for embedding status
     * Pattern: https://{enverId}.ragEmbedding.{domain}/status/{docId}
     * Status retrieved from S3 object metadata
     */
    public get statusApiEndpoint() {
        return this.children![0]!
    }

    /**
     * Schema contract for status response payloads
     * Defines the data structure for embedding status responses from S3 metadata
     */
    public get statusResponseSchema() {
        return this.children![1]!
    }
}

/**
 * RAG Embedding Service Enver
 */
export class RagEmbeddingEnver extends OdmdEnverCdk {
    /**
     * S3 bucket subscription to processed document content
     * Receives S3 event notifications for processed content JSON files ready for embedding generation
     */
    readonly processedContentSubscription: OdmdCrossRefConsumer<RagEmbeddingEnver, RagDocumentProcessingEnver>;
    
    readonly authProviderClientId: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    readonly authProviderName: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;

    constructor(owner: RagEmbeddingBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        const documentProcessingEnver = owner.contracts.ragDocumentProcessingBuild.dev;
        this.processedContentSubscription = new OdmdCrossRefConsumer(this, 'processedContentSubscription', documentProcessingEnver.processedContentStorage.processedContentBucket);

        const userAuthEnver = owner.contracts.userAuth!.envers[0] as RagUserAuthEnver
        this.authProviderClientId = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId);

        this.authProviderName = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName);

        this.embeddingStorage = new EmbeddingStorageProducer(this, 'embedding-storage');
        this.statusApi = new EmbeddingStatusApiProducer(this, 'status-api');
    }

    /**
     * S3 storage producer for embeddings with status metadata
     * Provides S3 bucket for embeddings consumed by vector storage service via S3 event notifications
     * Status tracking embedded in object metadata
     */
    readonly embeddingStorage: EmbeddingStorageProducer;

    /**
     * Status API producer for WebUI tracking
     * Provides HTTP endpoints for embedding status tracking from S3 metadata
     */
    readonly statusApi: EmbeddingStatusApiProducer;
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
        super(scope, 'ragEmbed', scope.githubRepos.ragEmbedding);
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