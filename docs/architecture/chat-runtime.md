# Chat Runtime

Status: Implemented

Chat is Server-Sent Events (SSE) over a plain `POST`, not `EventSource`
(the client needs to send a JSON body, which `EventSource` can't do) and
not NestJS's `@Sse()` decorator (the response needs manual control —
heartbeats, `X-Accel-Buffering: no`, an explicit abort path). The API
handler takes over the raw Express `Response`, writes
`data: <json>\n\n` per event, and both entry points share one
implementation, `ChatService.runChat` (an async generator), so the wire
protocol and prompt/retrieval pipeline exist in exactly one place.

## Two entry points, one runtime

| | Playground | Widget |
|---|---|---|
| Route | `POST /organisations/:orgId/bots/:botId/playground/messages` | `POST /public/bots/:deploymentId/messages` |
| Auth | Session cookie, tenant-scoped | None — origin-checked against the bot's allowed domains instead |
| Config used | The bot's **draft** (so an owner can test in-progress edits) | The bot's **published** version snapshot |
| Debug trace | Included when requested (retrieved chunks, prompt preview, model) | Never included — no internals reach an anonymous visitor |
| Rate limiting | None (authenticated, tenant already trusted) | Redis-backed, per `deploymentId` + client IP |
| Visitor identity | The session's user | An opaque `visitorId`, generated server-side if the caller doesn't supply one, echoed back via `X-BotDock-Visitor-Id` |

## Event protocol (`ChatStreamEvent`, `@botdock/contracts`)

A discriminated union on `type`:

- `token` — `{ delta: string }`, one per streamed chunk from the model.
- `citation` — `{ sources: ChatCitationSource[] }`, emitted once if
  retrieval found relevant knowledge chunks.
- `trace` — playground-only debug info (request id, model, retrieved
  chunks, prompt preview). Never sent on the public widget path.
- `usage` — `{ promptTokens, completionTokens, latencyMs, estCostUsd }`,
  after the model finishes.
- `done` — `{ conversationId, messageId }`.
- `error` — `{ code, message }` — safe, user-facing only; raw upstream
  provider errors are never forwarded.

## Pipeline (`ChatService.runChat`)

1. Resolve the bot (draft or published snapshot) and re-check the
   provider credential's `ACTIVE` status live — even for a published
   snapshot, a revoked/deleted key must fail immediately, not silently
   serve from stale cached state.
2. Resolve or create the `Conversation` row (stamped with `source` —
   `PLAYGROUND`/`WIDGET`/`API` — and `visitorId` for the widget path).
3. Persist the user's `Message`.
4. Retrieve relevant knowledge chunks (`RetrievalService`, pgvector
   cosine similarity, tenant+bot scoped, `MIN_RELEVANCE_SCORE` floor).
5. Build the prompt (`prompt.builder.ts`): safety preamble, retrieved
   context, conversation history, `strictKnowledge` fallback behavior.
6. Stream from the AI provider (`packages/ai-core`), forwarding `token`
   events and abort signal propagation as they arrive.
7. Persist the assistant `Message`, its `MessageSource` citations, and a
   `UsageRecord` — skipped for an aborted or errored turn, so cancelled
   requests don't leave zero-value cost rows.

## Cancellation

Both the playground and the widget wire an `AbortController` to the
response's `close` event and pass its `signal` through to the AI
provider. `ai-core`'s OpenAI provider stops **silently** on abort (no
thrown error) — `ChatService` checks `signal.aborted` unconditionally
after the streaming loop, not just inside its `catch` block, specifically
to catch that case; otherwise a cancelled request would still persist a
misleading zero-token `UsageRecord`.
