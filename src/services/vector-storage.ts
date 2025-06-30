import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefConsumer,
    OdmdCrossRefProducer,
    OdmdEnverUserAuth
} from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagUserAuthEnver } from "./user-auth";
import {RagEmbeddingEnver} from "./embedding";

/**
 * Vector Storage Resources (S3 Buckets + Vector Database)
 * Provides vector database and storage for vector search service consumption
 */
export class VectorStorageProducer extends OdmdCrossRefProducer<RagVectorStorageEnver> {
    constructor(owner: RagVectorStorageEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'vector-database-endpoint'},
                {pathPart: 'vector-index-name'},
                {pathPart: 'vector-metadata-bucket'},
                {pathPart: 'vector-backup-bucket'},
                {pathPart: 'upsert-request-schema-s3-url'},
                {pathPart: 'vector-metadata-schema-s3-url'}
            ]
        });
    }

    /**
     * Vector database endpoint
     * Connection string/endpoint for the vector database
     */
    public get vectorDatabaseEndpoint() {
        return this.children![0]!
    }

    /**
     * Vector index name
     * Name of the vector index/collection in the database
     */
    public get vectorIndexName() {
        return this.children![1]!
    }

    /**
     * S3 bucket for vector metadata
     * Contains metadata about stored vectors and indexing status
     */
    public get vectorMetadataBucket() {
        return this.children![2]!
    }

    /**
     * S3 bucket for vector backups
     * Contains periodic backups of the vector database
     */
    public get vectorBackupBucket() {
        return this.children![3]!
    }

    /**
     * S3 URL to the JSON schema for upsert requests.
     * Versioned by Git SHA.
     * e.g., s3://bucket/schemas/upsert-request/upsert-request-abcdef123.json
     */
    public get upsertRequestSchemaS3Url() {
        return this.children![4]!
    }

    /**
     * S3 URL to the JSON schema for vector metadata.
     * Versioned by Git SHA.
     * e.g., s3://bucket/schemas/vector-metadata/vector-metadata-abcdef123.json
     */
    public get vectorMetadataSchemaS3Url() {
        return this.children![5]!
    }
}

/**
 * Vector Storage Status API Producer
 * Provides HTTP API endpoints for vector storage status tracking
 */
export class VectorStorageStatusApiProducer extends OdmdCrossRefProducer<RagVectorStorageEnver> {
    constructor(owner: RagVectorStorageEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'status-api-endpoint'},
                {pathPart: 'status-response-schema'}
            ]
        });
    }

    /**
     * HTTP API Gateway endpoint for vector storage status
     * Pattern: https://{enverId}.ragVectorStorage.{domain}/status/{docId}
     */
    public get statusApiEndpoint() {
        return this.children![0]!
    }

    /**
     * Schema contract for status response payloads
     * Defines the data structure for vector storage status responses
     */
    public get statusResponseSchema() {
        return this.children![1]!
    }
}

/**
 * RAG Vector Storage Service Enver
 */
export class RagVectorStorageEnver extends OdmdEnverCdk {
    constructor(owner: RagVectorStorageBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        this.vectorStorage = new VectorStorageProducer(this, 'vector-storage');
        this.statusApi = new VectorStorageStatusApiProducer(this, 'status-api');
    }

    /**
     * S3 bucket subscription to embeddings
     * Polls S3 bucket for embedding JSON files ready for vector storage
     */
    embeddingSubscription!: OdmdCrossRefConsumer<RagVectorStorageEnver, RagEmbeddingEnver>;

    /**
     * S3 URL subscription to the embedding status schema
     * Used at runtime to validate incoming data from the embedding service
     */
    embeddingStatusSchemaS3Url!: OdmdCrossRefConsumer<RagVectorStorageEnver, RagEmbeddingEnver>;

    authProviderClientId!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    authProviderName!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    
    homeServerDomain!: OdmdCrossRefConsumer<this, RagUserAuthEnver>;

    wireConsuming() {
        const embeddingEnver = (this.owner as RagVectorStorageBuild).contracts.ragEmbeddingBuild.dev;
        this.embeddingSubscription = new OdmdCrossRefConsumer(
            this, 'embedding-subscription',
            embeddingEnver.embeddingStorage.embeddingsBucket
        );

        this.embeddingStatusSchemaS3Url = new OdmdCrossRefConsumer(
            this, 'embeddingStatusSchemaS3Url',
            embeddingEnver.embeddingStorage.embeddingStatusSchemaS3Url
        );

        const ragContracts = this.owner.contracts as RagContracts;
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver
        
        this.authProviderClientId = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId);
        
        this.authProviderName = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName);
        
        this.homeServerDomain = new OdmdCrossRefConsumer(this, userAuthEnver.homeServerDomainName.node.id, userAuthEnver.homeServerDomainName, {
            defaultIfAbsent: 'https://localhost:3000',
            trigger: 'no'
        });
    }

    /**
     * Vector storage producer
     * Provides vector database access for knowledge retrieval service
     */
    readonly vectorStorage: VectorStorageProducer;

    /**
     * Status API producer for WebUI tracking
     * Provides HTTP endpoints for vector storage status tracking
     */
    readonly statusApi: VectorStorageStatusApiProducer;
}

/**
 * RAG Vector Storage Service Build
 */
export class RagVectorStorageBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagVectorStorageEnver>;
    get envers(): Array<RagVectorStorageEnver> {
        return this._envers;
    }

    private _dev!: RagVectorStorageEnver;
    get dev(): RagVectorStorageEnver {
        return this._dev;
    }

    private _prod!: RagVectorStorageEnver;
    get prod(): RagVectorStorageEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragStore', scope.githubRepos.ragVectorStorage);
    }

    protected initializeEnvers(): void {
        this._dev = new RagVectorStorageEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagVectorStorageEnver(this,
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