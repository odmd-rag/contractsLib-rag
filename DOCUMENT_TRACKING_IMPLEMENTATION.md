# Document Tracking System Implementation

## 🎯 Overview

This implementation provides **end-to-end document tracking** through the entire RAG pipeline using real-time S3 status checks and HTTP APIs with JWT authentication. Each service exposes a status endpoint following the pattern: `https://{enverId}.{buildId}.{domain}/status/{docId}`.

## 🏗️ Architecture

### **Service Status APIs**

Each service in the RAG pipeline now provides a status API:

1. **Document Ingestion**: `https://up-api.dev.ragDocumentIngestion.yourdomain.com/status/{docId}`
2. **Document Processing**: `https://st-api.dev.ragDocumentProcessing.yourdomain.com/status/{docId}`
3. **Embedding Service**: `https://eb-api.dev.ragEmbedding.yourdomain.com/status/{docId}`
4. **Vector Storage**: `https://vs-api.dev.ragVectorStorage.yourdomain.com/status/{docId}`

### **Status Response Format**

All services return a consistent status format:

```typescript
interface DocumentStatus {
    documentId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    stage: 'ingestion' | 'processing' | 'embedding' | 'vector-storage';
    timestamp: string;
    metadata?: {
        processingTime?: number;
        errorMessage?: string;
        fileSize?: number;
        chunkCount?: number;
        embeddingCount?: number;
        vectorCount?: number;
        homeServerStatus?: string;
    };
}
```

## 📋 Implementation Details

### **1. Contract Updates**

**Added Status API Producers to Each Service:**

```typescript
// Document Processing Service Contract
export class DocumentProcessingStatusApiProducer extends OdmdCrossRefProducer<OdmdEnverCdk> {
    public get statusApiEndpoint() {
        return this.children![0]! // HTTP API Gateway endpoint
    }
    
    public get statusResponseSchema() {
        return this.children![1]! // Schema for status responses
    }
}
```

**Similar patterns implemented for:**
- `EmbeddingStatusApiProducer`
- `VectorStorageStatusApiProducer`

### **2. Service Stack Implementation**

Each service stack includes:

#### **HTTP API Gateway Setup**
```typescript
// JWT Authentication using same tokens across all services
this.httpApi = new apigatewayv2.HttpApi(this, 'ServiceApi', {
    defaultAuthorizer: new HttpJwtAuthorizer('Auth',
        `https://${providerName}`,
        {jwtAudience: [clientId]}
    ),
    corsPreflight: {
        allowOrigins: allowedOrigins,
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.OPTIONS],
        // ... CORS headers
    }
});
```

#### **Custom Domain Configuration**
```typescript
// Each service gets unique subdomain using buildId pattern
const apiSubdomain = 'st-api.' + myEnver.targetRevision.value + '.' + myEnver.owner.buildId;
this.apiDomain = `${apiSubdomain}.${zoneName}`;

// SSL certificate and DNS setup
const domainName = new apigatewayv2.DomainName(this, 'ApiDomainName', {
    domainName: this.apiDomain,
    certificate: new Certificate(this, 'ApiCertificate', {
        domainName: this.apiDomain,
        validation: CertificateValidation.fromDns(hostedZone),
    }),
});
```

#### **Status Endpoint Implementation**
```typescript
this.httpApi.addRoutes({
    path: '/status/{documentId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: new apigatewayv2Integrations.HttpLambdaIntegration('StatusIntegration', statusHandler),
});
```

### **3. Status Handler Logic**

Each service implements real-time S3 status checking:

#### **Document Processing Service**
- Checks `processed-content-bucket` for `processed/{documentId}.json`
- Checks `processing-status-bucket` for `errors/{documentId}.json`
- Falls back to checking source document bucket
- Returns processing metrics from S3 object metadata

#### **Embedding Service**
- Checks `embeddings-bucket` for `embeddings/{documentId}.json`
- Checks `embedding-status-bucket` for `errors/{documentId}.json`
- Validates prerequisite: processed content exists
- Returns embedding metrics (count, dimensions, model)

#### **Vector Storage Service**
- Checks `vector-metadata-bucket` for `indexed/{documentId}.json`
- **Validates with home server** via direct API call
- Checks prerequisites: embeddings exist
- Returns vector indexing metrics and home server status

### **4. WebUI Integration**

The `DocumentTracker` class provides comprehensive tracking:

```typescript
const tracker = new DocumentTracker(endpoints, authToken);

// Sequential pipeline tracking
const finalStatus = await tracker.trackDocument(documentId, (status) => {
    console.log(`${status.stage}: ${status.status}`);
});

// Parallel status checking
const allStatuses = await tracker.getAllStageStatuses(documentId);

// Pipeline summary
const summary = await tracker.getPipelineSummary(documentId);
```

## 🔄 Document Flow Tracking

### **Stage-by-Stage Status Logic**

1. **Ingestion Status**
   - `pending`: Document not uploaded
   - `processing`: Document uploaded, validation in progress
   - `completed`: Document validated and stored
   - `failed`: Document quarantined or validation failed

2. **Processing Status**
   - `pending`: No source document found
   - `processing`: Document found but processing incomplete
   - `completed`: Processed content available in S3
   - `failed`: Processing error recorded

3. **Embedding Status**
   - `pending`: No processed content available
   - `processing`: Processed content found, embedding in progress
   - `completed`: Embeddings generated and stored
   - `failed`: Embedding generation failed

4. **Vector Storage Status**
   - `pending`: No embeddings available
   - `processing`: Embeddings found, indexing in progress
   - `completed`: Vectors indexed in home server (verified)
   - `failed`: Indexing failed or home server unavailable

## 🎨 Key Features

### **✅ Real-time S3 Checks**
- No additional storage needed
- Status determined by S3 object existence and metadata
- Fast response times with direct S3 HEAD requests

### **✅ JWT Authentication Consistency**
- Same JWT tokens work across all service domains
- Shared authentication provider from user-auth service
- Consistent CORS configuration for WebUI access

### **✅ Domain Per Environment & Service**
- Dev Processing: `st-api.dev.ragDocumentProcessing.yourdomain.com`
- Prod Processing: `st-api.prod.ragDocumentProcessing.yourdomain.com`
- Embedding: `eb-api.{env}.ragEmbedding.yourdomain.com`
- Vector Storage: `vs-api.{env}.ragVectorStorage.yourdomain.com`
- Clean separation and easy environment/service identification

### **✅ Comprehensive Error Handling**
- Graceful degradation when services are unavailable
- Detailed error messages in status responses
- Timeout handling for home server communication

### **✅ OndemandEnv Integration**
- Contract-driven configuration
- Automatic dependency resolution
- Cross-service value sharing via OdmdShareOut

## 🔧 Usage Examples

### **WebUI Integration**
```typescript
// Initialize tracker with service endpoints (using buildId pattern)
const endpoints = {
    ingestion: 'https://up-api.dev.ragDocumentIngestion.yourdomain.com',
    processing: 'https://st-api.dev.ragDocumentProcessing.yourdomain.com',
    embedding: 'https://eb-api.dev.ragEmbedding.yourdomain.com',
    vectorStorage: 'https://vs-api.dev.ragVectorStorage.yourdomain.com'
};

const tracker = new DocumentTracker(endpoints, jwtToken);

// Track document with real-time updates
await tracker.trackDocument(documentId, (status) => {
    updateProgressUI(status);
});
```

### **Direct API Calls**
```bash
# Check processing status
curl -H "Authorization: Bearer $JWT_TOKEN" \
     https://st-api.dev.ragDocumentProcessing.yourdomain.com/status/doc-123

# Check embedding status
curl -H "Authorization: Bearer $JWT_TOKEN" \
     https://eb-api.dev.ragEmbedding.yourdomain.com/status/doc-123
```

## 🛡️ Security & Performance

### **Security Features**
- JWT authentication on all endpoints
- CORS configured for specific WebUI domains
- SSL/TLS encryption for all communications
- No sensitive data in status responses

### **Performance Optimizations**
- S3 HEAD requests for fast object existence checks
- Metadata stored in S3 object headers (no additional reads)
- Configurable polling intervals
- Timeout protection for home server calls

## 🚀 Benefits

1. **Real-time Tracking**: WebUI can show live document processing progress
2. **No Additional Storage**: Status determined from existing S3 objects
3. **Simple Integration**: RESTful APIs with consistent response format
4. **Scalable Architecture**: Each service independently scalable
5. **Error Transparency**: Clear error messages for debugging
6. **Cost Effective**: Minimal additional infrastructure overhead

## 📊 Monitoring & Observability

Each status endpoint provides:
- Request/response metrics via CloudWatch
- Error tracking and alerting
- Processing time measurements
- S3 access patterns analysis
- Home server connectivity monitoring

This implementation provides a complete document tracking solution that leverages the OndemandEnv platform for seamless cross-service communication while maintaining security, performance, and cost efficiency. 