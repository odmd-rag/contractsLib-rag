# Service Implementation Example

This example shows how to implement the **Vector Storage Service** that consumes outputs from the **Embedding Service** using the OnDemandEnv platform.

## Repository Structure: `rag-vector-storage-service`

```
rag-vector-storage-service/
├── infra/
│   ├── lib/
│   │   └── vector-storage-stack.ts
│   ├── bin/
│   │   └── app.ts
│   └── package.json
├── src/
│   ├── lambda/
│   │   ├── store-embeddings.ts
│   │   └── search-vectors.ts
│   └── utils/
│       └── opensearch-client.ts
├── package.json
└── README.md
```

## 1. CDK Infrastructure (`infra/lib/vector-storage-stack.ts`)

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { OdmdEnverCdk, OdmdShareOut } from '@ondemandenv/contracts-lib-base';

interface EmbeddingServiceOutputs {
  embeddingStreamArn: string;
  embeddingStreamName: string;
  bedrockRegion: string;
}

export class VectorStorageStack extends OdmdEnverCdk {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Consume Embedding Service Outputs ---
    const embeddingOutputsJson = OdmdEnverCdk.getSharedValue('EmbeddingOutputs');
    const embeddingOutputs: EmbeddingServiceOutputs = JSON.parse(embeddingOutputsJson || '{}');

    // --- OpenSearch Serverless Collection ---
    const vectorCollection = new opensearch.CfnCollection(this, 'VectorCollection', {
      name: `rag-vectors-${OdmdEnverCdk.getEnverIdSuffix()}`,
      type: 'VECTORSEARCH',
      description: 'Vector embeddings storage for RAG system',
    });

    // Collection access policy
    const collectionAccessPolicy = new opensearch.CfnAccessPolicy(this, 'CollectionAccessPolicy', {
      name: `rag-vectors-access-${OdmdEnverCdk.getEnverIdSuffix()}`,
      type: 'data',
      policy: JSON.stringify([
        {
          "Rules": [
            {
              "Resource": [`collection/${vectorCollection.name}`],
              "Permission": [
                "aoss:CreateCollectionItems",
                "aoss:DeleteCollectionItems",
                "aoss:UpdateCollectionItems",
                "aoss:DescribeCollectionItems"
              ],
              "ResourceType": "collection"
            },
            {
              "Resource": [`index/${vectorCollection.name}/*`],
              "Permission": [
                "aoss:CreateIndex",
                "aoss:DeleteIndex",
                "aoss:UpdateIndex",
                "aoss:DescribeIndex",
                "aoss:ReadDocument",
                "aoss:WriteDocument"
              ],
              "ResourceType": "index"
            }
          ],
          "Principal": [`arn:aws:iam::${cdk.Stack.of(this).account}:root`]
        }
      ])
    });

    // --- Lambda: Store Embeddings ---
    const storeEmbeddingsLambda = new lambda.Function(this, 'StoreEmbeddingsLambda', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'store-embeddings.handler',
      code: lambda.Code.fromAsset('../src/lambda'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
        OPENSEARCH_COLLECTION_NAME: vectorCollection.name!,
        EMBEDDING_STREAM_NAME: embeddingOutputs.embeddingStreamName,
      }
    });

    // --- Lambda: Search Vectors ---
    const searchVectorsLambda = new lambda.Function(this, 'SearchVectorsLambda', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'search-vectors.handler',
      code: lambda.Code.fromAsset('../src/lambda'),
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      environment: {
        OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
        OPENSEARCH_COLLECTION_NAME: vectorCollection.name!,
      }
    });

    // Grant OpenSearch permissions
    const opensearchPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'aoss:APIAccessAll'
      ],
      resources: [vectorCollection.attrArn]
    });

    storeEmbeddingsLambda.addToRolePolicy(opensearchPolicy);
    searchVectorsLambda.addToRolePolicy(opensearchPolicy);

    // Grant Kinesis permissions for consuming embeddings
    if (embeddingOutputs.embeddingStreamArn) {
      const kinesisPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kinesis:DescribeStream',
          'kinesis:GetShardIterator',
          'kinesis:GetRecords',
          'kinesis:ListShards'
        ],
        resources: [embeddingOutputs.embeddingStreamArn]
      });
      storeEmbeddingsLambda.addToRolePolicy(kinesisPolicy);

      // Kinesis event source mapping
      new lambda.EventSourceMapping(this, 'EmbeddingStreamMapping', {
        eventSourceArn: embeddingOutputs.embeddingStreamArn,
        target: storeEmbeddingsLambda,
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        parallelizationFactor: 2,
      });
    }

    // --- API Gateway for Vector Search ---
    const vectorApi = new apigw.RestApi(this, 'VectorSearchApi', {
      restApiName: `vector-search-${OdmdEnverCdk.getEnverIdSuffix()}`,
      description: 'Vector similarity search API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const searchResource = vectorApi.root.addResource('search');
    searchResource.addMethod('POST', new apigw.LambdaIntegration(searchVectorsLambda));

    // Health check endpoint
    const healthResource = vectorApi.root.addResource('health');
    healthResource.addMethod('GET', new apigw.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': '{"status": "healthy", "service": "vector-storage"}'
        }
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': apigw.Model.EMPTY_MODEL
        }
      }]
    });

    // --- Publish Service Outputs ---
    const outputs = {
      opensearchEndpoint: vectorCollection.attrCollectionEndpoint,
      opensearchCollectionName: vectorCollection.name,
      opensearchCollectionArn: vectorCollection.attrArn,
      searchApiUrl: vectorApi.url,
      searchApiId: vectorApi.restApiId,
      storeEmbeddingsLambdaArn: storeEmbeddingsLambda.functionArn,
      searchVectorsLambdaArn: searchVectorsLambda.functionArn,
    };

    new OdmdShareOut(this, 'Outputs', {
      value: cdk.Stack.of(this).toJsonString(outputs)
    });
  }
}
```

## 2. Lambda Functions

### Store Embeddings (`src/lambda/store-embeddings.ts`)

```typescript
import { KinesisStreamHandler, KinesisStreamEvent } from 'aws-lambda';
import { OpenSearchClient } from '../utils/opensearch-client';

interface EmbeddingRecord {
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    timestamp: string;
    contentType: string;
    chunkIndex?: number;
  };
}

const opensearchClient = new OpenSearchClient(
  process.env.OPENSEARCH_ENDPOINT!,
  process.env.OPENSEARCH_COLLECTION_NAME!
);

export const handler: KinesisStreamHandler = async (event: KinesisStreamEvent) => {
  console.log('Processing', event.Records.length, 'embedding records');

  const promises = event.Records.map(async (record) => {
    try {
      // Decode Kinesis record
      const data = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
      const embeddingRecord: EmbeddingRecord = JSON.parse(data);

      // Store in OpenSearch
      await opensearchClient.indexDocument({
        index: 'embeddings',
        id: embeddingRecord.documentId,
        body: {
          content: embeddingRecord.content,
          embedding: embeddingRecord.embedding,
          metadata: embeddingRecord.metadata,
          timestamp: new Date().toISOString(),
        }
      });

      console.log('Stored embedding for document:', embeddingRecord.documentId);
    } catch (error) {
      console.error('Error processing record:', error);
      throw error; // This will cause the batch to be retried
    }
  });

  await Promise.all(promises);
  console.log('Successfully processed all embedding records');
};
```

### Search Vectors (`src/lambda/search-vectors.ts`)

```typescript
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OpenSearchClient } from '../utils/opensearch-client';

interface SearchRequest {
  query: string;
  k?: number; // Number of results to return
  threshold?: number; // Similarity threshold
  filters?: Record<string, any>;
}

interface SearchResult {
  documentId: string;
  content: string;
  score: number;
  metadata: any;
}

const opensearchClient = new OpenSearchClient(
  process.env.OPENSEARCH_ENDPOINT!,
  process.env.OPENSEARCH_COLLECTION_NAME!
);

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const searchRequest: SearchRequest = JSON.parse(event.body);
    const { query, k = 10, threshold = 0.7, filters = {} } = searchRequest;

    // For this example, we'll assume the query embedding is provided
    // In a real implementation, you'd call the embedding service here
    const queryEmbedding = await getQueryEmbedding(query);

    // Perform vector similarity search
    const searchResponse = await opensearchClient.search({
      index: 'embeddings',
      body: {
        size: k,
        query: {
          bool: {
            must: [
              {
                knn: {
                  embedding: {
                    vector: queryEmbedding,
                    k: k * 2, // Search more, then filter
                  }
                }
              }
            ],
            filter: Object.entries(filters).map(([key, value]) => ({
              term: { [`metadata.${key}`]: value }
            }))
          }
        },
        _source: ['content', 'metadata'],
        min_score: threshold,
      }
    });

    const results: SearchResult[] = searchResponse.body.hits.hits.map((hit: any) => ({
      documentId: hit._id,
      content: hit._source.content,
      score: hit._score,
      metadata: hit._source.metadata,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        results,
        total: results.length,
        query,
      }),
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function getQueryEmbedding(query: string): Promise<number[]> {
  // In a real implementation, this would call the embedding service
  // For now, return a mock embedding
  return Array.from({ length: 1536 }, () => Math.random());
}
```

## 3. Deployment

Once implemented, the OnDemandEnv platform will automatically:

1. **Detect changes** when you push to the repository
2. **Build the service** using the CDK configuration
3. **Deploy infrastructure** with proper dependency injection
4. **Update consumers** when this service publishes new outputs

## 4. Cross-Service Communication

The beauty of the OnDemandEnv approach is that services don't need to know about each other directly. The platform handles:

- **Dependency injection** through the Consumer/Producer pattern
- **Automatic redeployment** when dependencies change
- **Environment isolation** with unique resource naming
- **Service discovery** through shared outputs

This creates a truly decoupled, scalable RAG system that can be developed and deployed independently by different teams. 