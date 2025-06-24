# RAG Contracts Library

This repository contains the OndemandEnv contracts for a serverless RAG (Retrieval-Augmented Generation) system built on AWS. It defines the microservices architecture and cross-service dependencies using the OndemandEnv platform patterns.

## Architecture Overview

The RAG system consists of 6 core microservices:

1. **Document Ingestion** - Handles document upload and initial processing
2. **Document Processing** - Parses and preprocesses documents
3. **Embedding** - Generates vector embeddings from processed content
4. **Vector Storage** - Manages vector database operations  
5. **Knowledge Retrieval** - Retrieves relevant context for queries
6. **Generation** - Generates responses using LLMs and retrieved context

## Project Structure

```
contractsLib-rag/
├── src/
│   ├── types.ts                      # Shared type definitions
│   ├── rag-contracts.ts              # Main contracts class
│   ├── contracts-build.ts            # Build contracts configuration
│   ├── index.ts                      # Exports
│   └── services/                     # Individual service definitions
│       ├── document-ingestion.ts     # Document ingestion service
│       ├── document-processing.ts    # Document processing service
│       ├── embedding.ts              # Embedding service
│       ├── vector-storage.ts         # Vector storage service
│       ├── knowledge-retrieval.ts    # Knowledge retrieval service
│       └── generation.ts             # Generation service
├── tests/                            # Test suites
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

## Services

### Document Ingestion Service
- **Repository**: `rag-document-ingestion-service`
- **Purpose**: Entry point for document uploads
- **Key Features**: 
  - S3 pre-signed URL generation
  - Document validation and quarantine
  - EventBridge event publishing
  - Web UI for document tracking

### Document Processing Service  
- **Repository**: `rag-document-processing-service`
- **Purpose**: Document parsing and preprocessing
- **Key Features**:
  - Multi-format document parsing (PDF, DOCX, TXT, etc.)
  - Text extraction and cleaning
  - Chunk generation with sentence boundary detection
  - S3 storage for processed content

### Embedding Service
- **Repository**: `rag-embedding-service` 
- **Purpose**: Generate vector embeddings using AWS Bedrock
- **Key Features**:
  - AWS Bedrock Titan Embed v2 integration
  - S3 polling for processed content
  - SQS-based batch processing
  - Embedding storage in S3

### Vector Storage Service
- **Repository**: `rag-vector-storage-service`
- **Purpose**: Vector database operations
- **Key Features**:
  - Vector database management (configurable backends)
  - Indexing and similarity search
  - Metadata management
  - Can integrate with home vector server for development

### Knowledge Retrieval Service
- **Repository**: `rag-knowledge-retrieval-service`
- **Purpose**: Retrieve relevant context for queries
- **Key Features**:
  - Semantic search
  - Query rewriting and expansion
  - Context ranking and filtering

### Generation Service
- **Repository**: `rag-generation-service`
- **Purpose**: Generate responses using LLMs
- **Key Features**:
  - LLM integration (OpenAI, Anthropic, Bedrock, etc.)
  - Prompt engineering and context injection
  - Response post-processing

## Data Flow

### Main Pipeline (OndemandEnv Services)
```
Document Upload (User)
    ↓
Document Ingestion → Document Processing → Embedding → Vector Storage
    ↓                        ↓                ↓            ↓
EventBridge            S3 Processed      S3 Embeddings  Vector DB
                       Content Bucket     Bucket         (various backends)
                                                            ↓
User Query → Knowledge Retrieval ←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    ↓
Generation → Response
```

### Development Tools (Separate)
```
Home Vector Server (local development only)
- Standalone Docker container
- For local testing and development
- NOT part of the main ondemandenv.dev pipeline
- Can be integrated via Vector Storage Service for dev environments
```

## Key Architectural Principles

### Service Communication
- **S3-based**: Services communicate through S3 buckets for reliable data transfer
- **Event-driven**: EventBridge for loose coupling and async processing
- **Contract-based**: All dependencies defined through contractsLib contracts
- **No Direct Dependencies**: Services don't directly call each other

### Data Storage Pattern
```
Document Ingestion → S3 Raw Documents
       ↓
Document Processing → S3 Processed Content (JSON chunks)
       ↓  
Embedding Service → S3 Embeddings (JSON vectors)
       ↓
Vector Storage → Vector Database (various backends)
```

### Authentication
- **Centralized**: User Auth service provides JWT tokens
- **Consumed**: All services with status APIs consume auth contracts
- **Hierarchical**: JWT authentication for web UIs and API access

## Environment Management

Each service has two environments:
- **Development** (`workspace0`): Mutable environment for testing
- **Production** (`workspace1`): Immutable environment for stable releases

## Event-Driven Architecture

The system uses EventBridge for loose coupling between services:
- **Document Ingestion** publishes `Document Validated` events
- **Document Processing** subscribes to validation events and publishes `Document Processed` events  
- **Embedding** polls S3 for processed content (no direct events)
- **Vector Storage** polls S3 for embeddings (no direct events)

## Home Vector Server vs Main Pipeline

**Important Distinction**:

### Main OndemandEnv Pipeline
- Production-ready serverless services
- AWS-managed infrastructure
- Automatic scaling and high availability
- S3-based service communication
- Contract-defined dependencies

### Home Vector Server
- Local development tool
- Docker-based standalone service
- For testing and development only
- NOT part of the ondemandenv.dev architecture
- Can be integrated via Vector Storage Service configuration

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Example usage**:
   ```typescript
   import { App } from 'aws-cdk-lib';
   import { RagContracts } from '@contractslib/rag-contracts';

   const app = new App();
   const ragContracts = new RagContracts(app);
   
   // Access service builds
   const docIngestion = ragContracts.ragDocumentIngestionBuild;
   const docProcessing = ragContracts.ragDocumentProcessingBuild;
   const embedding = ragContracts.ragEmbeddingBuild;
   const vectorStorage = ragContracts.ragVectorStorageBuild;
   ```

## Service Naming Convention

All services follow consistent naming patterns:

### CDK Construct Prefixes
- **Document Ingestion**: `Ing` (e.g., `IngValidationQueue`)
- **Document Processing**: `Proc` (e.g., `ProcBasicQueue`) 
- **Embedding**: `Emb` (e.g., `EmbProcessingQueue`)
- **Vector Storage**: `Vec` (e.g., `VecIndexQueue`)
- **Knowledge Retrieval**: `Ret` (e.g., `RetSearchQueue`)
- **Generation**: `Gen` (e.g., `GenResponseQueue`)

This ensures clear resource identification and avoids naming conflicts.

## Testing

The project includes comprehensive tests covering:
- Contract instantiation and singleton pattern
- Service build initialization
- GitHub repository configuration  
- AWS account setup
- Environment validation

Run tests with: `npm test`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the OndemandEnv patterns
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. 