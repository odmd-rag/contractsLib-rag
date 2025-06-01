// lib/repos/rag-knowledge-retrieval/RagKnowledgeRetrieval.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagKnowledgeRetrievalProducts {
    retrievalApiEndpoint: string;
    dynamoCacheTableName: string;
}

export class RagKnowledgeRetrievalBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-knowledge-retrieval-service',
            buildType: 'cdk',
        });
    }
}

export class RagKnowledgeRetrievalDevEnver extends OdmdEnver {
    public readonly products: Product<RagKnowledgeRetrievalProducts>;

    constructor(scope: any, id: string, build: RagKnowledgeRetrievalBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account',
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagKnowledgeRetrievalProducts>(this, 'Outputs');

        // Example Consumer: Consumes OpenSearch endpoint from Vector Storage
        // new Consumer(this, 'VectorStorageEndpointConsumer', vectorStorageDevEnver.products.opensearchEndpoint);
    }
}
