// lib/repos/rag-document-processing/RagDocumentProcessing.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagDocumentProcessingProducts {
    processedDocumentStreamArn: string; // Example: output Kinesis/SQS
}

export class RagDocumentProcessingBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-document-processing-service',
            buildType: 'cdk',
        });
    }
}

export class RagDocumentProcessingDevEnver extends OdmdEnver {
    public readonly products: Product<RagDocumentProcessingProducts>;

    constructor(scope: any, id: string, build: RagDocumentProcessingBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account',
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagDocumentProcessingProducts>(this, 'Outputs');

        // Example Consumer: Consumes Kinesis stream from Document Ingestion
        // new Consumer(this, 'DocIngestionKinesisConsumer', documentIngestionDevEnver.products.kinesisStreamArn);
    }
}
