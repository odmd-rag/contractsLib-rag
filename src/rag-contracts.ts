import {App} from 'aws-cdk-lib';
import {OndemandContracts, OdmdBuildNetworking} from "@ondemandenv/contracts-lib-base";

// Import types
import type {AccountsRag, GithubReposRag} from "./types";

// Import service classes
import {RagDocumentIngestionBuild} from "./services/document-ingestion";
import {RagDocumentProcessingBuild} from "./services/document-processing";
import {RagEmbeddingBuild} from "./services/embedding";
import {RagVectorStorageBuild} from "./services/vector-storage";
import {RagKnowledgeRetrievalBuild} from "./services/knowledge-retrieval";
import {RagGenerationBuild} from "./services/generation";
import {RagUserAuthBuild, RagUserAuthEnver} from "./services/user-auth";

// Import contracts build
import {OdmdBuildContractsRag} from "./contracts-build";

/**
 * Main RAG Contracts class extending OndemandContracts
 * Implements the singleton pattern for consistent contract access
 */
export class RagContracts extends OndemandContracts<AccountsRag, GithubReposRag, OdmdBuildContractsRag> {

    /**
     * Singleton instance
     */
    private static _inst: RagContracts;

    /**
     * Get singleton instance of RagContracts
     */
    public static get inst(): RagContracts {
        return RagContracts._inst;
    }

    /**
     * Constructor following OndemandEnv platform patterns
     */
    constructor(app: App) {
        super(app, 'RagContracts');

        if (RagContracts._inst) {
            throw new Error('RagContracts is a singleton - not allowed to create multiple instances');
        }
        RagContracts._inst = this;

        // Initialize all service builds
        this.ragDocumentIngestionBuild = new RagDocumentIngestionBuild(this);
        this.ragDocumentProcessingBuild = new RagDocumentProcessingBuild(this);
        this.ragEmbeddingBuild = new RagEmbeddingBuild(this);
        this.ragVectorStorageBuild = new RagVectorStorageBuild(this);
        this.ragKnowledgeRetrievalBuild = new RagKnowledgeRetrievalBuild(this);
        this.ragGenerationBuild = new RagGenerationBuild(this);

        // Validate no duplicate builds
        let tmpSet = new Set(this.odmdBuilds);
        if (tmpSet.size != this.odmdBuilds.length) {
            tmpSet.forEach(b => {
                const i = this.odmdBuilds.indexOf(b);
                this.odmdBuilds.splice(i, 1);
            });
            throw new Error('Duplicated builds detected!');
        }

        // Validate environment variables
        if (!process.env.CDK_CLI_VERSION) {
            throw new Error("CDK_CLI_VERSION environment variable is required!");
        }

        const buildRegion = process.env.CDK_DEFAULT_REGION;
        let buildAccount: string;
        if (process.env.CDK_DEFAULT_ACCOUNT) {
            buildAccount = process.env.CDK_DEFAULT_ACCOUNT;
        } else {
            console.log(`CDK_DEFAULT_ACCOUNT undefined, trying CodeBuild: ${process.env.CODEBUILD_BUILD_ARN}`);
            if (!process.env.CODEBUILD_BUILD_ARN) {
                throw new Error(`CODEBUILD_BUILD_ARN undefined, unable to initialize without account information.`);
            }
            buildAccount = process.env.CODEBUILD_BUILD_ARN!.split(":")[4];
        }
        if (!buildRegion || !buildAccount) {
            throw new Error("buildRegion>" + buildRegion + "; buildAccount>" + buildAccount);
        }

        // Wire all consuming relationships
        // Note: Document ingestion must be wired last since it consumes status APIs from other services
        this.ragDocumentProcessingBuild.wireConsuming();
        this.ragVectorStorageBuild.wireConsuming();
        this.ragKnowledgeRetrievalBuild.wireConsuming();
        (this.userAuth!.envers[0] as RagUserAuthEnver).wireConsuming();
        
        // Wire document ingestion last since it consumes from other services
        this.ragDocumentIngestionBuild.wireConsuming();

        this.odmdBuilds.forEach(build => {
            console.log(build.buildId)
        })
    }

    createContractsLibBuild(): OdmdBuildContractsRag {
        return new OdmdBuildContractsRag(this);
    }

    protected initializeUserAuth() {
        this._userAuth = new RagUserAuthBuild(this);
    }

    protected initializeEksCluster() {
        // RAG system doesn't need EKS - using serverless only
        this._eksCluster = undefined;
    }

    protected initializeNetworking() {
        // RAG system uses networking for platform integration
        this._networking = new OdmdBuildNetworking(this);
    }

    private _accounts!: AccountsRag;
    get accounts(): AccountsRag {
        if (!this._accounts) {
            this._accounts = {
                central: '877679826644',      // Central management account
                workspace0: "447839931803",   // builtin workspace
                workspace1: '366920167720',   // dev workspace
                workspace2: '217471730138',   // Production workspace
            };
        }
        return this._accounts;
    }

    private _allAccounts!: string[];
    get allAccounts(): string[] {
        if (!this._allAccounts) {
            const accEntries = Object.entries(this.accounts);
            if (Array.from(accEntries.keys()).length != Array.from(accEntries.values()).length) {
                throw new Error("Account name to number mapping must be 1:1!");
            }
            this._allAccounts = Object.values(this.accounts);
        }
        return this._allAccounts;
    }

    private _githubRepos!: GithubReposRag;
    get githubRepos(): GithubReposRag {
        if (!this._githubRepos) {
            const ghAppInstallID = 69236037
            this._githubRepos = {
                githubAppId: "1351746",
                __contracts: {
                    owner: 'odmd-rag',
                    name: 'contractsLib-rag',
                    ghAppInstallID
                },
                __userAuth: {
                    owner: 'odmd-rag',
                    name: 'user-auth',
                    ghAppInstallID
                },
                // RAG-specific service repositories
                ragDocumentIngestion: {
                    owner: 'odmd-rag',
                    name: 'rag-document-ingestion-service',
                    ghAppInstallID
                },
                ragDocumentProcessing: {
                    owner: 'odmd-rag',
                    name: 'rag-document-processing-service',
                    ghAppInstallID
                },
                ragEmbedding: {
                    owner: 'odmd-rag',
                    name: 'rag-embedding-service',
                    ghAppInstallID
                },
                ragVectorStorage: {
                    owner: 'odmd-rag',
                    name: 'rag-vector-storage-service',
                    ghAppInstallID
                },
                ragKnowledgeRetrieval: {
                    owner: 'odmd-rag',
                    name: 'rag-knowledge-retrieval-service',
                    ghAppInstallID
                },
                ragGeneration: {
                    owner: 'odmd-rag',
                    name: 'rag-generation-service',
                    ghAppInstallID
                }
            };
        }
        return this._githubRepos;
    }

    // RAG Service Build instances
    public readonly ragDocumentIngestionBuild: RagDocumentIngestionBuild;
    public readonly ragDocumentProcessingBuild: RagDocumentProcessingBuild;
    public readonly ragEmbeddingBuild: RagEmbeddingBuild;
    public readonly ragVectorStorageBuild: RagVectorStorageBuild;
    public readonly ragKnowledgeRetrievalBuild: RagKnowledgeRetrievalBuild;
    public readonly ragGenerationBuild: RagGenerationBuild;
} 