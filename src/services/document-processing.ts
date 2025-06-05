import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagDocumentIngestionEnver } from "./document-ingestion";

/**
 * Processed Content Event Producer (EventBridge)
 * Publishes "Document Processed" events for embedding service consumption
 */
export class ProcessedContentEventProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'processed-content-bus',      // EventBridge bus for processed document events
                    children: [
                        {pathPart: 'content-extracted-event-schema'},     // Schema for successfully extracted content
                        {pathPart: 'content-chunked-event-schema'},       // Schema for content chunking completion
                        {pathPart: 'processing-failed-event-schema'},     // Schema for processing failure events
                        {pathPart: 'processing-metrics-event-schema'}     // Schema for processing metrics events
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
     * Schema contract for content extraction completion events
     * Defines the data structure for successfully extracted and preprocessed content
     */
    public get contentExtractedSchema() {
        return this.eventBridge.children![0]!
    }

    /**
     * Schema contract for content chunking completion events
     * Defines the data structure for chunked content ready for embedding
     */
    public get contentChunkedSchema() {
        return this.eventBridge.children![1]!
    }

    /**
     * Schema contract for processing failure events
     * Defines the data structure for processing error information
     */
    public get processingFailedSchema() {
        return this.eventBridge.children![2]!
    }

    /**
     * Schema contract for processing metrics events
     * Defines the data structure for processing performance metrics
     */
    public get processingMetricsSchema() {
        return this.eventBridge.children![3]!
    }
}

/**
 * Document Processing Kinesis Streams Producer
 * Owns the sharding strategy and stream topology based on processing requirements
 */
export class DocumentProcessingStreamsProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'main-processing-stream',     // Main document processing stream
                    children: [
                        {pathPart: 'document-record-schema'},         // Schema for main processing records
                        {pathPart: 'processing-result-schema'}        // Schema for processing results
                    ]
                },
                {
                    pathPart: 'priority-processing-stream', // High-priority document stream
                    children: [
                        {pathPart: 'priority-document-record-schema'}, // Schema for priority processing records
                        {pathPart: 'sla-tracking-schema'}              // Schema for SLA tracking data
                    ]
                },
                {
                    pathPart: 'batch-processing-stream',    // Batch processing stream
                    children: [
                        {pathPart: 'batch-job-record-schema'},        // Schema for batch job records
                        {pathPart: 'batch-progress-schema'}           // Schema for batch progress tracking
                    ]
                },
                {
                    pathPart: 'dlq-stream',                 // Dead letter queue stream
                    children: [
                        {pathPart: 'failed-record-schema'},           // Schema for failed processing records
                        {pathPart: 'error-context-schema'}            // Schema for error context and debugging info
                    ]
                },
                {
                    pathPart: 'metrics-stream',             // Processing metrics and monitoring
                    children: [
                        {pathPart: 'performance-metrics-schema'},     // Schema for performance metrics
                        {pathPart: 'resource-usage-schema'}           // Schema for resource utilization metrics
                    ]
                }
            ]
        });
    }

    /**
     * Main Kinesis stream for standard document processing
     * Sharding: By document type and size
     */
    public get mainProcessingStream() {
        return this.children![0]!
    }

    /**
     * Schema contract for main processing stream records
     */
    public get mainDocumentRecordSchema() {
        return this.mainProcessingStream.children![0]!
    }

    /**
     * Schema contract for main processing results
     */
    public get mainProcessingResultSchema() {
        return this.mainProcessingStream.children![1]!
    }

    /**
     * High-priority stream for urgent documents
     * Sharding: By user priority and SLA requirements
     */
    public get priorityProcessingStream() {
        return this.children![1]!
    }

    /**
     * Schema contract for priority processing stream records
     */
    public get priorityDocumentRecordSchema() {
        return this.priorityProcessingStream.children![0]!
    }

    /**
     * Schema contract for SLA tracking data
     */
    public get slaTrackingSchema() {
        return this.priorityProcessingStream.children![1]!
    }

    /**
     * Batch processing stream for large document sets
     * Sharding: By batch ID and processing complexity
     */
    public get batchProcessingStream() {
        return this.children![2]!
    }

    /**
     * Schema contract for batch job records
     */
    public get batchJobRecordSchema() {
        return this.batchProcessingStream.children![0]!
    }

    /**
     * Schema contract for batch progress tracking
     */
    public get batchProgressSchema() {
        return this.batchProcessingStream.children![1]!
    }

    /**
     * Dead letter queue for failed processing attempts
     */
    public get dlqStream() {
        return this.children![3]!
    }

    /**
     * Schema contract for failed processing records
     */
    public get failedRecordSchema() {
        return this.dlqStream.children![0]!
    }

    /**
     * Schema contract for error context and debugging information
     */
    public get errorContextSchema() {
        return this.dlqStream.children![1]!
    }

    /**
     * Metrics and monitoring stream
     */
    public get metricsStream() {
        return this.children![4]!
    }

    /**
     * Schema contract for performance metrics
     */
    public get performanceMetricsSchema() {
        return this.metricsStream.children![0]!
    }

    /**
     * Schema contract for resource utilization metrics
     */
    public get resourceUsageSchema() {
        return this.metricsStream.children![1]!
    }
}

/**
 * RAG Document Processing Service Enver
 */
export class RagDocumentProcessingEnver extends OdmdEnverCdk {
    constructor(owner: RagDocumentProcessingBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Subscribe to document validation events from ingestion service EventBridge bus
        const documentIngestionEnver = owner.contracts.ragDocumentIngestionBuild.dev; // Use appropriate env
        this.documentEventsSubscription = new OdmdCrossRefConsumer(this, 'documentEventsSubscription', documentIngestionEnver.documentValidationEvents.eventBridge);
        
        // Own the Kinesis streams for processing with custom sharding strategies
        this.processingStreams = new DocumentProcessingStreamsProducer(this, 'processing-streams');
        
        // Produce processed content events for embedding service
        this.processedContentEvents = new ProcessedContentEventProducer(this, 'processed-content-events');
    }

    /**
     * EventBridge bus subscription to document validation events
     * The processing service will create its own rules and DLQ internally
     */
    readonly documentEventsSubscription: OdmdCrossRefConsumer<RagDocumentProcessingEnver, OdmdEnverCdk>;
    
    /**
     * Owned Kinesis streams with custom sharding strategies
     */
    readonly processingStreams: DocumentProcessingStreamsProducer;
    
    /**
     * EventBridge producer for processed content events
     * Published after document processing is complete
     */
    readonly processedContentEvents: ProcessedContentEventProducer;
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
        this._dev = new RagDocumentProcessingEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagDocumentProcessingEnver(this,
            this.contracts.accounts.workspace2, 'us-east-2',
            new SRC_Rev_REF('b', 'main')
        );

        this._envers = [this._dev, this._prod];
    }

    get contracts(): RagContracts {
        return super.contracts as RagContracts;
    }
} 