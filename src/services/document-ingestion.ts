import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefProducer,
    OdmdCrossRefConsumer,
    OdmdEnverUserAuth
} from '@ondemandenv/contracts-lib-base';
import  { RagContracts } from "../rag-contracts";
import { RagUserAuthEnver } from "./user-auth";

/**
 * Document Storage Resource Producer (S3)
 * Provides access to the document storage bucket for downstream processing services
 */
export class DocumentStorageResourceProducer extends OdmdCrossRefProducer<RagDocumentIngestionEnver> {
    constructor(owner: RagDocumentIngestionEnver, id: string) {
        super(owner, id, {
            children: [
                {pathPart: 'document-bucket'},        // S3 bucket for uploaded documents
                {pathPart: 'quarantine-bucket'}       // S3 bucket for quarantined documents
            ]
        });
    }

    /**
     * S3 bucket containing uploaded documents with timestamp-hash keys
     * This is the primary contract interface for downstream services to poll
     */
    public get documentBucket() {
        return this.children![0]!
    }

    /**
     * S3 bucket for quarantined documents requiring manual review
     * Downstream services may need read access for comprehensive processing
     */
    public get quarantineBucket() {
        return this.children![1]!
    }
}

/**
 * RAG Document Ingestion Service Enver
 */
export class RagDocumentIngestionEnver extends OdmdEnverCdk {
    constructor(owner: RagDocumentIngestionBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Initialize S3 storage resources for downstream services to poll
        this.documentStorageResources = new DocumentStorageResourceProducer(this, 'doc-storage-resources');
        
        // Initialize auth callback URLs for user-auth service to consume
        this.authCallbackUrl = new OdmdCrossRefProducer(this, 'auth-callback-url');
        this.logoutUrl = new OdmdCrossRefProducer(this, 'logout-url');
    }

    readonly documentStorageResources: DocumentStorageResourceProducer;
    
    // Auth callback URLs produced for user-auth service to consume
    readonly authCallbackUrl: OdmdCrossRefProducer<RagDocumentIngestionEnver>;
    readonly logoutUrl: OdmdCrossRefProducer<RagDocumentIngestionEnver>;
    
    // Consuming user-auth identity provider details for document authentication (single references since one auth enver)
    authProviderClientId!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    authProviderName!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    
    wireConsuming() {
        // Wire consumption from user-auth service for authentication
        const ragContracts = this.owner.contracts as RagContracts;
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver
        
        this.authProviderClientId = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId);
        
        this.authProviderName = new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName);
    }


    getRevStackNames(): Array<string> {
        const baseName = super.getRevStackNames()[0];
        return [baseName, baseName + '-webHosting', baseName + '-webUi'];
    }
}

/**
 * RAG Document Ingestion Service Build
 */
export class RagDocumentIngestionBuild extends OdmdBuild<OdmdEnverCdk> {
    private _envers!: Array<RagDocumentIngestionEnver>;
    get envers(): Array<RagDocumentIngestionEnver> {
        return this._envers;
    }

    private _dev!: RagDocumentIngestionEnver;
    get dev(): RagDocumentIngestionEnver {
        return this._dev;
    }

    private _prod!: RagDocumentIngestionEnver;
    get prod(): RagDocumentIngestionEnver {
        return this._prod;
    }

    ownerEmail?: string | undefined;

    constructor(scope: RagContracts) {
        super(scope, 'ragIngest', scope.githubRepos.ragDocumentIngestion);
    }

    protected initializeEnvers(): void {
        this._dev = new RagDocumentIngestionEnver(this,
            this.contracts.accounts.workspace1, 'us-east-2',
            new SRC_Rev_REF('b', 'dev')
        );

        this._prod = new RagDocumentIngestionEnver(this,
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
