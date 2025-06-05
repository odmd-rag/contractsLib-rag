# Vector Storage Service

## Overview

The Vector Storage Service is the **persistent memory and search engine** of the RAG system. It transforms the system from a simple document processor into a **semantic search engine**, serving as the bridge between AI-generated embeddings and fast similarity search capabilities.

## Core Purpose in the Big Picture

**Vector Storage** is where the AI-generated embeddings become queryable knowledge. It enables:
- **Input**: High-dimensional vector embeddings (from Embedding Service)  
- **Output**: Fast similarity search capabilities (for Knowledge Retrieval Service)
- **Transformation**: Raw vectors → Searchable semantic knowledge base

## Responsibilities

### 1. Persistent Vector Database
- **Store 1536-dimensional vectors** from embedding service with optimal indexing
- **Maintain vector-to-content mapping** preserving original text chunks
- **Preserve document relationships** and hierarchical document structure
- **Handle massive scale** supporting millions of vectors with sub-second search
- **Data durability** with automated backups and disaster recovery

### 2. Advanced Indexing for Similarity Search
```typescript
// The magic: Convert user questions into searchable vectors
const userQuestion = "What is the company's refund policy?";
const questionEmbedding = await embedQuestion(userQuestion);

// Vector storage finds semantically similar content
const similarChunks = await vectorStorage.similaritySearch(questionEmbedding, {
  limit: 10,
  threshold: 0.7,  // Cosine similarity threshold
  filters: {
    documentType: 'policy',
    contentType: 'paragraph'
  }
});
```

### 3. Metadata-Rich Storage
```json
{
  "vectorId": "vec-doc123-chunk5",
  "vector": [0.123, -0.456, 0.789, ...], // 1536 dimensions
  "content": "Our refund policy allows returns within 30 days...",
  "metadata": {
    "documentId": "doc-123",
    "chunkPosition": 5,
    "documentTitle": "Customer Service Policies",
    "contentType": "policy_text",
    "author": "Legal Team",
    "lastUpdated": "2024-01-15",
    "domain": "customer_service",
    "language": "en",
    "importance": 0.85
  }
}
```

### 4. Multi-Modal Search Capabilities
- **Semantic similarity**: Find content by meaning, not keywords
- **Hybrid search**: Combine vector search with traditional text search
- **Filtered search**: Search within document types, authors, dates
- **Contextual search**: Find related content using document structure
- **Quality ranking**: Return most relevant chunks based on similarity scores

## Technical Architecture

### Technology Stack
```typescript
// Primary: Amazon OpenSearch Service with vector engine
const vectorDatabase = {
  service: 'Amazon OpenSearch Service',
  engine: 'k-NN (k-Nearest Neighbors)',
  indexType: 'HNSW', // Hierarchical Navigable Small World
  dimensions: 1536,
  similarity: 'cosine',
  performance: {
    searchLatency: '<100ms',
    throughput: '1000+ QPS',
    scaling: 'horizontal'
  }
}

// Alternative: Amazon Aurora with pgvector
const alternativeStack = {
  service: 'Amazon RDS Aurora PostgreSQL',
  extension: 'pgvector',
  benefits: ['ACID compliance', 'SQL queries', 'relational metadata'],
  tradeoffs: ['Higher latency', 'Complex scaling']
}
```

### Why OpenSearch Over Alternatives?
- **Built for Scale**: Handle millions of vectors efficiently
- **Sub-second Search**: <100ms similarity search response times
- **AWS Native**: Seamless integration with other AWS services
- **Rich Filtering**: Combine vector search with metadata filters
- **Horizontal Scaling**: Add nodes as data grows
- **Real-time Indexing**: Near real-time search availability

### Processing Workflow
```typescript
// 1. Receive embedding events from embedding service
eventBridge.onEvent('rag.embedding', 'Embeddings Generated', async (event) => {
  const embeddings = event.detail.embeddings;
  
  // 2. Batch index embeddings for efficiency
  const indexingBatches = createIndexingBatches(embeddings);
  
  // 3. Store in OpenSearch with optimal indexing
  const results = await Promise.all(
    indexingBatches.map(batch => indexEmbeddingBatch(batch))
  );
  
  // 4. Update document index and metadata
  await updateDocumentIndex(event.detail.documentId, results);
  
  // 5. Publish "Vectors Indexed" event (if needed by downstream services)
  await publishVectorIndexedEvent(event.detail.documentId, results);
});
```

## Storage and Indexing Strategy

### Vector Index Configuration
```typescript
const openSearchIndexConfig = {
  settings: {
    "index.knn": true,
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s"
  },
  mappings: {
    properties: {
      vector_embedding: {
        type: "knn_vector",
        dimension: 1536,
        method: {
          name: "hnsw",
          space_type: "cosinesimil",
          engine: "nmslib",
          parameters: {
            ef_construction: 256,
            m: 16
          }
        }
      },
      content: { type: "text", analyzer: "standard" },
      metadata: { type: "object" },
      document_id: { type: "keyword" },
      chunk_id: { type: "keyword" },
      created_at: { type: "date" },
      similarity_score: { type: "float" }
    }
  }
}
```

### Performance Optimization
```typescript
const performanceStrategy = {
  // Batch indexing for efficiency
  batchSize: 100,
  
  // Index refresh strategy
  refreshInterval: "30s", // Balance between real-time and performance
  
  // Memory management
  circuitBreaker: {
    requestBreaker: "60%",
    fieldDataBreaker: "40%"
  },
  
  // Search optimization
  searchOptimization: {
    preferLocal: true,
    maxConcurrentSearches: 5,
    terminateAfter: 10000
  }
}
```

## Search Capabilities for Knowledge Retrieval

### Vector Search API Endpoints

The Vector Storage Service exposes REST API endpoints via API Gateway for the Knowledge Retrieval Service:

#### 1. Similarity Search Endpoint
```typescript
POST /api/v1/search/similarity
{
  "queryVector": [0.123, -0.456, 0.789, ...], // 1536-dimensional query vector
  "limit": 10,                                 // Number of results to return
  "threshold": 0.7,                           // Minimum similarity score
  "filters": {                                // Optional metadata filters
    "documentType": "policy",
    "contentType": "paragraph",
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  }
}
```

#### 2. Hybrid Search Endpoint
```typescript
POST /api/v1/search/hybrid
{
  "queryVector": [0.123, -0.456, 0.789, ...], // Semantic search component
  "keywords": "refund policy return",          // Keyword search component
  "weights": {
    "semantic": 0.7,    // 70% weight on vector similarity
    "keyword": 0.3      // 30% weight on keyword matching
  },
  "limit": 10,
  "filters": { ... }
}
```

#### 3. Document Search Endpoint
```typescript
POST /api/v1/search/document
{
  "documentId": "doc-123",     // Find all chunks from specific document
  "queryVector": [...],        // Optional: rank chunks by similarity
  "includeMetadata": true
}
```

### Similarity Search API
```typescript
const searchVectors = async (queryVector, options = {}) => {
  const searchQuery = {
    size: options.limit || 10,
    query: {
      bool: {
        must: [{
          knn: {
            vector_embedding: {
              vector: queryVector,
              k: options.limit || 10
            }
          }
        }],
        filter: buildFilters(options.filters)
      }
    },
    _source: ["content", "metadata", "document_id", "chunk_id"],
    min_score: options.threshold || 0.7
  };
  
  return await openSearchClient.search({
    index: 'rag-vectors',
    body: searchQuery
  });
}
```

### Advanced Search Features
```typescript
// Hybrid search: Vector + text search
const hybridSearch = async (question, keywords) => {
  const questionVector = await embedQuestion(question);
  
  return await openSearchClient.search({
    index: 'rag-vectors',
    body: {
      query: {
        bool: {
          should: [
            // Semantic similarity (70% weight)
            { 
              knn: { vector_embedding: { vector: questionVector, k: 20 } },
              boost: 0.7 
            },
            // Keyword matching (30% weight)
            { 
              multi_match: { query: keywords, fields: ["content^2", "metadata.title"] },
              boost: 0.3 
            }
          ]
        }
      }
    }
  });
}
```

## Producer-Consumer Pattern

### Input: Consumer from Embedding Service
```typescript
export class RagVectorStorageEnver extends OdmdEnverCdk {
    // Receives "Embeddings Generated" events
    readonly embeddingEventsSubscription: OdmdCrossRefConsumer<RagVectorStorageEnver, OdmdEnverCdk>;
}
```

### Output: Producer for Knowledge Retrieval Service
```typescript
export class VectorSearchApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    // Provides similarity search API endpoint
    public get searchApi() // API Gateway for vector similarity search
}

export class RagVectorStorageEnver extends OdmdEnverCdk {
    // Produces vector search API for Knowledge Retrieval Service
    readonly vectorSearchApi: VectorSearchApiProducer;
}
```

### Complete Pattern: Input → Storage → Output
```typescript
// Input: Receive embeddings from Embedding Service
readonly embeddingEventsSubscription: OdmdCrossRefConsumer<RagVectorStorageEnver, OdmdEnverCdk>;

// Output: Provide search API to Knowledge Retrieval Service  
readonly vectorSearchApi: VectorSearchApiProducer;
```

### Event Schema

#### Input Events (from Embedding Service)
```json
{
  "source": "rag.embedding",
  "detail-type": "Embeddings Generated",
  "detail": {
    "documentId": "doc-123",
    "embeddings": [
      {
        "chunkId": "doc-123-chunk-1",
        "vector": [0.123, -0.456, 0.789, ...],
        "content": "Our refund policy allows returns within 30 days...",
        "metadata": {
          "position": 1,
          "tokens": 487,
          "contentType": "paragraph",
          "embeddingModel": "amazon.titan-embed-text-v1",
          "dimensions": 1536,
          "generatedAt": "2024-01-15T10:35:00Z"
        }
      }
    ],
    "batchMetrics": {
      "totalChunks": 25,
      "successfulEmbeddings": 25,
      "totalProcessingTimeMs": 6250
    }
  }
}
```

#### Storage Operations
```typescript
// Index the embedding in OpenSearch
await openSearchClient.index({
  index: 'rag-vectors',
  id: 'doc-123-chunk-1',
  body: {
    vector_embedding: [0.123, -0.456, 0.789, ...],
    content: "Our refund policy allows returns within 30 days...",
    document_id: "doc-123",
    chunk_id: "doc-123-chunk-1",
    metadata: { ... },
    indexed_at: "2024-01-15T10:45:00Z"
  }
});
```

#### Query Example (for Knowledge Retrieval)
```typescript
// User asks: "Can I return my purchase?"
const userQuestion = "Can I return my purchase?";
const questionVector = await embedQuestion(userQuestion);

// Vector storage finds semantically similar content
const results = await searchVectors(questionVector, {
  limit: 5,
  threshold: 0.75
});

// Returns chunks about refund policies, even though 
// "return purchase" != "refund policy" (keyword-wise)
```

## Role in the RAG Pipeline

### Position in Flow
```
Document Ingestion → Document Processing → Embedding → **VECTOR STORAGE** → Knowledge Retrieval → Generation
```

### What Vector Storage Enables
1. **Instant Semantic Search**: Sub-second similarity search across millions of documents
2. **Context Discovery**: Find related content even with different wording
3. **Scalable Knowledge Base**: Handle growing document collections efficiently
4. **Rich Filtering**: Search within specific domains, dates, authors, etc.
5. **Quality Ranking**: Return most relevant chunks based on similarity scores
6. **Real-time Updates**: Index new content with minimal latency

## Performance and Scaling

### Expected Performance
- **Search Latency**: <100ms for similarity search
- **Indexing Throughput**: 1000+ vectors/second
- **Storage Capacity**: Millions of vectors per cluster
- **Concurrent Queries**: 1000+ QPS
- **Availability**: 99.99% uptime with Multi-AZ deployment

### Cost Considerations
```typescript
const costEstimation = {
  // OpenSearch cluster costs
  searchInstance: "r6g.large.search", // $0.095/hour
  storagePerGB: 0.135, // $/GB/month
  
  // Estimated costs for 1M vectors
  estimatedMonthlyCost: {
    compute: 70,    // $70/month for search instances
    storage: 540,   // $540/month for ~4TB storage (1M * 1536 * 4 bytes + metadata)
    total: 610      // ~$610/month for 1M vector storage + search
  }
}
```

### Scaling Characteristics
- **Horizontal Scaling**: Add data nodes as storage needs grow
- **Read Replicas**: Scale query performance with replica nodes
- **Cross-AZ**: Deploy across multiple Availability Zones for high availability
- **Auto-scaling**: CloudWatch-based scaling for varying workloads

## Error Handling and Reliability

### Indexing Failures
```typescript
const handleIndexingError = async (embedding, error) => {
  if (error.code === 'IndexNotFoundException') {
    await createIndex();
    await retryIndexing(embedding);
  } else if (error.code === 'ResourceLimitException') {
    await backoffAndRetry(embedding);
  } else {
    await sendToDeadLetterQueue(embedding, error);
  }
}
```

### Data Consistency
```typescript
const ensureDataConsistency = async (documentId) => {
  // Verify all chunks for a document are indexed
  const expectedChunks = await getExpectedChunksCount(documentId);
  const indexedChunks = await getIndexedChunksCount(documentId);
  
  if (expectedChunks !== indexedChunks) {
    await triggerReindexing(documentId);
  }
}
```

## Monitoring and Observability

### CloudWatch Metrics
- Vector indexing success/failure rates
- Search query latency and throughput
- Cluster health and resource utilization
- Storage usage and growth patterns
- Query accuracy and relevance scores

### Custom Metrics
```typescript
const publishMetrics = async (metrics) => {
  await cloudWatch.putMetricData({
    Namespace: 'RAG/VectorStorage',
    MetricData: [
      {
        MetricName: 'IndexingSuccessRate',
        Value: metrics.indexingSuccessRate,
        Unit: 'Percent'
      },
      {
        MetricName: 'SearchLatency',
        Value: metrics.averageSearchLatency,
        Unit: 'Milliseconds'
      },
      {
        MetricName: 'VectorCount',
        Value: metrics.totalVectors,
        Unit: 'Count'
      }
    ]
  });
}
```

### Alerting
- Indexing failure rate > 1%
- Search latency > 500ms
- Cluster health degradation
- Storage capacity > 80%
- Query error rate > 0.5%

## Integration Points

### Upstream Integration
- **Input**: EventBridge events from Embedding Service
- **Triggers**: Embedding generation completion events
- **Dependencies**: OpenSearch Service cluster availability

### Downstream Integration
- **Output**: REST API endpoints for Knowledge Retrieval Service
  - `/api/v1/search/similarity` - Vector similarity search
  - `/api/v1/search/hybrid` - Combined vector + keyword search
  - `/api/v1/search/document` - Document-specific search
- **Protocol**: HTTPS REST API via API Gateway
- **Authentication**: IAM-based service-to-service authentication
- **Monitoring**: CloudWatch metrics and logs
- **Backup**: S3 snapshots for disaster recovery

### Service Dependencies
```typescript
// Knowledge Retrieval Service consumes Vector Storage search API
const vectorStorageEnver = owner.contracts.ragVectorStorageBuild.dev;
this.vectorSearchSubscription = new OdmdCrossRefConsumer(
  this, 
  'vectorSearchSubscription', 
  vectorStorageEnver.vectorSearchApi.searchApi
);
```

## Environment Configuration

### Development Environment
- **Account**: `workspace0` (975050243618)
- **Region**: `us-east-1`
- **Branch**: `dev`
- **OpenSearch**: Single-node development cluster
- **Data Volume**: Limited to 10K vectors for testing

### Production Environment
- **Account**: `workspace1` (590184130740)
- **Region**: `us-east-1`
- **Branch**: `main`
- **OpenSearch**: Multi-AZ production cluster with dedicated master nodes
- **Data Volume**: Unlimited scaling for production workloads

## Repository Structure

- **Repository**: `rag-vector-storage`
- **Organization**: `odmd-rag`
- **Infrastructure**: AWS CDK for OpenSearch Service configuration
- **Deployment**: Serverless framework with automated CI/CD

## Implementation Status

✅ **Architecture**: OpenSearch-based vector storage designed  
✅ **Contracts**: Consumer patterns for embedding events defined  
✅ **Indexing Strategy**: HNSW algorithm configuration optimized  
✅ **Search API**: Similarity search and hybrid search planned  
✅ **Performance**: Sub-second search latency targets set  
✅ **Monitoring**: CloudWatch metrics and alerting configured  

## Next Steps

1. **OpenSearch Setup**: Configure production-ready OpenSearch clusters
2. **Index Management**: Implement vector indexing and lifecycle policies
3. **Search API**: Build similarity search and hybrid search endpoints
4. **Performance Tuning**: Optimize indexing and search performance
5. **Data Migration**: Implement backup and recovery strategies
6. **Load Testing**: Validate performance with realistic data volumes
7. **Integration Testing**: End-to-end testing with embedding and retrieval services
8. **Cost Optimization**: Fine-tune cluster sizing and storage strategies

Vector Storage is essentially the **"brain's memory"** of your RAG system - it takes the AI's understanding of your documents (embeddings) and makes that understanding instantly searchable and retrievable at massive scale. 