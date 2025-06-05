# Document Processing Service

## Overview

The Document Processing Service is the **CPU-intensive transformation layer** that converts raw documents into **embeddings-ready content**. It acts as the heavy-lifting component in the RAG pipeline, handling complex document parsing, OCR, format conversion, and content chunking.

## Core Purpose

Transform validated documents from the ingestion service into optimally-structured, clean content chunks that are ready for embedding generation.

## Responsibilities

### 1. Document Parsing & Text Extraction
- **PDF Processing**: Extract text from standard and complex PDF formats
- **Office Documents**: Process Word, Excel, PowerPoint files
- **Web Content**: Parse HTML, Markdown, and XML documents
- **Plain Text**: Handle TXT, CSV, and other text-based formats

### 2. OCR (Optical Character Recognition)
- Extract text from scanned PDFs and image-based documents
- Process image files (JPG, PNG, TIFF) containing text
- Clean up OCR artifacts and formatting inconsistencies
- Preserve layout information where possible

### 3. Format Conversion & Standardization
- Convert various document formats to standardized text format
- Preserve important structural elements (headers, lists, tables)
- Clean up formatting artifacts and special characters
- Maintain document hierarchy and context

### 4. Content Chunking & Segmentation
- Break documents into embedding-optimal chunks (typically 512 tokens)
- Implement overlapping windows for context preservation
- Respect document structure boundaries (paragraphs, sections)
- Generate metadata for each chunk

### 5. Content Enhancement
- Extract and preserve structural metadata
- Identify content types (code blocks, tables, references)
- Normalize text for consistent embedding quality
- Tag content with processing metadata

## Technical Architecture

### Technology Stack
- **ECS Fargate**: Containerized processing for CPU-intensive tasks
- **EventBridge Subscription**: Receives events from document ingestion
- **Kinesis Streams**: Internal processing queues with custom sharding
- **EventBridge Producer**: Publishes processed content events
- **S3**: Temporary storage for processed content and metadata

### Why ECS Fargate Over Lambda?
- **No Time Limits**: Processing can take 30 seconds to several minutes
- **Higher Resources**: More CPU and memory for intensive operations
- **Cost Effective**: Better pricing for longer-running tasks
- **Scalability**: Auto-scaling based on queue depth and processing metrics

### Processing Workflow
```typescript
// 1. Subscribe to document validation events
eventBridge.onEvent('rag.document.ingestion', 'Document Validated', async (event) => {
  const shardingKey = determineProcessingStrategy(event.detail);
  
  // 2. Route to appropriate Kinesis processing shard
  await kinesis.putRecord({
    StreamName: getProcessingStream(event.detail),
    PartitionKey: shardingKey,
    Data: JSON.stringify(event.detail)
  });
});

// 3. Process documents from Kinesis streams
const processDocument = async (document) => {
  // Heavy processing operations
  const textContent = await extractText(document);
  const cleanedContent = await cleanAndNormalize(textContent);
  const chunks = await chunkContent(cleanedContent);
  const metadata = await extractMetadata(document, chunks);
  
  return { chunks, metadata };
};
```

## Sharding Strategy

### Processing Complexity-Based Sharding
```typescript
const determineProcessingStrategy = (document) => {
  // Route by processing requirements
  if (document.size > 100MB) return `large-docs-${hash(document.id) % 3}`;
  if (document.type === 'image') return `ocr-docs-${hash(document.id) % 5}`;
  if (document.type === 'pdf') return `pdf-docs-${hash(document.id) % 4}`;
  if (document.requiresOCR) return `ocr-intensive-${hash(document.id) % 3}`;
  return `standard-docs-${hash(document.id) % 8}`;
};
```

### Stream Types
- **Main Processing Stream**: Standard document processing
- **Priority Processing Stream**: High-priority or time-sensitive documents
- **Batch Processing Stream**: Large document sets and bulk operations
- **OCR Stream**: Image-heavy documents requiring OCR
- **Large Document Stream**: Documents requiring extended processing time

## Producer-Consumer Pattern

### Input: Consumer from Document Ingestion
```typescript
export class RagDocumentProcessingEnver extends OdmdEnverCdk {
    // Subscribes to ingestion events
    readonly documentEventsSubscription: OdmdCrossRefConsumer<RagDocumentProcessingEnver, OdmdEnverCdk>;
}
```

### Output: Producer for Embedding Service
```typescript
export class ProcessedContentEventProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    // Publishes processed content events
    public get eventBridge() // EventBridge bus for processed content events
}
```

## Event Schema

### Input Events (from Ingestion)
```json
{
  "source": "rag.document.ingestion",
  "detail-type": "Document Validated",
  "detail": {
    "documentId": "doc-123",
    "s3Bucket": "documents-bucket",
    "s3Key": "validated/document.pdf",
    "metadata": {
      "size": 1048576,
      "type": "pdf",
      "userId": "user-456",
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Output Events (to Embedding)
```json
{
  "source": "rag.document.processing",
  "detail-type": "Document Processed",
  "detail": {
    "documentId": "doc-123",
    "chunks": [
      {
        "chunkId": "doc-123-chunk-1",
        "content": "Processed text content...",
        "metadata": {
          "position": 1,
          "tokens": 487,
          "contentType": "paragraph"
        }
      }
    ],
    "documentMetadata": {
      "title": "Document Title",
      "author": "Author Name",
      "pageCount": 10,
      "processingMetrics": {
        "chunksCount": 25,
        "processingTimeMs": 45000,
        "ocrRequired": false
      }
    }
  }
}
```

## Performance Characteristics

- **Processing Time**: 10 seconds to 5 minutes per document
- **Throughput**: Scales based on document complexity and ECS capacity
- **Memory Usage**: 2-8 GB per processing container
- **CPU Utilization**: High during active processing, idle between jobs
- **Scaling**: Auto-scales based on Kinesis stream lag and queue depth

## Error Handling

### Processing Failures
- **Retry Logic**: Exponential backoff for transient failures
- **Dead Letter Queue**: Failed documents routed to DLQ for investigation
- **Circuit Breaker**: Prevent cascade failures during high error rates
- **Monitoring**: CloudWatch metrics for failure rates and processing times

### Quality Assurance
- **Content Validation**: Ensure extracted text meets quality thresholds
- **Chunk Validation**: Verify chunks are within token limits
- **Metadata Validation**: Ensure required metadata is present
- **Format Verification**: Confirm output format compatibility

## Monitoring and Observability

### CloudWatch Metrics
- Document processing duration and success rates
- OCR accuracy and performance metrics
- Chunk generation statistics
- ECS container utilization and scaling events

### Logging
- Structured logging for document processing pipeline
- Error tracking with document correlation IDs
- Performance metrics for optimization
- Processing quality metrics

### Alerting
- Failed document processing notifications
- Processing time threshold breaches
- Queue depth and backlog alerts
- Quality degradation warnings

## Integration Points

### Upstream Integration
- **Input**: EventBridge events from Document Ingestion Service
- **Source**: S3 documents from validated bucket
- **Triggers**: Document validation completion events

### Downstream Integration
- **Output**: EventBridge events to Embedding Service
- **Storage**: Processed content temporarily stored in S3
- **Monitoring**: Metrics published to CloudWatch

## Environment Configuration

### Development Environment
- **Account**: `workspace0` (975050243618)
- **Region**: `us-east-1`
- **Branch**: `dev`
- **ECS Cluster**: Development cluster with limited capacity

### Production Environment
- **Account**: `workspace1` (590184130740)
- **Region**: `us-east-1`
- **Branch**: `main`
- **ECS Cluster**: Production cluster with auto-scaling

## Repository Structure

- **Repository**: `rag-document-processing-service`
- **Organization**: `odmd-rag`
- **Infrastructure**: AWS CDK for ECS Fargate and supporting services
- **Deployment**: GitOps with automated CI/CD pipeline

## Implementation Status

✅ **Architecture**: Event-driven processing pipeline designed  
✅ **Contracts**: Producer-consumer patterns defined  
✅ **Scaling**: ECS Fargate auto-scaling strategy planned  
✅ **Integration**: EventBridge subscriptions and publications configured  
✅ **Error Handling**: DLQ and retry mechanisms designed  

## Next Steps

1. **Container Development**: Build Docker images for document processing
2. **OCR Integration**: Implement Amazon Textract or Tesseract OCR
3. **Format Handlers**: Develop parsers for different document types
4. **Chunking Algorithms**: Implement content-aware chunking strategies
5. **Quality Metrics**: Define and implement content quality measurements
6. **Performance Tuning**: Optimize processing speeds and resource usage
7. **Integration Testing**: End-to-end testing with ingestion and embedding services 