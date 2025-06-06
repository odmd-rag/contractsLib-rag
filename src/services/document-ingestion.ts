import { Construct } from 'constructs';
import { OdmdBuild, OdmdEnverCdk, SRC_Rev_REF, OdmdCrossRefProducer, OdmdCrossRefConsumer } from '@ondemandenv/contracts-lib-base';
import type { RagContracts } from "../rag-contracts";
import { RagUserAuthEnver } from "./user-auth";

/**
 * Document Validation Event Producer (EventBridge)
 * Publishes "Document Validated" events for downstream processing services
 */
export class DocumentValidationEventProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    constructor(owner: OdmdEnverCdk, id: string) {
        super(owner, id, {
            children: [
                {
                    pathPart: 'event-bridge-bus',      // EventBridge bus for publishing document events
                    children: [
                        {pathPart: 'document-validated-event-schema'},    // Schema contract for document validation events
                        {pathPart: 'document-rejected-event-schema'},     // Schema contract for document rejection events
                        {pathPart: 'document-quarantined-event-schema'}   // Schema contract for document quarantine events
                    ]
                }
            ]
        });
    }

    /**
     * EventBridge custom bus for RAG document events
     * This is the contract interface that other services can subscribe to
     */
    public get eventBridge() {
        return this.children![0]!
    }

    /**
     * Schema contract for successful document validation events
     * Defines the data structure for documents that passed validation
     */
    public get documentValidatedSchema() {
        return this.eventBridge.children![0]!
    }

    /**
     * Schema contract for document rejection events
     * Defines the data structure for documents that failed validation
     */
    public get documentRejectedSchema() {
        return this.eventBridge.children![1]!
    }

    /**
     * Schema contract for document quarantine events
     * Defines the data structure for documents requiring manual review
     */
    public get documentQuarantinedSchema() {
        return this.eventBridge.children![2]!
    }
}

/**
 * RAG Document Ingestion Service Enver
 */
export class RagDocumentIngestionEnver extends OdmdEnverCdk {
    constructor(owner: RagDocumentIngestionBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        
        // Initialize EventBridge producer for document validation events
        this.documentValidationEvents = new DocumentValidationEventProducer(this, 'doc-validation-events');
        
        // Initialize auth callback URLs for user-auth service to consume
        this.authCallbackUrl = new OdmdCrossRefProducer(this, 'auth-callback-url');
        this.logoutUrl = new OdmdCrossRefProducer(this, 'logout-url');
        
        // Initialize consumption of user-auth identity provider details
        this.authProviderClientId = [];
        this.authProviderName = [];
    }

    readonly documentValidationEvents: DocumentValidationEventProducer;
    
    // Auth callback URLs produced for user-auth service to consume
    readonly authCallbackUrl: OdmdCrossRefProducer<RagDocumentIngestionEnver>;
    readonly logoutUrl: OdmdCrossRefProducer<RagDocumentIngestionEnver>;
    
    // Consuming user-auth identity provider details for document authentication
    readonly authProviderClientId: OdmdCrossRefConsumer<this, any>[];
    readonly authProviderName: OdmdCrossRefConsumer<this, any>[];
    
    wireConsuming() {
        // Wire consumption from user-auth service for authentication
        const ragContracts = this.owner.contracts as RagContracts;
        const userAuthEnver = ragContracts.userAuth!.envers[0] as RagUserAuthEnver
        
        this.authProviderClientId.push(new OdmdCrossRefConsumer(this, userAuthEnver.idProviderClientId.node.id, userAuthEnver.idProviderClientId, {
            defaultIfAbsent: 'default-client-id',
            trigger: 'no'
        }));
        
        this.authProviderName.push(new OdmdCrossRefConsumer(this, userAuthEnver.idProviderName.node.id, userAuthEnver.idProviderName, {
            defaultIfAbsent: 'default-provider-name',
            trigger: 'no'
        }));
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
        super(scope, 'ragDocumentIngestion', scope.githubRepos.ragDocumentIngestion);
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

/**
 * Document Ingestion Service Build Configuration
 */
export class DocumentIngestionBuild {
  constructor(public props: {
    githubRepoAlias: string;
    buildType: string;
    sourcePath: string;
  }) {}
}

/**
 * Document Ingestion Service Enver (Environment)
 */
export class DocumentIngestionEnver {
  constructor(public scope: Construct, public id: string, public props: {
    build: DocumentIngestionBuild;
    targetAccountAlias: string;
    targetRegion: string;
    immutable: boolean;
    outputsProduct?: any;
  }) {}
} 