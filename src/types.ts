import {
    AccountsCentralView,
    GithubReposCentralView,
} from "@ondemandenv/contracts-lib-base/lib/OdmdContractsCentralView";
import { GithubRepo } from "@ondemandenv/contracts-lib-base";

/**
 * Extended GitHub repositories interface for RAG services
 */
export interface GithubReposRag extends GithubReposCentralView {
    ragDocumentIngestion: GithubRepo;
    ragDocumentProcessing: GithubRepo;
    ragEmbedding: GithubRepo;
    ragVectorStorage: GithubRepo;
    ragKnowledgeRetrieval: GithubRepo;
    ragGeneration: GithubRepo;
}

/**
 * Extended AWS accounts interface for RAG workloads
 */
export interface AccountsRag extends AccountsCentralView {
    workspace1: string;
    workspace2: string;
}