# Chat Runtime

Status: Planned

The initial runtime should use Server-Sent Events for streamed chatbot responses. SSE fits the first vertical slice because chatbot responses are server-to-client streams, browser support is broad, infrastructure is simpler than WebSockets, and reconnect/error semantics are straightforward.

Planned flow:

1. Visitor opens the widget with a bot ID.
2. Widget creates or resumes a visitor session.
3. API validates deployment, allowed domain, and rate limits.
4. API loads the published bot version.
5. Retrieval prepares cited context.
6. AI provider streams chunks through the API as SSE events.
7. API records messages, source links, latency, token usage, model metadata, and errors.
