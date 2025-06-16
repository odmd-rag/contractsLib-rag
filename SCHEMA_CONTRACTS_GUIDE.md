# Schema Contracts Guide

## 📋 Overview

The RAG Contracts Library now includes **schema contracts** as children of infrastructure endpoints. This allows services to define and enforce data structure contracts for events and API payloads while keeping the concrete implementations in their respective service repositories.

## 🏗️ **Architecture Pattern**

### **Separation of Concerns**
- **Infrastructure Contracts** (contractsLib-rag): Define endpoints and schema interfaces
- **Schema Implementations** (individual services): Provide concrete JSON schemas, TypeScript types, and validation logic

### **Hierarchical Structure**
```
Endpoint Producer/Consumer
├── Infrastructure Endpoint (EventBridge Bus, API Gateway, Kinesis Stream)
└── Schema Contracts (children)
    ├── Request/Event Schema Contract
    ├── Response/Result Schema Contract
    └── Metadata/Error Schema Contract
```

## 📡 **EventBridge Schema Contracts**

### **Document Ingestion Service**
Produces validation events with schema contracts:

```typescript
// Infrastructure endpoint
documentValidationEvents.eventBridge

// Schema contracts
documentValidationEvents.documentValidatedSchema    // Successful validation
documentValidationEvents.documentRejectedSchema     // Failed validation  
documentValidationEvents.documentQuarantinedSchema  // Manual review needed
```

**Example concrete implementation in service:**
```typescript
// In rag-document-ingestion-service
export interface DocumentValidatedEvent {
  eventId: string;
  timestamp: string;
  documentId: string;
  s3Bucket: string;
  s3Key: string;
  documentType: 'pdf' | 'docx' | 'doc' | 'pptx' | 'ppt' | 'xlsx' | 'xls' | 'txt' | 'md' | 'csv' | 'json' | 'xml' | 'html' | 'rtf' | 'odt' | 'odp' | 'ods' | 'pages' | 'numbers' | 'key';
  fileSize: number;
  checksum: string;
  validationRules: string[];
  metadata: {
    uploadedBy: string;
    uploadedAt: string;
    originalFileName: string;
  };
}
```

### **Document Processing Service**
Produces processing events and Kinesis stream records:

```typescript
// Processing events
processedContentEvents.contentExtractedSchema   // Raw content extraction
processedContentEvents.contentChunkedSchema     // Content chunking complete
processedContentEvents.processingFailedSchema   // Processing failures
processedContentEvents.processingMetricsSchema  // Performance metrics

// Kinesis stream records
processingStreams.mainDocumentRecordSchema      // Main processing records
processingStreams.priorityDocumentRecordSchema  // Priority processing records
processingStreams.batchJobRecordSchema         // Batch job records
processingStreams.failedRecordSchema           // Failed processing records
```

### **Embedding Service**
Produces embedding events:

```typescript
embeddingEvents.embeddingsGeneratedSchema  // Generated embeddings
embeddingEvents.embeddingFailedSchema      // Embedding failures
embeddingEvents.batchEmbeddingsSchema      // Batch completion
embeddingEvents.embeddingMetricsSchema     // Performance metrics
```

## 🔌 **API Gateway Schema Contracts**

### **Vector Storage Service**
Provides search API with request/response schemas:

```typescript
vectorSearchApi.similaritySearchRequestSchema   // Search query structure
vectorSearchApi.similaritySearchResponseSchema  // Search results structure
vectorSearchApi.vectorIndexRequestSchema        // Indexing requests
vectorSearchApi.vectorIndexResponseSchema       // Indexing responses
vectorSearchApi.searchMetadataSchema           // Search filters/metadata
```

**Example concrete implementation:**
```typescript
// In rag-vector-storage-service
export interface SimilaritySearchRequest {
  query: {
    vector?: number[];
    text?: string;
    embedding_model?: string;
  };
  filters?: {
    document_type?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    metadata?: Record<string, any>;
  };
  options: {
    top_k: number;
    similarity_threshold?: number;
    include_metadata?: boolean;
    include_scores?: boolean;
  };
}

export interface SimilaritySearchResponse {
  results: Array<{
    id: string;
    score: number;
    document_id: string;
    chunk_id: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  query_metadata: {
    total_results: number;
    search_time_ms: number;
    embedding_model_used: string;
  };
}
```

### **Knowledge Retrieval Service**
Provides context retrieval API:

```typescript
contextRetrievalApi.queryUnderstandingRequestSchema   // Query analysis requests
contextRetrievalApi.queryUnderstandingResponseSchema  // Query analysis results
contextRetrievalApi.contextRetrievalRequestSchema     // Context search requests
contextRetrievalApi.contextRetrievalResponseSchema    // Retrieved context
contextRetrievalApi.contextRankingSchema             // Context scoring
contextRetrievalApi.retrievalMetadataSchema          // Retrieval metadata
```

### **Generation Service**
Provides response generation API:

```typescript
responseGenerationApi.chatCompletionRequestSchema   // Chat requests
responseGenerationApi.chatCompletionResponseSchema  // Chat responses
responseGenerationApi.streamingResponseSchema       // Streaming chunks
responseGenerationApi.generationConfigSchema        // LLM parameters
responseGenerationApi.promptTemplateSchema          // Prompt templates
responseGenerationApi.generationMetricsSchema       // Performance metrics
```

## 🔄 **Service Implementation Pattern**

### **1. Schema Definition**
Each service defines concrete schemas implementing the contracts:

```typescript
// In individual service repository
import { JSONSchema7 } from 'json-schema';

export const DocumentValidatedEventSchema: JSONSchema7 = {
  type: 'object',
  required: ['eventId', 'timestamp', 'documentId', 's3Bucket', 's3Key'],
  properties: {
    eventId: { type: 'string', format: 'uuid' },
    timestamp: { type: 'string', format: 'date-time' },
    documentId: { type: 'string' },
    s3Bucket: { type: 'string' },
    s3Key: { type: 'string' },
    documentType: { 
      type: 'string', 
      enum: ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt', 'md', 'csv', 'json', 'xml', 'html', 'rtf', 'odt', 'odp', 'ods', 'pages', 'numbers', 'key'] 
    },
    fileSize: { type: 'number', minimum: 0 },
    checksum: { type: 'string' },
    validationRules: {
      type: 'array',
      items: { type: 'string' }
    },
    metadata: {
      type: 'object',
      required: ['uploadedBy', 'uploadedAt', 'originalFileName'],
      properties: {
        uploadedBy: { type: 'string' },
        uploadedAt: { type: 'string', format: 'date-time' },
        originalFileName: { type: 'string' }
      }
    }
  }
};
```

### **2. Schema Registration**
Services register their schemas with the OndemandEnv platform:

```typescript
// In service initialization
import { RagContracts } from '@contractslib/rag-contracts';

const contracts = RagContracts.inst;
const schemaContract = contracts.ragDocumentIngestionBuild.dev
  .documentValidationEvents.documentValidatedSchema;

// Register concrete schema implementation
await schemaRegistry.register(schemaContract.fullPath, DocumentValidatedEventSchema);
```

### **3. Runtime Validation**
Services validate data against registered schemas:

```typescript
// Before publishing events
import Ajv from 'ajv';

const ajv = new Ajv();
const validate = ajv.compile(DocumentValidatedEventSchema);

const event: DocumentValidatedEvent = {
  eventId: uuid(),
  timestamp: new Date().toISOString(),
  documentId: 'doc-123',
  // ... other properties
};

if (!validate(event)) {
  throw new Error(`Schema validation failed: ${ajv.errorsText(validate.errors)}`);
}

// Publish valid event to EventBridge
await eventBridge.putEvents({
  Entries: [{
    Source: 'rag.document.ingestion',
    DetailType: 'Document Validated',
    Detail: JSON.stringify(event)
  }]
}).promise();
```

## 🔍 **Consumer Schema Validation**

Consuming services can validate incoming data:

```typescript
// In document processing service
import { DocumentValidatedEvent } from '@rag-services/document-ingestion-schemas';

// EventBridge event handler
export const handleDocumentValidated = async (event: EventBridgeEvent) => {
  // Parse event detail
  const documentEvent = JSON.parse(event.detail) as DocumentValidatedEvent;
  
  // Validate against expected schema
  if (!validateDocumentValidatedEvent(documentEvent)) {
    await sendToDeadLetterQueue(event, 'Schema validation failed');
    return;
  }
  
  // Process valid event
  await processDocument(documentEvent);
};
```

## 📊 **Benefits**

### **1. Type Safety**
- **Compile-time checks** with TypeScript interfaces
- **Runtime validation** with JSON Schema
- **IDE autocompletion** and error detection

### **2. Contract Evolution**
- **Backward compatibility** through versioned schemas
- **Breaking change detection** during deployment
- **Schema migration** support

### **3. Documentation**
- **Self-documenting APIs** through schema annotations
- **OpenAPI generation** for REST endpoints
- **AsyncAPI generation** for event schemas

### **4. Testing**
- **Contract testing** between services
- **Schema validation** in unit tests
- **Integration testing** with real data

## 🚀 **Implementation Workflow**

### **Phase 1: Contract Definition**
1. Define schema contracts in contractsLib-rag ✅
2. Deploy contracts to OndemandEnv platform
3. Generate schema stubs for service teams

### **Phase 2: Service Implementation**
1. Implement concrete schemas in each service
2. Add runtime validation logic
3. Register schemas with platform
4. Test contract compliance

### **Phase 3: Integration Testing**
1. End-to-end schema validation
2. Contract compatibility testing
3. Performance testing with validation
4. Error handling and DLQ testing

### **Phase 4: Production Deployment**
1. Gradual rollout with schema validation
2. Monitoring and alerting on schema violations
3. Schema evolution and migration processes
4. Documentation and training

## 🛠️ **Tools and Libraries**

### **Schema Definition**
- **JSON Schema**: Industry-standard schema definition
- **TypeScript**: Type definitions and interfaces
- **OpenAPI/AsyncAPI**: API documentation generation

### **Validation**
- **Ajv**: Fast JSON Schema validator
- **Joi**: Object schema validation
- **Zod**: TypeScript-first schema validation

### **Testing**
- **Pact**: Contract testing framework
- **JSONSchema.Net**: Schema testing utilities
- **Postman**: API testing with schema validation

This schema contract architecture ensures that your RAG system maintains data consistency and type safety across all service boundaries while allowing independent development and deployment of each microservice! 