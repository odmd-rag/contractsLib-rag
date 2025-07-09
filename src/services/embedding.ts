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
 S3 bucket for embedding files with status metadata
 Contains JSON files with generated embeddings, metadata, and status in object metadata
 Status tracking uses metadata keys: 'processing-status', 'placeholder', 'chunk-id', etc.
 Consumed by vector storage service via S3 event notifications
 */
export class EmbeddingStorageProducer extends OdmdCrossRefProducer<RagEmbeddingEnver> {
    constructor(owner: RagEmbeddingEnver) {
        super(owner, 'store', {
            children: [
                {pathPart: 'schema', s3artifact: true}
            ]
        });
    }

    /**
     * S3 URL to the JSON schema for embedding status.
     * Versioned by Git SHA.
     */
    public get embeddingStatusSchemaS3Url() {
        return this.children![0]!
    }
}

/**
 HTTP API Gateway endpoint for embedding status
 Pattern: https://{enverId}.ragEmbedding.{domain}/status/{docId}
 Status retrieved from S3 object metadata
 */
export class EmbeddingStatusApiProducer extends OdmdCrossRefProducer<RagEmbeddingEnver> {
    constructor(owner: RagEmbeddingEnver) {
        super(owner, 'status-api', {
            children: [
                {pathPart: 'schema'}
            ]
        });
    }

    /**
     * Schema contract for status response payloads
     * Defines the data structure for embedding status responses from S3 metadata
     */
    public get statusResponseSchema() {
        return this.children![0]!
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
    
    /**
     * S3 URL subscription to the processed content schema
     * Used at runtime to validate incoming data against the producer's contract
     */
    readonly processedContentSchemaS3Url: OdmdCrossRefConsumer<RagEmbeddingEnver, RagDocumentProcessingEnver>;

    readonly authProviderClientId: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    readonly authProviderName: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;

    constructor(owner: RagEmbeddingBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        const documentProcessingEnver = owner.contracts.ragDocumentProcessingBuild.dev;
        this.processedContentSubscription = new OdmdCrossRefConsumer(this, 'processedContentSubscription', documentProcessingEnver.processedContentStorage.processedContentBucket);
        this.processedContentSchemaS3Url = new OdmdCrossRefConsumer(this, 'processedContentSchemaS3Url', documentProcessingEnver.processedContentStorage.processedContentSchemaS3Url);

        const userAuthEnver = owner.contracts.userAuth!.envers[0] as RagUserAuthEnver
        this.authProviderClientId = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId);

        this.authProviderName = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName);

        this.embeddingStorage = new EmbeddingStorageProducer(this);
        this.statusApi = new EmbeddingStatusApiProducer(this);
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