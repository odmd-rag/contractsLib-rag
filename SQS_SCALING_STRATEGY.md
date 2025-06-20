# RAG System SQS Scaling Strategy

## 📋 Overview

This document outlines the current SQS limitations in our RAG system and provides a strategic roadmap for scaling message processing as traffic grows. **Current implementation is optimized for moderate scale** (< 10K documents/day) with clear migration paths for enterprise-grade throughput.

## 🎯 Current SQS Architecture

### **Message Flow**
```
Document Processing → S3 → Embedding Poller → SQS Queue → Lambda Processor → S3 Embeddings
                                                ↓
                                            Vector Poller → SQS Queue → Lambda Processor → OpenSearch
```

### **Current Configuration**
```typescript
// Embedding Service
embeddingProcessingQueue: {
    batchSize: 10,
    visibilityTimeout: 15 minutes,
    maxReceiveCount: 3,
    pollingInterval: 1 minute
}

// Vector Storage Service  
vectorProcessingQueue: {
    batchSize: 5,
    visibilityTimeout: 15 minutes,
    maxReceiveCount: 3,
    pollingInterval: 1 minute
}
```

## 📊 Performance Analysis

### **Current Throughput Capacity**
- **Embedding Queue**: 120 messages/minute (10 msgs × 12 batches/min)
- **Vector Queue**: 60 messages/minute (5 msgs × 12 batches/min)
- **Daily Capacity**: ~86,400 embedding chunks/day
- **Optimal Workload**: 5-10K documents/day with 10-20 chunks each

### **Bottleneck Analysis**
| Component | Current Limit | Bottleneck Type |
|-----------|---------------|-----------------|
| SQS Standard | 3,000 msgs/sec | Not the limitation |
| Lambda Concurrency | 1000 concurrent | Regional limit |
| Bedrock API | 1000 TPS | Service quota |
| OpenSearch Serverless | Variable | Capacity units |
| **Actual Bottleneck** | **Lambda batch processing** | **120 msgs/min** |

## 🚨 Scaling Trigger Points

### **Phase 1: Current SQS Optimization** (0-10K docs/day)
**Triggers:**
- Queue depth consistently > 100 messages
- Processing lag > 5 minutes during peak hours
- DLQ message rate > 1% of total throughput

**Actions:**
- Optimize batch sizes and Lambda memory allocation
- Implement multiple parallel queues
- Fine-tune visibility timeouts

### **Phase 2: Advanced SQS Patterns** (10K-50K docs/day)
**Triggers:**
- Daily document volume > 10,000
- Peak hour processing > 2,000 documents
- Queue processing lag > 15 minutes

**Actions:**
- Implement message routing by size/complexity
- Add circuit breaker patterns
- Deploy regional processing queues

### **Phase 3: Kinesis Migration** (50K+ docs/day)
**Triggers:**
- Daily document volume > 50,000
- Real-time processing requirements (< 1 minute latency)
- Batch upload scenarios > 1,000 documents
- Cross-region replication needs

**Actions:**
- Migrate to Kinesis Data Streams
- Implement stream-based processing
- Add advanced retry and error handling

## 💰 Cost Analysis

### **Current SQS Costs** (Estimated)
```
Monthly Volume: 300K documents × 15 chunks = 4.5M messages
SQS Standard: $0.40 per million requests
Monthly SQS Cost: ~$2.00

Lambda Invocations: 450K invocations (batches of 10)
Lambda Cost: ~$0.20 per million requests
Monthly Lambda Cost: ~$0.10

Total Monthly Cost: ~$2.10
```

### **Kinesis Alternative Costs**
```
Kinesis Data Streams: $0.015 per shard hour
Minimum Setup: 2 shards × 24 hours × 30 days = 1,440 shard hours
Monthly Kinesis Cost: ~$21.60

Cost Difference: ~$19.50/month vs current SQS
Break-even Point: When processing efficiency gains > $19.50/month in compute savings
```

### **Decision Matrix**
| Scenario | Volume | SQS Cost | Kinesis Cost | Recommendation |
|----------|--------|----------|--------------|----------------|
| Current | 4.5M msgs/month | $2 | $22 | **SQS** |
| Medium Scale | 15M msgs/month | $6 | $22 | **SQS** |
| High Scale | 50M msgs/month | $20 | $25 | **Kinesis** |
| Enterprise | 150M msgs/month | $60 | $30 | **Kinesis** |

## 🛠️ Implementation Roadmap

### **Phase 1: SQS Optimization** (Immediate - 3 months)

#### **1.1 Message Size Optimization**
```typescript
// Move large content to S3, reference in SQS
interface OptimizedMessage {
    documentId: string;
    chunkId: string;
    s3ContentKey: string;    // Reference to actual content
    metadata: ChunkMetadata; // Keep small metadata in message
    processingHints: {
        estimatedSize: number;
        complexity: 'simple' | 'complex';
        priority: 'low' | 'normal' | 'high';
    };
}
```

#### **1.2 Parallel Queue Implementation**
```typescript
// Route messages to multiple queues based on characteristics
export class MessageRouter {
    routeMessage(message: EmbeddingTask): string {
        if (message.content.length > 50000) {
            return this.largeContentQueue.queueUrl;
        }
        if (message.priority === 'high') {
            return this.priorityQueue.queueUrl;
        }
        return this.standardQueues[this.getNextQueueIndex()].queueUrl;
    }
}
```

#### **1.3 Enhanced Error Handling**
```typescript
// Intelligent retry with exponential backoff
const retryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
        'ThrottlingException',
        'ServiceUnavailableException',
        'InternalServerError'
    ]
};
```

### **Phase 2: Advanced SQS Patterns** (3-12 months)

#### **2.1 Multi-Region Processing**
```typescript
// Deploy processing in multiple regions
export class MultiRegionProcessing {
    regions = ['us-east-1', 'us-west-2', 'eu-west-1'];
    
    routeToRegion(message: EmbeddingTask): string {
        // Route based on data residency, load, or latency requirements
        return this.selectOptimalRegion(message);
    }
}
```

#### **2.2 Adaptive Batch Sizing**
```typescript
// Dynamically adjust batch sizes based on queue depth and processing time
export class AdaptiveBatchProcessor {
    calculateOptimalBatchSize(queueDepth: number, avgProcessingTime: number): number {
        if (queueDepth > 1000) return 15; // Larger batches for high load
        if (avgProcessingTime > 10000) return 5; // Smaller batches for complex content
        return 10; // Default batch size
    }
}
```

### **Phase 3: Kinesis Migration** (12+ months, when needed)

#### **3.1 Hybrid Architecture**
```typescript
// Gradual migration with both SQS and Kinesis
export class HybridMessageProcessing {
    routeMessage(message: EmbeddingTask): 'sqs' | 'kinesis' {
        // Route high-volume, real-time messages to Kinesis
        if (message.source === 'batch-upload' || message.realTime) {
            return 'kinesis';
        }
        // Keep standard processing on SQS
        return 'sqs';
    }
}
```

#### **3.2 Kinesis Configuration**
```typescript
// High-throughput stream configuration
const embeddingDataStream = new kinesis.Stream(this, 'EmbeddingStream', {
    streamName: 'rag-embedding-stream',
    shardCount: 5,                    // Start with 5 shards (5,000 records/sec)
    retentionPeriod: cdk.Duration.hours(24),
    encryption: kinesis.StreamEncryption.KMS,
    encryptionKey: kms.Alias.fromAliasName(this, 'StreamKey', 'alias/kinesis-key')
});

// Enhanced Lambda processing
embeddingProcessorHandler.addEventSource(new lambdaEventSources.KinesisEventSource(embeddingDataStream, {
    batchSize: 100,
    parallelizationFactor: 10,
    startingPosition: lambda.StartingPosition.LATEST,
    maxBatchingWindow: cdk.Duration.seconds(5),
    retryAttempts: 3,
    maxRecordAge: cdk.Duration.hours(1)
}));
```

## 📈 Monitoring and Alerting

### **Key Metrics to Track**
```typescript
// CloudWatch metrics for scaling decisions
const scalingMetrics = {
    queueDepth: 'AWS/SQS/ApproximateNumberOfVisibleMessages',
    processingLatency: 'AWS/Lambda/Duration', 
    errorRate: 'AWS/Lambda/Errors',
    throughput: 'Custom/RAG/MessagesProcessedPerMinute',
    costPerMessage: 'Custom/RAG/CostPerMessage'
};

// Alerting thresholds
const alerts = {
    queueDepthCritical: 500,        // Consider scaling action
    processingLatencyHigh: 30000,   // 30 second processing time
    errorRateHigh: 0.05,           // 5% error rate
    dailyVolumeHigh: 40000         // 40K documents/day
};
```

### **Automated Scaling Triggers**
```typescript
// CloudWatch alarms that trigger scaling reviews
export const scalingAlarms = [
    {
        name: 'HighQueueDepth',
        threshold: 500,
        evaluationPeriods: 3,
        action: 'Review batch sizes and Lambda concurrency'
    },
    {
        name: 'ProcessingLag',
        threshold: 900, // 15 minutes
        evaluationPeriods: 2,
        action: 'Consider additional processing queues'
    },
    {
        name: 'DailyVolumeGrowth',
        threshold: 0.5, // 50% week-over-week growth
        evaluationPeriods: 1,
        action: 'Plan for next scaling phase'
    }
];
```

## 🎯 Decision Framework

### **When to Optimize Current SQS**
- ✅ Queue depth occasionally spikes but recovers
- ✅ Processing lag < 15 minutes during peak hours  
- ✅ Daily volume < 25K documents
- ✅ Cost optimization is priority

### **When to Consider Kinesis Migration**
- ❌ Consistent queue depths > 1000 messages
- ❌ Processing lag > 30 minutes regularly
- ❌ Daily volume > 50K documents
- ❌ Real-time processing requirements (< 1 minute)
- ❌ Cross-region replication needs
- ❌ Advanced stream processing requirements

### **Migration Risk Assessment**
| Risk Factor | Mitigation Strategy |
|-------------|-------------------|
| **Increased Complexity** | Gradual hybrid migration |
| **Cost Increase** | Detailed cost modeling before migration |
| **Operational Overhead** | Enhanced monitoring and alerting |
| **Data Loss Risk** | Comprehensive testing in non-prod |
| **Performance Regression** | Parallel processing validation |

## 📚 References and Resources

### **AWS Documentation**
- [SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)
- [Kinesis Data Streams](https://docs.aws.amazon.com/kinesis/latest/dev/introduction.html)
- [Lambda Event Source Mapping](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html)

### **OnDemandEnv Platform**
- [Contract-based Scaling Patterns](https://ondemandenv.dev/patterns.html)
- [Cross-Service Communication](https://ondemandenv.dev/documentation.html)

### **Implementation Examples**
- `coffee-shop--order-manager`: State machine-based processing patterns
- `rag-embedding-service`: Current SQS implementation reference
- `rag-vector-storage-service`: Multi-queue processing example

---

## 📝 Maintenance Notes

**Last Updated**: December 2024  
**Next Review**: March 2025 (or when daily volume > 15K docs)  
**Owner**: RAG Platform Team  
**Stakeholders**: Architecture Review Board, FinOps Team

**Change Log**:
- 2024-12: Initial version based on current SQS analysis
- TBD: Update based on production metrics and scaling needs 