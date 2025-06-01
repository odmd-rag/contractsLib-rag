// lib/repos/rag-generation/RagGeneration.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagGenerationProducts {
    generationApiEndpoint: string;
    websocketApiEndpoint: string;
}

export class RagGenerationBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-generation-service',
            buildType: 'cdk',
        });
    }
}

export class RagGenerationDevEnver extends OdmdEnver {
    public readonly products: Product<RagGenerationProducts>;

    constructor(scope: any, id: string, build: RagGenerationBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account',
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagGenerationProducts>(this, 'Outputs');

        // Consumers: (Potentially context from Knowledge Retrieval - though this might be an API call rather than a direct Product consumption)
    }
}
