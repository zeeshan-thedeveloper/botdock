# Knowledge Ingestion

Status: Implemented (text and file sources; PDF parsing deferred)

Vector storage uses PostgreSQL with pgvector (`vector(1536)`, HNSW index,
cosine distance) rather than a dedicated vector database — simpler local
development and deployment, at the cost of not (yet) needing to scale
retrieval independently of the primary database.

## Pipeline

1. **Add a source** — `POST /organisations/:orgId/bots/:botId/knowledge`.
   Pasted text is stored directly; uploaded files go to MinIO/S3
   (`ObjectStorageService`) first. Either way, a `KnowledgeSource` row is
   created with `status: PROCESSING` and a job is enqueued.
2. **Ingest asynchronously** — a BullMQ worker (`IngestionWorkerService`,
   running in-process, not a separate deployable) picks up the job:
   - Parse (text sources pass through as-is; PDF parsing is not yet
     implemented and fails the source with a clear status rather than
     silently ingesting nothing).
   - Chunk (`text-chunker.ts`: ~1200 characters with ~150 character
     overlap, so a fact split across a chunk boundary is still
     retrievable from at least one side).
   - Embed each chunk (the tenant's own BYOK OpenAI credential —
     ingestion, like chat, spends the tenant's own tokens).
   - Store: `Document` + `DocumentChunk` rows, `DocumentChunk.embedding`
     inserted via raw SQL (`$executeRaw`) since Prisma's client doesn't
     have first-class `vector` type support.
   - Idempotent: re-ingesting a source deletes its existing chunks first,
     so a retry never leaves duplicates.
   - `KnowledgeSource.status` moves to `READY` or `FAILED`.
3. **Retrieve at chat time** — `RetrievalService.retrieve()`: embeds the
   user's message, runs a cosine-similarity query
   (`1 - (embedding <=> query_vector)`) scoped to the tenant + bot +
   model (an embedding from one model isn't comparable to another),
   applies a minimum relevance floor (`MIN_RELEVANCE_SCORE`) and a total
   context budget (`MAX_CONTEXT_CHARS`) before handing chunks to the
   prompt builder.

## Notes for local development

- The pgvector extension and HNSW index are hand-added to the generated
  Prisma migration SQL (`CREATE EXTENSION IF NOT EXISTS vector` +
  `CREATE INDEX ... USING hnsw`) since neither is representable in
  `schema.prisma` directly. Every subsequent migration touching this
  schema will have Prisma's diff engine propose dropping that index —
  strip that line from the generated SQL before applying, it's not real.
- Ingestion can be exercised end-to-end locally against a mock
  OpenAI-compatible server (`/v1/embeddings`, `/v1/chat/completions`) via
  the `OPENAI_BASE_URL` override, without spending real API credits.
