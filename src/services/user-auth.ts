import {
    SRC_Rev_REF,
    OdmdCrossRefProducer,
    OdmdCrossRefConsumer, OdmdEnverUserAuth
} from "@ondemandenv/contracts-lib-base";
import type {RagContracts} from "../rag-contracts";
import {IOdmdEnver} from "@ondemandenv/contracts-lib-base/lib/model/odmd-enver";
import {OdmdBuildUserAuth} from "@ondemandenv/contracts-lib-base/lib/repos/__user-auth/odmd-build-user-auth";

export class RagUserAuthBuild extends OdmdBuildUserAuth {
    public get envers(): RagUserAuthEnver[] {
        return this._envers as RagUserAuthEnver[];
    }

    protected initializeEnvers(): void {
        this._envers = [
            new RagUserAuthEnver(this, this.contracts.accounts.workspace1, 'us-east-2',
                new SRC_Rev_REF('b', 'odmd-rag'))
        ];
    }

    get contracts() {
        return this.node.scope as RagContracts;
    }
}

export class RagUserAuthEnver extends OdmdEnverUserAuth {
    readonly owner: RagUserAuthBuild;

    constructor(owner: RagUserAuthBuild, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.owner = owner;
    }

    wireConsuming() {
        // Wire consuming from other RAG services that need authentication
        // Each service enver produces callback/logout URLs, and this single user-auth enver consumes them

        // Get contracts reference
        const ragContracts = this.owner.contracts as RagContracts;

        // Wire callbacks from document ingestion service (dev and prod envers)
        ragContracts.ragDocumentIngestionBuild.envers.forEach((e, index) => {
            this.callbackUrls.push(new OdmdCrossRefConsumer(this, `doc-ing-callback-${index}`, e.authCallbackUrl));
            this.logoutUrls.push(new OdmdCrossRefConsumer(this, `doc-ing-logout-${index}`, e.logoutUrl));
        });

        // Note: Knowledge retrieval and generation services will be added when they implement callback/logout URLs
    }

    getRevStackNames(): Array<string> {
        const name = super.getRevStackNames()[0];
        return [name, name + '-web-hosting', name + '-web-ui'];
    }
} 