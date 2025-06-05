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

### Document Processing Service  
- **Repository**: `rag-document-processing-service`
- **Purpose**: Document parsing and preprocessing
- **Key Features**:
  - Multi-format document parsing (PDF, DOCX, TXT, etc.)
  - Text extraction and cleaning
  - Kinesis stream management for parallel processing

### Embedding Service
- **Repository**: `rag-embedding-service` 
- **Purpose**: Generate vector embeddings
- **Key Features**:
  - Integration with embedding models (OpenAI, HuggingFace, etc.)
  - Batch processing capabilities
  - Embedding quality validation

### Vector Storage Service
- **Repository**: `rag-vector-storage-service`
- **Purpose**: Vector database operations
- **Key Features**:
  - Vector database management (Pinecone, OpenSearch, etc.)
  - Indexing and similarity search
  - Metadata management

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
  - LLM integration (OpenAI, Anthropic, etc.)
  - Prompt engineering and context injection
  - Response post-processing

## Data Flow

```
User Query
    ↓
Knowledge Retrieval ← Vector Storage ← Embedding ← Document Processing ← Document Ingestion
    ↓                                                     ↑
Generation                                               User Upload
    ↓
Response
```

## Environment Management

Each service has two environments:
- **Development** (`workspace0`): Mutable environment for testing
- **Production** (`workspace1`): Immutable environment for stable releases

## Event-Driven Architecture

The system uses EventBridge for loose coupling between services:
- **Document Ingestion** publishes `Document Validated` events
- **Document Processing** subscribes to validation events and publishes `Document Processed` events  
- **Embedding** subscribes to processing events and publishes `Embeddings Generated` events
- **Vector Storage** subscribes to embedding events for indexing

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
   ```

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