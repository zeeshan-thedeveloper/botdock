import { BotDockClient, type SessionStorageLike } from '@botdock/sdk';
import type { WidgetConfig } from './types.js';
import { mountWidget } from './widget.js';

/** Best-effort: localStorage can throw (Safari private mode, sandboxed iframes); fall back to in-memory for the page's lifetime. */
const localStorageAdapter: SessionStorageLike = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Best-effort continuity only.
    }
  },
};

const DEFAULT_CONFIG: WidgetConfig = {
  deploymentId: '',
  apiBaseUrl: 'http://localhost:4000',
  welcomeMessage: 'Hi, I am the BotDock demo assistant. How can I help?',
  accentColor: '#17201b',
  position: 'bottom-right',
};

function resolveScriptElement(): HTMLScriptElement | null {
  // document.currentScript is always null for `type="module"` scripts (e.g.
  // the demo-site dev harness, which loads the widget as a module for hot
  // reload); the real embed snippet is a classic script, where it works. The
  // data-deployment-id attribute lookup covers both.
  return (document.currentScript as HTMLScriptElement | null) ?? document.querySelector('script[data-deployment-id]');
}

function readConfig(script: HTMLScriptElement | null): WidgetConfig {
  const position = script?.dataset.position === 'bottom-left' ? 'bottom-left' : DEFAULT_CONFIG.position;
  return {
    deploymentId: script?.dataset.deploymentId ?? DEFAULT_CONFIG.deploymentId,
    apiBaseUrl: script?.dataset.apiBaseUrl ?? DEFAULT_CONFIG.apiBaseUrl,
    welcomeMessage: script?.dataset.welcomeMessage ?? DEFAULT_CONFIG.welcomeMessage,
    accentColor: script?.dataset.accentColor ?? DEFAULT_CONFIG.accentColor,
    position,
  };
}

function mountBotDockWidget(config = readConfig(resolveScriptElement())) {
  const host = document.createElement('div');
  host.setAttribute('data-botdock-root', config.deploymentId || 'unconfigured');
  document.body.appendChild(host);

  const client = new BotDockClient({
    baseUrl: config.apiBaseUrl,
    deploymentId: config.deploymentId,
    storage: localStorageAdapter,
  });
  return mountWidget(host, config, client);
}

declare global {
  interface Window {
    BotDockWidget?: { mount: typeof mountBotDockWidget };
  }
}

window.BotDockWidget = { mount: mountBotDockWidget };

if (resolveScriptElement()) {
  mountBotDockWidget();
}

export {};
