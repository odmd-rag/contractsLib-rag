import { OdmdBuildContractsLib, OdmdEnverContractsLib, SRC_Rev_REF } from "@ondemandenv/contracts-lib-base";
import type { AccountsRag, GithubReposRag } from "./types";
import type { RagContracts } from "./rag-contracts";

/**
 * RAG Build Contracts - manages all RAG service builds
 */
export class OdmdBuildContractsRag extends OdmdBuildContractsLib<AccountsRag, GithubReposRag> {
    private _envers!: OdmdEnverContractsLib[];
    get envers(): OdmdEnverContractsLib[] {
        return this._envers;
    }

    ownerEmail?: string | undefined;

    public get packageName(): string {
        return '@odmd-rag/contracts-lib-rag';
    }

    get pkgOrg(): string {
        return '@odmd-rag';
    }

    constructor(scope: RagContracts) {
        super(scope, 'rag-contracts-npm');
    }

    protected initializeEnvers(): void {
        this._envers = [
            new OdmdEnverContractsLib(
                this,
                this.contracts.accounts.workspace0,
                'us-east-2',
                new SRC_Rev_REF("b", "main")
            )
        ];
    }

    get contracts(): RagContracts {
        return super.contracts as RagContracts;
    }
} 