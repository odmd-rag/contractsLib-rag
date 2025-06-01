// lib/repos/rag-infrastructure/RagInfrastructure.ts
import { OdmdBuild, OdmdEnver, Product, Consumer, OdmdBuildProps, OdmdEnverProps, ProductProps, ConsumerProps } from 'ondemandenv-base-contracts'; // Placeholder

export interface RagInfrastructureProducts {
    sharedEventBusArn: string;
    centralSecretsManagerArn: string;
}

export class RagInfrastructureBuild extends OdmdBuild {
    constructor(scope: any, id: string, props?: OdmdBuildProps) {
        super(scope, id, {
            ...props,
            githubRepoAlias: 'odmd-rag/rag-infrastructure', // This repo might contain shared CDK constructs
            buildType: 'cdk',
        });
    }
}

export class RagInfrastructureDevEnver extends OdmdEnver {
    public readonly products: Product<RagInfrastructureProducts>;

    constructor(scope: any, id: string, build: RagInfrastructureBuild, props?: OdmdEnverProps) {
        super(scope, id, build, {
            ...props,
            targetAccountAlias: 'dev-account', // Shared infrastructure might target a central account
            targetRegion: 'us-east-1',
        });

        this.products = new Product<RagInfrastructureProducts>(this, 'Outputs');

        // Consumers: None, it provides.
    }
}
