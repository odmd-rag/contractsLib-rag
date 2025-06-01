// lib/repos/rag-vector-storage/RagVectorStorage.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagVectorStorageProducts {
    opensearchEndpoint: string;
    opensearchIndexName: string;
}

export class RagVectorStorageBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-vector-storage-service',
            buildType: 'cdk',
        });
    }
}

export class RagVectorStorageDevEnver extends OdmdEnver {
    public readonly products: Product<RagVectorStorageProducts>;

    constructor(scope: any, id: string, build: RagVectorStorageBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account',
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagVectorStorageProducts>(this, 'Outputs');

        // Example Consumer: Consumes output from Embedding Service
        // new Consumer(this, 'EmbeddingOutputConsumer', embeddingDevEnver.products.embeddingOutputTopicArn);
    }
}
