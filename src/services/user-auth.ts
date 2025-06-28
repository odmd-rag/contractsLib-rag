import {
    SRC_Rev_REF,
    OdmdCrossRefProducer,
    OdmdCrossRefConsumer, OdmdEnverUserAuth
} from "@ondemandenv/contracts-lib-base";
import type {RagContracts} from "../rag-contracts";
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
        this.homeServerDomainName = new OdmdCrossRefProducer(this, 'home-server-domain-name')
    }

    /**
     * as a placeholder, manually change to real value
     */
    readonly homeServerDomainName: OdmdCrossRefProducer<RagUserAuthEnver>;

    wireConsuming() {

        const ragContracts = this.owner.contracts as RagContracts;

        ragContracts.ragDocumentIngestionBuild.envers.forEach((e, index) => {
            this.callbackUrls.push(new OdmdCrossRefConsumer(this, `doc-ing-callback-${index}`, e.authCallbackUrl, {
                trigger: 'directly',
                defaultIfAbsent: 'http://localhost:1234/callback'
            }));
            this.logoutUrls.push(new OdmdCrossRefConsumer(this, `doc-ing-logout-${index}`, e.logoutUrl, {
                trigger: 'directly',
                defaultIfAbsent: 'http://localhost:1234/logout'
            }));
        });

    }

    getRevStackNames(): Array<string> {
        const name = super.getRevStackNames()[0];
        return [name, name + '-web-hosting', name + '-web-ui'];
    }
} 