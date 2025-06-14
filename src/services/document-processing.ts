import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagDocumentIngestionEnver } from "./document-ingestion";

/**
 * Processed Content Event Producer (EventBridge)
 * Publishes "Document Processed" events for embedding service consumption
 * Only defines NEW event schemas that this service produces (not consumed from ingestion)
 */
export class ProcessedContentEventProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'processed-content-bus',      // EventBridge bus for processed document events
                    children: [
                        {pathPart: 'content-processed-event-schema'},     // NEW: Schema for successfully processed content
                        {pathPart: 'processing-completed-event-schema'}   // NEW: Schema for processing completion
                    ]
                }
            ]
        });
    }

    /**
     * EventBridge custom bus for processed document content events
     * This is the contract interface that embedding service subscribes to
     */
    public get eventBridge() {
        return this.children![0]!
    }

    /**
     * Schema contract for content processing completion events
     * Defines the data structure for successfully processed and chunked content
     */
    public get contentProcessedSchema() {
        return this.eventBridge.children![0]!
    }

    /**
     * Schema contract for processing completion events  
     * Defines the data structure for processing workflow completion
     */
    public get processingCompletedSchema() {
        return this.eventBridge.children![1]!
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
        this.processedContentQueue = new OdmdCrossRefProducer(this, 'processed-content-queue');
        this.processedContentEvents = new ProcessedContentEventProducer(this, 'processed-content-events');
        
        // Initialize role ARN producers for cross-service permissions
        this.s3PollerRoleArn = new OdmdCrossRefProducer(this, 's3-poller-role-arn');
        this.documentProcessorRoleArn = new OdmdCrossRefProducer(this, 'document-processor-role-arn');
    }

    // === CONSUMING from ingestion service (using getSharedValue) ===
    documentBucket!: OdmdCrossRefConsumer<this, any>;
    quarantineBucket!: OdmdCrossRefConsumer<this, any>;

    // === PRODUCING for embedding service (using OdmdShareOut) ===
    readonly processedContentQueue: OdmdCrossRefProducer<RagDocumentProcessingEnver>;
    readonly processedContentEvents: ProcessedContentEventProducer;
    
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
        super(scope, 'ragDocumentProcessing', scope.githubRepos.ragDocumentProcessing);
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