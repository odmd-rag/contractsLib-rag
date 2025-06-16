import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefConsumer, OdmdCrossRefProducer } from "@ondemandenv/contracts-lib-base";
import type { RagContracts } from "../rag-contracts";
import { RagEmbeddingEnver } from "./embedding";

/**
 * Vector Storage Resources (S3 Buckets + Vector Database)
 * Provides vector database and storage for vector search service consumption
 */
export class VectorStorageProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'vector-database-endpoint'},     // Vector database endpoint (e.g., Pinecone, Weaviate)
                {pathPart: 'vector-index-name'},            // Vector index/collection name
                {pathPart: 'vector-metadata-bucket'},       // S3 bucket for vector metadata and status
                {pathPart: 'vector-backup-bucket'}          // S3 bucket for vector database backups
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
}

/**
 * RAG Vector Storage Service Enver
 */
export class RagVectorStorageEnver extends OdmdEnverCdk {
    constructor(owner: RagVectorStorageBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        // Subscribe to embedding storage from embedding service
        const embeddingEnver = owner.contracts.ragEmbeddingBuild.dev; // Use appropriate env
        this.embeddingSubscription = new OdmdCrossRefConsumer(this, 'embeddingSubscription', embeddingEnver.embeddingStorage.embeddingsBucket);

        // Produce vector storage for knowledge retrieval service
        this.vectorStorage = new VectorStorageProducer(this, 'vector-storage');
    }

    /**
     * S3 bucket subscription to embeddings
     * Polls S3 bucket for embedding JSON files ready for vector storage
     */
    readonly embeddingSubscription: OdmdCrossRefConsumer<RagVectorStorageEnver, OdmdEnverCdk>;

    /**
     * Vector storage producer
     * Provides vector database access for knowledge retrieval service
     */
    readonly vectorStorage: VectorStorageProducer;
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
        super(scope, 'ragVectorStorage', scope.githubRepos.ragVectorStorage);
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
} 