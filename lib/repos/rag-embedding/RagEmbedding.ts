// lib/repos/rag-embedding/RagEmbedding.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagEmbeddingProducts {
    embeddingOutputTopicArn: string; // Example: or stream for vector storage
}

export class RagEmbeddingBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-embedding-service',
            buildType: 'cdk',
        });
    }
}

export class RagEmbeddingDevEnver extends OdmdEnver {
    public readonly products: Product<RagEmbeddingProducts>;

    constructor(scope: any, id: string, build: RagEmbeddingBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account',
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagEmbeddingProducts>(this, 'Outputs');

        // Example Consumer: Consumes Kinesis stream from Document Processing
        // new Consumer(this, 'DocProcessingStreamConsumer', documentProcessingDevEnver.products.processedDocumentStreamArn);
    }
}
