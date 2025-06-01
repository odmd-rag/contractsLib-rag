import { Construct } from 'constructs';

// --- Placeholder definitions due to missing @ondemandenv/odmd-contracts-base ---
// Attempted to install '@ondemandenv/odmd-contracts-base' and 'ondemandenv-base-contracts', both failed.
// This is a critical issue for actual functionality but allows structural definition.

// Basic Construct-like class for placeholders
class BasePlaceholder extends Construct {
  constructor(scope: Construct, id: string, _props?: any) {
    super(scope, id);
  }
}

class OdmdContracts extends BasePlaceholder {}

class OdmdBuild extends BasePlaceholder {
  constructor(scope: Construct, id: string, props: { githubRepoAlias: string; buildType: string; sourcePath?: string; buildCommand?: string }) {
    super(scope, id, props);
    if (!props.githubRepoAlias || !props.buildType) {
      throw new Error("OdmdBuild placeholder requires githubRepoAlias and buildType");
    }
  }
}

class Product extends BasePlaceholder {}

class OdmdEnverCdk extends BasePlaceholder {
  public outputsProduct: Product; // Made public as per example
  constructor(scope: Construct, id: string, props: { build: OdmdBuild; targetAccountAlias: string; targetRegion: string; immutable: boolean; outputsProduct: Product; [key: string]: any; }) {
    super(scope, id, props);
    this.outputsProduct = props.outputsProduct; // Assign to public member
    if (!props.build || !props.targetAccountAlias || !props.targetRegion || props.immutable === undefined || !props.outputsProduct) {
      throw new Error("OdmdEnverCdk placeholder requires build, targetAccountAlias, targetRegion, immutable, and outputsProduct");
    }
  }
}

class Consumer extends BasePlaceholder {
    constructor(scope: Construct, id: string, product: Product, _defaultConfig?: string) {
        super(scope, id, { product: product }); // Pass product to base or handle as needed
        if (!product) {
            throw new Error("Consumer placeholder requires a product");
        }
    }
}
// --- End of Placeholder definitions ---

export class RagSystemContracts extends OdmdContracts {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // --- Document Ingestion Service ---
    const docIngestionBuild = new OdmdBuild(this, 'DocIngestionBuild', {
      githubRepoAlias: 'rag-document-ingestion-service', buildType: 'cdk', sourcePath: 'infra/',
    });
    const docIngestionDev = new OdmdEnverCdk(this, 'DocIngestionDev', {
      build: docIngestionBuild, targetAccountAlias: 'workspace0', targetRegion: 'us-east-1', immutable: false,
      outputsProduct: new Product(this, 'DocIngestionOutputs'),
    });

    // --- Document Processing Service ---
    const docProcessingBuild = new OdmdBuild(this, 'DocProcessingBuild', {
      githubRepoAlias: 'rag-document-processing-service', buildType: 'cdk', sourcePath: 'infra/',
    });
    const docProcessingDev = new OdmdEnverCdk(this, 'DocProcessingDev', {
      build: docProcessingBuild, targetAccountAlias: 'workspace0', targetRegion: 'us-east-1', immutable: false,
      outputsProduct: new Product(this, 'DocProcessingOutputs'),
      docIngestionConsumer: new Consumer(this, 'DocIngestionKinesis', docIngestionDev.outputsProduct),
    });

    // --- Embedding Service ---
    const embeddingBuild = new OdmdBuild(this, 'EmbeddingBuild', {
      githubRepoAlias: 'rag-embedding-service', buildType: 'cdk', sourcePath: 'infra/',
    });
    const embeddingDev = new OdmdEnverCdk(this, 'EmbeddingDev', {
      build: embeddingBuild, targetAccountAlias: 'workspace0', targetRegion: 'us-east-1', immutable: false,
      outputsProduct: new Product(this, 'EmbeddingOutputs'),
      docProcessingConsumer: new Consumer(this, 'DocProcessingKinesisOrSqs', docProcessingDev.outputsProduct),
    });

    // --- Vector Storage Service ---
    const vectorStorageBuild = new OdmdBuild(this, 'VectorStorageBuild', {
      githubRepoAlias: 'rag-vector-storage-service', buildType: 'cdk', sourcePath: 'infra/',
    });
    const vectorStorageDev = new OdmdEnverCdk(this, 'VectorStorageDev', {
      build: vectorStorageBuild, targetAccountAlias: 'workspace0', targetRegion: 'us-east-1', immutable: false,
      outputsProduct: new Product(this, 'VectorStorageOutputs'),
      embeddingConsumer: new Consumer(this, 'EmbeddingKinesisOrSqs', embeddingDev.outputsProduct),
    });

    // --- Knowledge Retrieval Service ---
    const knowledgeRetrievalBuild = new OdmdBuild(this, 'KnowledgeRetrievalBuild', {
      githubRepoAlias: 'rag-knowledge-retrieval-service', buildType: 'cdk', sourcePath: 'infra/',
    });
    const knowledgeRetrievalDev = new OdmdEnverCdk(this, 'KnowledgeRetrievalDev', {
      build: knowledgeRetrievalBuild, targetAccountAlias: 'workspace0', targetRegion: 'us-east-1', immutable: false,
      outputsProduct: new Product(this, 'KnowledgeRetrievalOutputs'),
      vectorStorageConsumer: new Consumer(this, 'VectorStorageOpenSearch', vectorStorageDev.outputsProduct),
    });

    // --- Generation Service ---
    const generationBuild = new OdmdBuild(this, 'GenerationBuild', {
      githubRepoAlias: 'rag-generation-service', buildType: 'cdk', sourcePath: 'infra/',
    });
    const generationDev = new OdmdEnverCdk(this, 'GenerationDev', {
      build: generationBuild, targetAccountAlias: 'workspace0', targetRegion: 'us-east-1', immutable: false,
      outputsProduct: new Product(this, 'GenerationOutputs'),
    });

    // --- Orchestration Service ---
    const orchestrationBuild = new OdmdBuild(this, 'OrchestrationBuild', {
      githubRepoAlias: 'rag-orchestration-service',
      buildType: 'cdk', // AWS Step Functions + Lambda
      sourcePath: 'infra/',
    });

    const orchestrationDev = new OdmdEnverCdk(this, 'OrchestrationDev', {
      build: orchestrationBuild,
      targetAccountAlias: 'workspace0',
      targetRegion: 'us-east-1',
      immutable: false,
      outputsProduct: new Product(this, 'OrchestrationOutputs'), // Will publish Step Functions State Machine ARN
      // Consumes Knowledge Retrieval and Generation services' outputs
      knowledgeRetrievalConsumer: new Consumer(this, 'KnowledgeRetrievalApi', knowledgeRetrievalDev.outputsProduct),
      generationConsumer: new Consumer(this, 'GenerationApiOrArn', generationDev.outputsProduct),
    });

  }
}
