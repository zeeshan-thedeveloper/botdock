import { defineConfig } from 'vite';

// Versioned by path, not filename hash: the embed snippet customers paste
// once must keep resolving to "the latest v1 build" without them touching
// it (same convention as js.stripe.com/v3/, etc.). A future breaking change
// to the wire protocol gets a new /v2/ path; old /v1/ embeds keep working.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'BotDockWidget',
      formats: ['iife'],
      fileName: () => 'v1/botdock-widget.js',
    },
  },
});
