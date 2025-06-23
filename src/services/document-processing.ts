import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagDocumentIngestionEnver } from "./document-ingestion";

/**
 * Processed Content Storage Resources (S3 Buckets)
 * Provides S3 buckets for processed content that embedding service polls
 * Replaces EventBridge with S3 polling architecture
 */
export class ProcessedContentStorageProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'processed-content-bucket'},     // S3 bucket for processed content JSON files
                {pathPart: 'processing-status-bucket'}      // S3 bucket for processing status/completion files
            ]
        });
    }

    /**
     * S3 bucket for processed content files
     * Contains JSON files with processed document content and chunks
     * Consumed by embedding service via S3 polling
     */
    public get processedContentBucket() {
        return this.children![0]!
    }

    /**
     * S3 bucket for processing status files
     * Contains JSON files with processing completion status and metrics
     * Used for monitoring and debugging
     */
    public get processingStatusBucket() {
        return this.children![1]!
    }
}

/**
 * Document Processing Status API Producer
 * Provides HTTP API endpoints for document processing status tracking
 */
export class DocumentProcessingStatusApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'status-api-endpoint'},        // HTTP API Gateway endpoint
                {pathPart: 'status-response-schema'}      // Schema for status responses
            ]
        });
    }

    /**
     * HTTP API Gateway endpoint for document processing status
     * Pattern: https://{enverId}.ragDocumentProcessing.{domain}/status/{docId}
     */
    public get statusApiEndpoint() {
        return this.children![0]!
    }

    /**
     * Schema contract for status response payloads
     * Defines the data structure for processing status responses
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
        
        // Initialize producers for resources this service creates
        this.processedContentStorage = new ProcessedContentStorageProducer(this, 'processed-content-storage');
        this.statusApi = new DocumentProcessingStatusApiProducer(this, 'status-api');
        
        // Initialize role ARN producers for cross-service permissions
        this.s3PollerRoleArn = new OdmdCrossRefProducer(this, 's3-poller-role-arn');
        this.documentProcessorRoleArn = new OdmdCrossRefProducer(this, 'document-processor-role-arn');
    }

    // === CONSUMING from ingestion service (using getSharedValue) ===
    documentBucket!: OdmdCrossRefConsumer<this, RagDocumentIngestionEnver>;
    quarantineBucket!: OdmdCrossRefConsumer<this, RagDocumentIngestionEnver>;

    // === PRODUCING for embedding service (using OdmdShareOut) ===
    readonly processedContentStorage: ProcessedContentStorageProducer;
    
    // === PRODUCING status API for WebUI tracking ===
    readonly statusApi: DocumentProcessingStatusApiProducer;
    
    // === PRODUCING role ARNs for ingestion service to grant S3 permissions ===
    readonly s3PollerRoleArn: OdmdCrossRefProducer<RagDocumentProcessingEnver>;
    readonly documentProcessorRoleArn: OdmdCrossRefProducer<RagDocumentProcessingEnver>;

    wireConsuming() {
        // Wire consumption from document ingestion service S3 storage resources
        this.documentBucket = new OdmdCrossRefConsumer(
            this, 'doc-bucket',
            this.ingestionEnver.documentStorageResources.documentBucket, {
                defaultIfAbsent: 'default-bucket-name',
                trigger: 'no'
            }
        );

        this.quarantineBucket = new OdmdCrossRefConsumer(
            this, 'quarantine-bucket',
            this.ingestionEnver.documentStorageResources.quarantineBucket, {
                defaultIfAbsent: 'default-quarantine-bucket-name',
                trigger: 'no'
            }
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