import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagDocumentIngestionEnver } from "./document-ingestion";

/**
 * Processed Content Storage Resources (S3 Buckets)
 * Provides S3 bucket for processed content with status-in-metadata pattern
 * Status tracking is now embedded in object metadata instead of separate bucket
 */
export class ProcessedContentStorageProducer extends OdmdCrossRefProducer<RagDocumentProcessingEnver> {
    constructor(owner: RagDocumentProcessingEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'processed-content-bucket'},
                {pathPart: 'processed-content-schema-s3-url', s3artifact: true}
            ]
        });
    }

    /**
     * S3 bucket for processed content files with status metadata
     * Contains JSON files with processed document content, chunks, and status in object metadata
     * Status tracking uses metadata keys: 'processing-status', 'placeholder', 'document-id', etc.
     * Consumed by embedding service via S3 event notifications
     */
    public get processedContentBucket() {
        return this.children![0]!
    }

    /**
     * S3 URL to the JSON schema for processed content.
     * Versioned by Git SHA.
     * e.g., s3://bucket/schemas/processed-content/processed-content-abcdef123.json
     */
    public get processedContentSchemaS3Url() {
        return this.children![1]!
    }
}

/**
 * Document Processing Status API Producer
 * Provides HTTP API endpoints for document processing status tracking
 * Status is retrieved from S3 object metadata instead of separate status bucket
 */
export class DocumentProcessingStatusApiProducer extends OdmdCrossRefProducer<RagDocumentProcessingEnver> {
    constructor(owner: RagDocumentProcessingEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'status-api-endpoint'},
                {pathPart: 'status-response-schema'}
            ]
        });
    }

    /**
     * HTTP API Gateway endpoint for document processing status
     * Pattern: https://{enverId}.ragDocumentProcessing.{domain}/status/{docId}
     * Status retrieved from S3 object metadata
     */
    public get statusApiEndpoint() {
        return this.children![0]!
    }

    /**
     * Schema contract for status response payloads
     * Defines the data structure for processing status responses from S3 metadata
     */
    public get statusResponseSchema() {
        return this.children![1]!
    }
}

/**
 * RAG Document Processing Service Enver
 */
export class RagDocumentProcessingEnver extends OdmdEnverCdk {
    readonly ingestionEnver: RagDocumentIngestionEnver
    
    constructor(owner: RagDocumentProcessingBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF, ingestionEnver: RagDocumentIngestionEnver) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.ingestionEnver = ingestionEnver;
        
        this.processedContentStorage = new ProcessedContentStorageProducer(this, 'processed-content-storage');
        this.statusApi = new DocumentProcessingStatusApiProducer(this, 'status-api');
    }

    documentBucket!: OdmdCrossRefConsumer<this, RagDocumentIngestionEnver>;
    documentMetadataSchemaS3Url!: OdmdCrossRefConsumer<this, RagDocumentIngestionEnver>;

    readonly processedContentStorage: ProcessedContentStorageProducer;
    
    readonly statusApi: DocumentProcessingStatusApiProducer;

    wireConsuming() {
        this.documentBucket = new OdmdCrossRefConsumer(
            this, 'doc-bucket',
            this.ingestionEnver.documentStorageResources
        );

        this.documentMetadataSchemaS3Url = new OdmdCrossRefConsumer(
            this, 'doc-metadata-schema',
            this.ingestionEnver.documentStorageResources.docMetadataSchemaS3Url,
        );
    }

    getRevStackNames(): Array<string> {
        const baseName = super.getRevStackNames()[0];
        return [baseName];
    }
}

/**
 * RAG Document Processing Service Build
 */
export class RagDocumentProcessingBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagDocumentProcessingEnver>;
    get envers(): Array<RagDocumentProcessingEnver> {
        return this._envers;
    }

    private _dev!: RagDocumentProcessingEnver;
    get dev(): RagDocumentProcessingEnver {
        return this._dev;
    }

    private _prod!: RagDocumentProcessingEnver;
    get prod(): RagDocumentProcessingEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragProc', scope.githubRepos.ragDocumentProcessing);
    }

    protected initializeEnvers(): void {
        const ingestionDev = this.contracts.ragDocumentIngestionBuild.dev;
        const ingestionProd = this.contracts.ragDocumentIngestionBuild.prod;

        this._dev = new RagDocumentProcessingEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev'),
            ingestionDev
        );

        this._prod = new RagDocumentProcessingEnver(this,
            this.contracts.accounts.workspace2, 'us-east-2',
            new SRC_Rev_REF('b', 'main'),
            ingestionProd
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