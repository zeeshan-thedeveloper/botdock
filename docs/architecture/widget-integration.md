# Widget Integration

Status: In Progress

The widget is a Vite TypeScript application intended to produce a lightweight framework-independent bundle. It reads configuration from script data attributes:

```html
<script
  src="https://cdn.example.com/botdock-widget.js"
  data-bot-id="bot_123"
  data-api-base-url="https://api.example.com"
  data-welcome-message="How can I help?"
></script>
```

Current shell behavior:

- Creates an isolated shadow root.
- Displays a welcome message and suggested question.
- Shows bot ID and API base URL for foundation verification.

Planned behavior:

- Visitor session persistence.
- SSE response streaming.
- Source references.
- Feedback controls.
- Safe message rendering.
