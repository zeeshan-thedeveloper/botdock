import './styles.css';

const widgetScriptUrl =
  import.meta.env.VITE_BOTDOCK_WIDGET_URL ?? 'http://localhost:5173/src/main.ts';
const apiBaseUrl = import.meta.env.VITE_BOTDOCK_API_BASE_URL ?? 'http://localhost:4000';
const deploymentId = import.meta.env.VITE_BOTDOCK_DEPLOYMENT_ID ?? '';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <section class="page">
    <nav class="nav">
      <strong>Acme Developer Docs</strong>
      <span>Demo customer site</span>
    </nav>
    <article class="hero">
      <p class="eyebrow">External website</p>
      <h1>Embed BotDock where customers already need help.</h1>
      <p>
        This shell represents a documentation site consuming the framework-independent
        BotDock widget through script data attributes.
      </p>
    </article>
  </section>
`;

const widgetScript = document.createElement('script');
// Dev mode points VITE_BOTDOCK_WIDGET_URL at the widget's raw .ts source
// served by `vite dev`, which needs type="module" to parse import/export.
// The real embed (and the built IIFE bundle this container serves) is a
// classic, cross-origin `defer` script — module scripts enforce CORS on
// cross-origin fetches, which the static nginx config doesn't send, so
// forcing type="module" here would silently fail to load the real bundle.
if (widgetScriptUrl.endsWith('.ts')) {
  widgetScript.type = 'module';
} else {
  widgetScript.defer = true;
}
widgetScript.src = widgetScriptUrl;
widgetScript.dataset.deploymentId = deploymentId;
widgetScript.dataset.apiBaseUrl = apiBaseUrl;
widgetScript.dataset.welcomeMessage = 'Welcome to the demo documentation assistant.';
document.body.appendChild(widgetScript);
