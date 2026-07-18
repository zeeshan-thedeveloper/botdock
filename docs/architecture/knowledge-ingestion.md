# Knowledge Ingestion

Status: Planned

Knowledge ingestion is deliberately deferred beyond the repository foundation. The architecture will separate parsing, chunking, embedding, storage, retrieval, reranking, and prompt context construction.

For the MVP, vector storage should use PostgreSQL with pgvector. This keeps local development and deployment simpler while preserving the option to move retrieval into a dedicated vector database later.
