# Embedding Service

## Overview

The Embedding Service is the **AI-powered transformation layer** that converts processed text chunks into **high-dimensional vector representations**. It enables semantic search and retrieval by transforming human-readable content into numerical vectors that capture semantic meaning.

## Core Purpose

Transform processed, chunked text content into optimized vector embeddings that enable similarity search, semantic retrieval, and context-aware responses in the RAG system.

## Responsibilities

### 1. Vector Embedding Generation
- **Text-to-Vector Transformation**: Convert text chunks to numerical vector representations
- **Amazon Bedrock Integration**: Leverage Titan Embed models for high-quality embeddings
- **Batch Processing**: Optimize API calls through intelligent batching strategies
- **Model Selection**: Choose appropriate embedding models based on content type

### 2. Embedding Quality Management
- **Vector Validation**: Ensure embeddings meet quality and dimensional requirements
- **Consistency Checks**: Verify embedding consistency across similar content
- **Quality Metrics**: Track embedding generation success rates and quality scores
- **Error Detection**: Identify and handle failed or low-quality embeddings

### 3. Performance Optimization
- **Batch Processing**: Group chunks for efficient API utilization
- **Rate Limiting**: Respect Amazon Bedrock API limits and quotas
- **Load Balancing**: Distribute requests across available model endpoints
- **Cost Optimization**: Minimize embedding generation costs through batching

### 4. Metadata Enrichment
- **Context Preservation**: Maintain original document and chunk metadata
- **Embedding Metadata**: Add model information, dimensions, and quality metrics
- **Processing Metadata**: Include generation timestamps and processing statistics
- **Relationship Mapping**: Preserve chunk relationships and document structure

## Technical Architecture

### Technology Stack
- **AWS Lambda**: Serverless compute for stateless embedding generation
- **Amazon Bedrock**: AI service for embedding model access (Titan Embed)
- **EventBridge Subscription**: Receives processed content events
- **EventBridge Producer**: Publishes embedding events to vector storage
- **CloudWatch**: Monitoring and logging for embedding operations

### Why Lambda Over ECS?
- **Fast Processing**: Embedding generation typically completes in seconds
- **Stateless Operations**: No persistent state required between requests
- **Auto-scaling**: Handles variable chunk volumes automatically
- **Cost Effective**: Pay-per-use for actual processing time
- **Native Integration**: Seamless integration with Amazon Bedrock
- **Concurrent Processing**: Process multiple chunks simultaneously

### Processing Workflow
```typescript
// 1. Subscribe to document processing events
eventBridge.onEvent('rag.document.processing', 'Document Processed', async (event) => {
  const chunks = event.detail.chunks;
  
  // 2. Create optimal batches for processing
  const batches = createOptimalBatches(chunks);
  
  // 3. Process each batch concurrently
  const embeddingPromises = batches.map(batch => processEmbeddingBatch(batch));
  const embeddingResults = await Promise.all(embeddingPromises);
  
  // 4. Publish results to vector storage
  await publishEmbeddingsToStorage(embeddingResults.flat());
});

// 5. Generate embeddings using Amazon Bedrock
const processEmbeddingBatch = async (chunks) => {
  const embeddings = await Promise.all(
    chunks.map(chunk => 
      bedrock.invokeModel({
        modelId: 'amazon.titan-embed-text-v1',
        body: JSON.stringify({
          inputText: chunk.content,
          dimensions: 1536,
          normalize: true
        })
      })
    )
  );
  
  return embeddings.map((embedding, index) => ({
    ...chunks[index],
    vector: embedding.vector,
    metadata: {
      ...chunks[index].metadata,
      embeddingModel: 'amazon.titan-embed-text-v1',
      dimensions: 1536,
      generatedAt: new Date().toISOString()
    }
  }));
};
```

## AI Model Integration

### Amazon Bedrock Models

#### Titan Embed Text v1 (Primary)
```typescript
const titanEmbedConfig = {
  modelId: 'amazon.titan-embed-text-v1',
  dimensions: 1536,
  maxTokens: 8192,
  characteristics: {
    languages: ['English'],
    use_cases: ['document_search', 'semantic_similarity'],
    performance: 'high',
    cost: 'low'
  }
}
```

#### Alternative Models
- **Cohere Embed**: Better multilingual support
- **Custom Models**: Domain-specific fine-tuned models
- **Future Models**: Support for new Bedrock embedding models

### Model Selection Strategy
```typescript
const selectEmbeddingModel = (chunk) => {
  // Select model based on content characteristics
  if (chunk.metadata.language !== 'en') {
    return 'cohere.embed-multilingual-v3';
  }
  
  if (chunk.metadata.contentType === 'code') {
    return 'amazon.titan-embed-text-v1'; // Good for code
  }
  
  if (chunk.metadata.domain === 'medical') {
    return 'custom.medical-embed-v1'; // Domain-specific
  }
  
  return 'amazon.titan-embed-text-v1'; // Default
}
```

## Batching and Optimization

### Intelligent Batching Strategy
```typescript
const createOptimalBatches = (chunks) => {
  const BATCH_SIZE = 10; // Optimal for API throughput
  const batches = [];
  
  // Group by similar characteristics for consistent processing
  const groupedChunks = groupBy(chunks, chunk => ({
    model: selectEmbeddingModel(chunk),
    size: Math.floor(chunk.tokens / 100) * 100 // Group by size ranges
  }));
  
  // Create batches within each group
  Object.values(groupedChunks).forEach(group => {
    for (let i = 0; i < group.length; i += BATCH_SIZE) {
      batches.push({
        chunks: group.slice(i, i + BATCH_SIZE),
        model: group[0].model,
        estimatedTokens: group.slice(i, i + BATCH_SIZE)
          .reduce((sum, chunk) => sum + chunk.tokens, 0)
      });
    }
  });
  
  return batches;
}
```

### Rate Limiting and Cost Control
```typescript
const rateLimitConfig = {
  maxConcurrentRequests: 50,
  requestsPerSecond: 100,
  costThresholds: {
    hourly: 10.00,  // $10/hour
    daily: 200.00   // $200/day
  },
  retryStrategy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  }
}
```

## Producer-Consumer Pattern

### Input: Consumer from Document Processing
```typescript
export class RagEmbeddingEnver extends OdmdEnverCdk {
    // Subscribes to processed content events
    readonly processedContentSubscription: OdmdCrossRefConsumer<RagEmbeddingEnver, OdmdEnverCdk>;
}
```

### Output: Producer for Vector Storage
```typescript
export class EmbeddingEventsProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    // Publishes embedding events for vector storage
    public get eventBridge() // EventBridge bus for embedding events
}
```

## Event Schema

### Input Events (from Document Processing)
```json
{
  "source": "rag.document.processing",
  "detail-type": "Document Processed",
  "detail": {
    "documentId": "doc-123",
    "chunks": [
      {
        "chunkId": "doc-123-chunk-1",
        "content": "Clean, processed text content ready for embedding generation...",
        "metadata": {
          "position": 1,
          "tokens": 487,
          "contentType": "paragraph",
          "language": "en"
        }
      }
    ],
    "documentMetadata": {
      "title": "Document Title",
      "author": "Author Name",
      "domain": "general",
      "processingMetrics": {
        "chunksCount": 25,
        "processingTimeMs": 45000
      }
    }
  }
}
```

### Output Events (to Vector Storage)
```json
{
  "source": "rag.embedding",
  "detail-type": "Embeddings Generated",
  "detail": {
    "documentId": "doc-123",
    "embeddings": [
      {
        "chunkId": "doc-123-chunk-1",
        "vector": [0.123, -0.456, 0.789, ...], // 1536-dimensional vector
        "content": "Original text content for reference...",
        "metadata": {
          "position": 1,
          "tokens": 487,
          "contentType": "paragraph",
          "embeddingModel": "amazon.titan-embed-text-v1",
          "dimensions": 1536,
          "vectorNorm": 1.0,
          "generatedAt": "2024-01-15T10:35:00Z",
          "processingTimeMs": 250,
          "quality": {
            "score": 0.98,
            "confidence": 0.95
          }
        }
      }
    ],
    "batchMetrics": {
      "totalChunks": 25,
      "successfulEmbeddings": 25,
      "failedEmbeddings": 0,
      "totalProcessingTimeMs": 6250,
      "averageTimePerChunk": 250,
      "totalCost": 0.025
    }
  }
}
```

## Performance Characteristics

### Processing Metrics
- **Latency**: 100ms - 2 seconds per chunk
- **Throughput**: 100-1000 chunks per minute
- **Batch Size**: 10 chunks optimal for API efficiency
- **Concurrent Batches**: Up to 50 concurrent Lambda executions
- **Success Rate**: 99.5%+ embedding generation success

### Cost Optimization
```typescript
const costMetrics = {
  titanEmbedCost: 0.0001, // $ per 1K tokens
  lambdaCost: 0.0000002, // $ per 1ms execution
  estimatedCostPerDocument: (tokens) => {
    const embeddingCost = (tokens / 1000) * 0.0001;
    const lambdaCost = 0.001; // ~5 seconds average
    return embeddingCost + lambdaCost;
  }
}
```

### Scaling Characteristics
- **Auto-scaling**: Lambda concurrency scales to 1000 by default
- **Cold Starts**: ~500ms initialization time
- **Warm Performance**: ~100ms per embedding after warm-up
- **Memory Usage**: 512MB - 1GB per Lambda function
- **Timeout**: 5 minutes maximum per batch

## Error Handling

### Embedding Failures
```typescript
const handleEmbeddingError = async (chunk, error) => {
  if (error.code === 'ThrottlingException') {
    // Exponential backoff retry
    await exponentialBackoff(() => generateEmbedding(chunk));
  } else if (error.code === 'ValidationException') {
    // Content too long or invalid
    await splitAndRetryChunk(chunk);
  } else {
    // Send to DLQ for manual review
    await sendToDeadLetterQueue(chunk, error);
  }
}
```

### Quality Assurance
```typescript
const validateEmbedding = (embedding, originalChunk) => {
  const validations = {
    dimensionCheck: embedding.vector.length === 1536,
    vectorNormCheck: calculateVectorNorm(embedding.vector) > 0,
    contentLengthCheck: originalChunk.content.length > 0,
    tokenCountCheck: originalChunk.tokens <= 8192
  };
  
  const isValid = Object.values(validations).every(check => check);
  
  return {
    isValid,
    validations,
    quality: calculateEmbeddingQuality(embedding, originalChunk)
  };
}
```

## Monitoring and Observability

### CloudWatch Metrics
- Embedding generation success/failure rates
- Processing latency and throughput
- API call costs and usage patterns
- Lambda function performance and errors
- Bedrock model utilization and costs

### Custom Metrics
```typescript
const publishMetrics = async (metrics) => {
  await cloudWatch.putMetricData({
    Namespace: 'RAG/Embedding',
    MetricData: [
      {
        MetricName: 'EmbeddingSuccessRate',
        Value: metrics.successRate,
        Unit: 'Percent'
      },
      {
        MetricName: 'AverageProcessingTime',
        Value: metrics.averageProcessingTime,
        Unit: 'Milliseconds'
      },
      {
        MetricName: 'CostPerEmbedding',
        Value: metrics.costPerEmbedding,
        Unit: 'None'
      }
    ]
  });
}
```

### Alerting
- Failed embedding generation rate > 1%
- Processing time > 10 seconds per chunk
- Daily costs > $200 threshold
- API rate limit approaching
- Lambda function errors or timeouts

## Integration Points

### Upstream Integration
- **Input**: EventBridge events from Document Processing Service
- **Triggers**: Document processed completion events
- **Dependencies**: Amazon Bedrock model availability

### Downstream Integration
- **Output**: EventBridge events to Vector Storage Service
- **Monitoring**: CloudWatch metrics and logs
- **Cost Tracking**: AWS Cost Explorer integration

## Environment Configuration

### Development Environment
- **Account**: `workspace0` (975050243618)
- **Region**: `us-east-1`
- **Branch**: `dev`
- **Lambda Concurrency**: Limited to 10 concurrent executions
- **Bedrock Models**: Development model access

### Production Environment
- **Account**: `workspace1` (590184130740)
- **Region**: `us-east-1`
- **Branch**: `main`
- **Lambda Concurrency**: Full scaling up to 1000 executions
- **Bedrock Models**: Production model access with higher quotas

## Repository Structure

- **Repository**: `rag-embedding-service`
- **Organization**: `odmd-rag`
- **Infrastructure**: AWS CDK for Lambda functions and Bedrock integration
- **Deployment**: Serverless framework with automated CI/CD

## Implementation Status

✅ **Architecture**: Event-driven embedding pipeline designed  
✅ **Contracts**: Producer-consumer patterns defined  
✅ **AI Integration**: Amazon Bedrock Titan Embed model configured  
✅ **Batching**: Optimal batching and cost optimization strategies  
✅ **Error Handling**: Comprehensive error handling and quality assurance  
✅ **Monitoring**: CloudWatch metrics and alerting configured  

## Next Steps

1. **Lambda Development**: Build embedding generation functions
2. **Bedrock Integration**: Implement Amazon Bedrock API integration
3. **Batching Logic**: Develop intelligent batching algorithms
4. **Quality Metrics**: Implement embedding quality validation
5. **Cost Optimization**: Fine-tune batching for cost efficiency
6. **Performance Testing**: Load testing with various document types
7. **Model Evaluation**: Compare different embedding models for quality
8. **Integration Testing**: End-to-end testing with processing and storage services 