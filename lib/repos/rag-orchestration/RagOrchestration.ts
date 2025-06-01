// lib/repos/rag-orchestration/RagOrchestration.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagOrchestrationProducts {
    stepFunctionsArn: string;
}

export class RagOrchestrationBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-orchestration-service',
            buildType: 'cdk',
        });
    }
}

export class RagOrchestrationDevEnver extends OdmdEnver {
    public readonly products: Product<RagOrchestrationProducts>;

    constructor(scope: any, id: string, build: RagOrchestrationBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account',
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagOrchestrationProducts>(this, 'Outputs');

        // Consumers: Likely consumes Products (like API endpoints or ARNs) from many other services
        // Example:
        // new Consumer(this, 'RetrievalApiConsumer', knowledgeRetrievalDevEnver.products.retrievalApiEndpoint);
        // new Consumer(this, 'GenerationApiConsumer', generationDevEnver.products.generationApiEndpoint);
    }
}
