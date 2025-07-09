import {
    OdmdBuild,
    OdmdEnverCdk,
    SRC_Rev_REF,
    OdmdCrossRefProducer,
    OdmdCrossRefConsumer,
    OdmdEnverUserAuth
} from '@ondemandenv/contracts-lib-base';
import {RagContracts} from "../rag-contracts";
import {RagUserAuthEnver} from "./user-auth";

/**
 S3 bucket for document storage with status metadata
 */
export class DocumentStorageResourceProducer extends OdmdCrossRefProducer<RagDocumentIngestionEnver> {
    constructor(owner: RagDocumentIngestionEnver) {
        super(owner, 'store', {
            children: [
                {pathPart: 'schema', s3artifact: true},
                {pathPart: 'quarantine'}
            ]
        });
    }
    /**
     * S3 URL to the JSON schema for
     */
    public get docMetadataSchemaS3Url() {
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

        this.documentStorageResources = new DocumentStorageResourceProducer(this);

        this.authCallbackUrl = new OdmdCrossRefProducer(this, 'auth-callback-url');
        this.logoutUrl = new OdmdCrossRefProducer(this, 'logout-url');
    }

    readonly documentStorageResources: DocumentStorageResourceProducer;

    readonly authCallbackUrl: OdmdCrossRefProducer<RagDocumentIngestionEnver>;
    readonly logoutUrl: OdmdCrossRefProducer<RagDocumentIngestionEnver>;

    authProviderClientId!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;
    authProviderName!: OdmdCrossRefConsumer<this, OdmdEnverUserAuth>;


    wireConsuming() {
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
