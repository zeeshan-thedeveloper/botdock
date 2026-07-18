type WidgetConfig = {
  botId: string;
  apiBaseUrl: string;
  welcomeMessage: string;
};

const DEFAULT_CONFIG: WidgetConfig = {
  botId: 'demo-bot',
  apiBaseUrl: 'http://localhost:4000',
  welcomeMessage: 'Hi, I am the BotDock demo assistant.',
};

function readConfig(script: HTMLScriptElement | null): WidgetConfig {
  return {
    botId: script?.dataset.botId ?? DEFAULT_CONFIG.botId,
    apiBaseUrl: script?.dataset.apiBaseUrl ?? DEFAULT_CONFIG.apiBaseUrl,
    welcomeMessage: script?.dataset.welcomeMessage ?? DEFAULT_CONFIG.welcomeMessage,
  };
}

function mountBotDockWidget(
  config = readConfig(document.currentScript as HTMLScriptElement | null),
) {
  const host = document.createElement('div');
  host.setAttribute('data-botdock-root', config.botId);
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  shadowRoot.innerHTML = `
    <style>
      :host { all: initial; }
      .launcher {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 360px;
        max-width: calc(100vw - 32px);
        border: 1px solid #dbe7df;
        border-radius: 8px;
        box-shadow: 0 18px 40px rgba(23, 32, 27, 0.16);
        background: #ffffff;
        color: #17201b;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow: hidden;
      }
      .header { padding: 14px 16px; background: #17201b; color: #ffffff; font-weight: 700; }
      .body { padding: 16px; display: grid; gap: 12px; }
      .message { line-height: 1.5; font-size: 14px; }
      .suggestion { border: 1px solid #dbe7df; background: #f7faf8; padding: 9px 10px; border-radius: 6px; text-align: left; }
      .meta { color: #5a6f62; font-size: 12px; }
    </style>
    <aside class="launcher" aria-label="BotDock chat widget">
      <div class="header">BotDock Assistant</div>
      <div class="body">
        <div class="message">${config.welcomeMessage}</div>
        <button class="suggestion" type="button">What can this assistant answer?</button>
        <div class="meta">Bot ID: ${config.botId} · API: ${config.apiBaseUrl}</div>
      </div>
    </aside>
  `;
}

declare global {
  interface Window {
    BotDockWidget?: { mount: typeof mountBotDockWidget };
  }
}

window.BotDockWidget = { mount: mountBotDockWidget };

if (document.currentScript) {
  mountBotDockWidget();
}

export {};
