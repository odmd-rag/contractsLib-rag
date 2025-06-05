# Knowledge Retrieval Service

## Overview

The Knowledge Retrieval Service is the **intelligent context orchestrator** of the RAG system. It transforms the system from a simple search engine into an **intelligent question-answering system**, serving as the bridge between user questions and AI-generated answers by determining what information should be used to answer specific questions.

## Core Purpose in the Big Picture

**Knowledge Retrieval** is the **intelligence layer** that makes RAG truly intelligent. It enables:
- **Input**: User questions and search queries
- **Process**: Multi-strategy context discovery and intelligent relevance ranking  
- **Output**: Curated, ranked context for the Generation Service
- **Transformation**: Raw questions → Intelligent context curation → AI-ready context

## Responsibilities

### 1. Query Understanding and Transformation
- **Natural Language Processing**: Parse user intent and extract key entities
- **Query Expansion**: Generate multiple search strategies from single questions
- **Intent Classification**: Determine question type (factual, procedural, comparison, etc.)
- **Context Awareness**: Understand user context and conversation history
- **Multi-modal Query Support**: Handle text, voice, and structured queries

### 2. Multi-Strategy Context Discovery
```typescript
// Orchestrates multiple search strategies
const contextDiscovery = async (question) => {
  // Strategy 1: Direct semantic similarity
  const semanticResults = await vectorStorage.similaritySearch(questionVector, {
    limit: 20,
    threshold: 0.7
  });
  
  // Strategy 2: Hybrid search (semantic + keywords)
  const hybridResults = await vectorStorage.hybridSearch(questionVector, keywords, {
    semanticWeight: 0.7,
    keywordWeight: 0.3
  });
  
  // Strategy 3: Related document discovery
  const relatedDocs = await findRelatedDocuments(semanticResults);
  
  // Strategy 4: Temporal context (recent updates)
  const recentContext = await findRecentUpdates(question, timeWindow: '30days');
  
  return mergeAndRankResults([semanticResults, hybridResults, relatedDocs, recentContext]);
}
```

### 3. Intelligent Context Curation
- **Relevance Ranking**: Score and rank retrieved chunks by relevance
- **Deduplication**: Remove duplicate or near-duplicate content
- **Context Optimization**: Right-size context for optimal generation performance
- **Quality Assessment**: Evaluate context quality and completeness
- **Gap Detection**: Identify missing information and suggest additional searches

### 4. Context Quality Management
```typescript
// Smart filtering and ranking of retrieved chunks
const curateContext = async (rawResults, userQuestion) => {
  const curatedContext = {
    // Primary context (most relevant)
    primary: rawResults
      .filter(chunk => chunk.similarity > 0.85)
      .slice(0, 3),
      
    // Supporting context (background information)  
    supporting: rawResults
      .filter(chunk => chunk.similarity > 0.7 && chunk.similarity <= 0.85)
      .slice(0, 5),
      
    // Related context (broader topic coverage)
    related: findRelatedTopics(rawResults)
      .slice(0, 3),
      
    // Metadata for generation guidance
    contextMetadata: {
      questionType: classifyQuestion(userQuestion),
      confidence: calculateOverallConfidence(rawResults),
      coverage: assessTopicCoverage(rawResults),
      freshness: assessContentFreshness(rawResults)
    }
  };
  
  return curatedContext;
}
```

## Technical Architecture

### Technology Stack
```typescript
const knowledgeRetrievalStack = {
  // Core services
  compute: 'AWS Lambda',                // Serverless query processing
  embedding: 'Amazon Bedrock',          // Question-to-vector transformation
  search: 'Vector Storage API',         // Similarity search calls
  caching: 'Amazon ElastiCache',        // Query result caching
  
  // Intelligence features
  nlp: 'Amazon Comprehend',             // Intent classification, entity extraction
  reranking: 'Custom ML Model',         // Result re-ranking algorithms
  expansion: 'Query Expansion Engine',  // Query enhancement strategies
  
  // Performance optimizations
  parallelization: 'Concurrent Lambda executions',
  caching: 'Multi-layer caching strategy',
  preprocessing: 'Query preprocessing pipeline'
}
```

### Why Lambda-Based Architecture?
- **Synchronous Processing**: Real-time response required for user queries
- **Variable Workload**: Handle peak and off-peak query volumes efficiently
- **Parallel Processing**: Execute multiple search strategies concurrently
- **Cost Effective**: Pay-per-use for actual query processing time
- **Auto-scaling**: Handle sudden traffic spikes automatically

### Processing Workflow
```typescript
// Complete knowledge retrieval workflow
const processUserQuery = async (userQuestion, context = {}) => {
  // 1. Query preprocessing and understanding
  const queryAnalysis = await analyzeQuery(userQuestion);
  
  // 2. Generate multiple search strategies
  const searchStrategies = await generateSearchStrategies(queryAnalysis);
  
  // 3. Execute searches in parallel
  const searchResults = await Promise.all(
    searchStrategies.map(strategy => executeSearch(strategy))
  );
  
  // 4. Merge and deduplicate results
  const mergedResults = mergeSearchResults(searchResults);
  
  // 5. Intelligent re-ranking
  const rankedResults = await reRankByRelevance(mergedResults, userQuestion);
  
  // 6. Context curation and quality assessment
  const curatedContext = await curateContext(rankedResults, userQuestion);
  const qualityAssessment = await assessContextQuality(curatedContext, userQuestion);
  
  // 7. Prepare for generation service
  const generationInput = {
    userQuestion,
    context: curatedContext,
    quality: qualityAssessment,
    metadata: {
      retrievalStrategy: 'multi_strategy',
      processingTime: Date.now() - startTime,
      sourceCount: curatedContext.primary.length + curatedContext.supporting.length
    }
  };
  
  return generationInput;
}
```

## Intelligence Features

### 1. Query Expansion and Enhancement
```typescript
const enhanceQuery = async (originalQuery) => {
  return {
    // Synonym expansion
    synonyms: await findSynonyms(originalQuery),
    
    // Domain-specific expansions
    domainTerms: await findDomainTerms(originalQuery),
    
    // Related concepts
    relatedConcepts: await findRelatedConcepts(originalQuery),
    
    // Spelling corrections
    corrected: await spellCheck(originalQuery),
    
    // Intent-based expansions
    intentExpansions: await expandByIntent(originalQuery)
  };
}
```

### 2. Result Re-ranking Algorithms
```typescript
const reRankResults = (results, question) => {
  return results
    .map(result => ({
      ...result,
      rerankedScore: calculateCompositeScore({
        semanticSimilarity: result.similarity,
        keywordRelevance: calculateKeywordRelevance(result, question),
        documentAuthority: result.metadata.authority,
        contentFreshness: calculateFreshness(result.metadata.lastUpdated),
        userContext: calculateContextualRelevance(result, userProfile),
        structuralImportance: result.metadata.importance
      })
    }))
    .sort((a, b) => b.rerankedScore - a.rerankedScore);
}
```

### 3. Context Gap Detection
```typescript
const detectContextGaps = (retrievedContext, question) => {
  const gaps = {
    missingAspects: identifyMissingAspects(question, retrievedContext),
    incompleteAnswers: findIncompleteAnswers(retrievedContext),
    contradictions: detectContradictions(retrievedContext),
    
    // Recommendations for additional searches
    additionalSearches: suggestAdditionalSearches(gaps),
    fallbackStrategies: suggestFallbackStrategies(gaps)
  };
  
  return gaps;
}
```

## Producer-Consumer Pattern

### Input: Consumer from Vector Storage Service
```typescript
export class RagKnowledgeRetrievalEnver extends OdmdEnverCdk {
    // Consumes vector search API from Vector Storage Service
    readonly vectorSearchSubscription: OdmdCrossRefConsumer<RagKnowledgeRetrievalEnver, OdmdEnverCdk>;
}
```

### Output: Producer for Generation Service
```typescript
export class ContextRetrievalApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    // Provides context retrieval API endpoint
    public get contextApi() // API Gateway for intelligent context retrieval
}

export class RagKnowledgeRetrievalEnver extends OdmdEnverCdk {
    // Produces context retrieval API for Generation Service
    readonly contextRetrievalApi: ContextRetrievalApiProducer;
}
```

### Complete Pattern: Search → Intelligence → Context
```typescript
// Input: Consume vector search from Vector Storage Service
readonly vectorSearchSubscription: OdmdCrossRefConsumer<RagKnowledgeRetrievalEnver, OdmdEnverCdk>;

// Output: Provide intelligent context API to Generation Service  
readonly contextRetrievalApi: ContextRetrievalApiProducer;
```

## Context Retrieval API Endpoints

The Knowledge Retrieval Service exposes REST API endpoints via API Gateway for the Generation Service:

### 1. Intelligent Context Retrieval Endpoint
```typescript
POST /api/v1/retrieve/context
{
  "question": "What happens if I return a product after 60 days?",
  "userContext": {                    // Optional user context
    "sessionId": "session-123",
    "userId": "user-456",
    "conversationHistory": [...]
  },
  "retrievalOptions": {               // Optional retrieval configuration
    "maxChunks": 10,
    "minConfidence": 0.7,
    "includeRelated": true,
    "searchStrategies": ["semantic", "hybrid", "temporal"]
  }
}
```

### 2. Multi-Question Context Retrieval
```typescript
POST /api/v1/retrieve/batch
{
  "questions": [
    "What is the return policy?",
    "How long do I have to return items?",
    "Are there any exceptions to the return policy?"
  ],
  "mergeStrategy": "union",           // union, intersection, weighted
  "deduplication": true
}
```

### 3. Context Quality Assessment
```typescript
POST /api/v1/assess/context
{
  "question": "What is the company refund policy?",
  "context": [...],                   // Pre-retrieved context to assess
  "assessmentType": "completeness"    // relevance, completeness, consistency
}
```

### Response Schema
```json
{
  "queryId": "query-abc123",
  "question": "What happens if I return a product after 60 days?",
  "context": {
    "primary": [
      {
        "chunkId": "doc-policy-chunk-5",
        "content": "Returns are accepted within 30 days of purchase...",
        "relevanceScore": 0.92,
        "source": "Return Policy v2.1",
        "metadata": {
          "documentId": "doc-123",
          "chunkPosition": 5,
          "authority": 0.95,
          "freshness": 0.88
        }
      }
    ],
    "supporting": [...],
    "related": [...]
  },
  "quality": {
    "overallScore": 0.88,
    "relevanceScore": 0.92,
    "completeness": 0.75,
    "consistency": 0.94,
    "confidence": "high",
    "gaps": ["post-30-day-exceptions"],
    "generationGuidance": {
      "tone": "helpful_but_firm",
      "caveats": ["Check for special circumstances"],
      "confidenceLevel": "high"
    }
  },
  "metadata": {
    "retrievalTime": 1250,
    "searchStrategies": ["semantic", "hybrid", "related"],
    "sourceDocuments": 3,
    "chunkCount": 8,
    "cacheHit": false
  }
}
```

## Role in the RAG Pipeline

### Position in Flow
```
Vector Storage → **KNOWLEDGE RETRIEVAL** → Generation → User Response
     ↑                    ↓
  Search API         Context API
```

### What Knowledge Retrieval Enables
1. **Intelligent Question Understanding**: Parse user intent and generate optimal search strategies
2. **Multi-Strategy Search**: Combine semantic, keyword, and contextual search approaches
3. **Quality-Aware Context**: Ensure generation receives high-quality, relevant information
4. **Context Optimization**: Right-size context for optimal generation performance and cost
5. **Gap Detection**: Identify when insufficient context exists and trigger additional searches
6. **Real-time Intelligence**: Process queries in real-time with sub-second response times

## Performance and Scaling

### Expected Performance
- **Query Processing**: 200ms - 2 seconds end-to-end
- **Search Parallelization**: 3-5 concurrent search strategies per query
- **Context Size**: 5-15 relevant chunks per query
- **Cache Hit Rate**: 60%+ for common queries
- **Accuracy**: 85%+ relevant context delivery
- **Throughput**: 100+ concurrent queries

### Cost Optimization
```typescript
const costOptimization = {
  // Caching strategies
  queryCache: 'Cache frequent queries for 1 hour',
  resultCache: 'Cache search results for 30 minutes',
  embeddingCache: 'Cache question embeddings for 24 hours',
  
  // Search optimization  
  earlyTermination: 'Stop searching when confidence > 0.9',
  adaptiveDepth: 'Adjust search depth based on question complexity',
  smartBatching: 'Batch similar queries for efficiency',
  
  // Resource management
  lambdaConcurrency: 'Limit concurrent executions during peak',
  coldStartOptimization: 'Keep functions warm during business hours',
  memoryOptimization: 'Right-size Lambda memory allocation'
}
```

### Scaling Characteristics
- **Auto-scaling**: Lambda concurrency scales to 1000 by default
- **Regional Distribution**: Deploy across multiple regions for low latency
- **Cache Scaling**: ElastiCache clusters scale horizontally
- **Load Balancing**: API Gateway handles traffic distribution
- **Circuit Breakers**: Graceful degradation under high load

## Error Handling and Reliability

### Search Failures
```typescript
const handleSearchError = async (strategy, error) => {
  if (error.code === 'TimeoutException') {
    // Fall back to cached results or simplified search
    return await fallbackSearch(strategy);
  } else if (error.code === 'RateLimitException') {
    // Implement exponential backoff
    return await retryWithBackoff(strategy);
  } else {
    // Log error and continue with other strategies
    await logError(error);
    return { results: [], error: error.message };
  }
}
```

### Context Quality Validation
```typescript
const validateContextQuality = (context, question) => {
  const validations = {
    hasRelevantContent: context.primary.length > 0,
    meetsConfidenceThreshold: context.quality.overallScore > 0.7,
    hasNoContradictions: context.quality.consistency > 0.8,
    isRecentEnough: assessContentFreshness(context) > 0.6
  };
  
  const isValid = Object.values(validations).every(check => check);
  
  if (!isValid) {
    // Trigger additional search strategies or return warning
    await triggerFallbackRetrieval(question, validations);
  }
  
  return { isValid, validations };
}
```

## Monitoring and Observability

### CloudWatch Metrics
- Query processing success/failure rates
- Context retrieval latency and throughput
- Search strategy effectiveness and performance
- Cache hit rates and efficiency
- Context quality scores and user satisfaction

### Custom Metrics
```typescript
const publishMetrics = async (metrics) => {
  await cloudWatch.putMetricData({
    Namespace: 'RAG/KnowledgeRetrieval',
    MetricData: [
      {
        MetricName: 'ContextRetrievalSuccessRate',
        Value: metrics.successRate,
        Unit: 'Percent'
      },
      {
        MetricName: 'AverageProcessingTime',
        Value: metrics.averageProcessingTime,
        Unit: 'Milliseconds'
      },
      {
        MetricName: 'ContextQualityScore',
        Value: metrics.averageQualityScore,
        Unit: 'None'
      },
      {
        MetricName: 'CacheHitRate',
        Value: metrics.cacheHitRate,
        Unit: 'Percent'
      }
    ]
  });
}
```

### Alerting
- Context retrieval failure rate > 2%
- Processing time > 5 seconds
- Context quality score < 0.7
- Cache hit rate < 40%
- Search API error rate > 1%

## Integration Points

### Upstream Integration
- **Input**: REST API calls from user interfaces and applications
- **Search Dependency**: Vector Storage Service search API
- **Embedding Service**: Amazon Bedrock for question vectorization

### Downstream Integration
- **Output**: REST API endpoints for Generation Service
- **Caching**: ElastiCache for performance optimization
- **Monitoring**: CloudWatch metrics and logs
- **Analytics**: Query patterns and performance analysis

### Service Dependencies
```typescript
// Generation Service consumes Knowledge Retrieval context API
const knowledgeRetrievalEnver = owner.contracts.ragKnowledgeRetrievalBuild.dev;
this.contextRetrievalSubscription = new OdmdCrossRefConsumer(
  this, 
  'contextRetrievalSubscription', 
  knowledgeRetrievalEnver.contextRetrievalApi.contextApi
);
```

## Environment Configuration

### Development Environment
- **Account**: `workspace0` (975050243618)
- **Region**: `us-east-1`
- **Branch**: `dev`
- **Lambda Concurrency**: Limited to 50 concurrent executions
- **Cache**: Single-node ElastiCache for testing

### Production Environment
- **Account**: `workspace1` (590184130740)
- **Region**: `us-east-1`
- **Branch**: `main`
- **Lambda Concurrency**: Full scaling up to 1000 executions
- **Cache**: Multi-AZ ElastiCache cluster for high availability

## Repository Structure

- **Repository**: `rag-knowledge-retrieval`
- **Organization**: `odmd-rag`
- **Infrastructure**: AWS CDK for Lambda functions and API Gateway
- **Deployment**: Serverless framework with automated CI/CD

## Implementation Status

✅ **Architecture**: Multi-strategy intelligent retrieval designed  
✅ **Contracts**: Producer-consumer patterns with Vector Storage and Generation  
✅ **API Design**: Context retrieval endpoints specified  
✅ **Intelligence**: Query enhancement and result re-ranking planned  
✅ **Performance**: Sub-second retrieval targets set  
✅ **Monitoring**: CloudWatch metrics and alerting configured  

## Next Steps

1. **Lambda Development**: Build intelligent query processing functions
2. **Search Integration**: Implement Vector Storage API consumption
3. **ML Pipeline**: Develop query expansion and result re-ranking models
4. **Caching Strategy**: Implement multi-layer caching for performance
5. **Quality Metrics**: Build context quality assessment algorithms
6. **Performance Testing**: Load testing with realistic query patterns
7. **Integration Testing**: End-to-end testing with vector storage and generation services
8. **User Experience**: Optimize response times and context quality

Knowledge Retrieval is essentially the **"intelligence layer"** of your RAG system - it doesn't just find information, it understands questions, curates the best possible context, and ensures the Generation Service has everything it needs to provide accurate, helpful answers. 