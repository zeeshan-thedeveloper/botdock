import {
  TransportError,
  type ChatStreamEvent,
  type MessageTransport,
  type WidgetConfig,
  type WidgetMessage,
} from './types.js';

type BannerState =
  | { kind: 'rate_limited'; message: string; secondsLeft: number }
  | { kind: 'forbidden' | 'not_found'; message: string }
  | { kind: 'network'; message: string };

const DISABLING_BANNER_KINDS = new Set(['forbidden', 'not_found', 'rate_limited']);

const ICON_CHAT =
  '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

/**
 * Persisted across reloads so a returning visitor keeps both their identity
 * (visitorId) and their open conversation thread (conversationId) — without
 * the latter, every page refresh would silently start a brand-new
 * conversation server-side and the assistant would lose all prior context.
 * localStorage can throw (Safari private mode, sandboxed iframes); never let
 * widget mount fail because of it — a fresh id per session is an acceptable
 * fallback.
 */
function readPersisted(deploymentId: string, kind: 'visitor' | 'conversation'): string | undefined {
  try {
    return window.localStorage.getItem(`botdock_${kind}_${deploymentId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

function persist(deploymentId: string, kind: 'visitor' | 'conversation', value: string): void {
  try {
    window.localStorage.setItem(`botdock_${kind}_${deploymentId}`, value);
  } catch {
    // Best-effort continuity only.
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styles(): string {
  return `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .root {
      position: fixed;
      bottom: 20px;
      z-index: 2147483000;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .root[data-position="bottom-right"] { right: 20px; }
    .root[data-position="bottom-left"] { left: 20px; }

    .launcher {
      width: 56px;
      height: 56px;
      border-radius: 999px;
      border: none;
      background: var(--botdock-accent, #17201b);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(23, 32, 27, 0.28);
      transition: transform 0.15s ease;
    }
    .launcher:hover { transform: scale(1.05); }
    .root[data-open="true"] .launcher { display: none; }

    .panel {
      position: absolute;
      bottom: 0;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 100px);
      border: 1px solid #dbe7df;
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(23, 32, 27, 0.22);
      background: #ffffff;
      color: #17201b;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .root[data-position="bottom-right"] .panel { right: 0; }
    .root[data-position="bottom-left"] .panel { left: 0; }
    .root[data-open="false"] .panel { display: none; }

    .panel-header {
      padding: 14px 16px;
      background: var(--botdock-accent, #17201b);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .panel-title { font-weight: 700; font-size: 14px; }
    .close-btn {
      border: none;
      background: transparent;
      color: #ffffff;
      cursor: pointer;
      opacity: 0.85;
      display: flex;
      align-items: center;
      padding: 2px;
    }
    .close-btn:hover { opacity: 1; }

    .banner {
      padding: 8px 14px;
      font-size: 12.5px;
      line-height: 1.4;
      border-bottom: 1px solid #dbe7df;
      flex-shrink: 0;
    }
    .banner[data-kind="rate_limited"] { background: #fff6df; color: #6b4e00; }
    .banner[data-kind="network"] { background: #fff6df; color: #6b4e00; }
    .banner[data-kind="forbidden"],
    .banner[data-kind="not_found"] { background: #fdecec; color: #7a1f1f; }

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .welcome { font-size: 13.5px; line-height: 1.6; color: #3a453e; }

    .bubble {
      max-width: 82%;
      font-size: 13.5px;
      line-height: 1.55;
      padding: 9px 12px;
      border-radius: 12px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .bubble[data-role="user"] {
      align-self: flex-end;
      background: var(--botdock-accent, #17201b);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .bubble[data-role="assistant"] {
      align-self: flex-start;
      background: #f2f6f3;
      color: #17201b;
      border-bottom-left-radius: 4px;
    }
    .bubble[data-status="error"] { background: #fdecec; color: #7a1f1f; }

    .cursor {
      display: inline-block;
      width: 6px;
      height: 13px;
      margin-left: 2px;
      background: #6b7a70;
      vertical-align: middle;
      animation: blink 1s step-start infinite;
    }
    @keyframes blink { 50% { opacity: 0; } }

    .sources-toggle {
      display: block;
      margin-top: 6px;
      border: none;
      background: transparent;
      color: #4c5f52;
      font-size: 11.5px;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
    }
    .sources-list {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid rgba(23, 32, 27, 0.12);
      font-size: 11.5px;
      color: #4c5f52;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .composer {
      flex-shrink: 0;
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid #dbe7df;
      align-items: flex-end;
    }
    .composer-input {
      flex: 1;
      resize: none;
      border: 1px solid #dbe7df;
      border-radius: 10px;
      padding: 8px 10px;
      font: inherit;
      font-size: 13.5px;
      max-height: 96px;
      overflow-y: auto;
      color: #17201b;
    }
    .composer-input:focus { outline: 2px solid var(--botdock-accent, #17201b); outline-offset: 1px; }
    .composer-input:disabled { background: #f4f6f5; color: #8a978e; }
    .send-btn {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border-radius: 999px;
      border: none;
      background: var(--botdock-accent, #17201b);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .powered-by {
      flex-shrink: 0;
      text-align: center;
      padding: 6px 0 10px;
      font-size: 10.5px;
      color: #93a19a;
    }
    .powered-by a { color: inherit; }

    @media (max-width: 480px) {
      .root[data-open="true"] .panel {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }
    }
  `;
}

export function mountWidget(host: HTMLElement, config: WidgetConfig, transport: MessageTransport) {
  host.style.setProperty('--botdock-accent', config.accentColor);
  const shadowRoot = host.attachShadow({ mode: 'open' });
  shadowRoot.innerHTML = `
    <style>${styles()}</style>
    <div class="root" data-position="${config.position}" data-open="false">
      <button class="launcher" type="button" aria-label="Open chat">${ICON_CHAT}</button>
      <div class="panel">
        <header class="panel-header">
          <span class="panel-title">Chat with us</span>
          <button class="close-btn" type="button" aria-label="Close chat">${ICON_CLOSE}</button>
        </header>
        <div class="banner" hidden></div>
        <div class="message-list" role="log" aria-live="polite"></div>
        <form class="composer">
          <textarea class="composer-input" rows="1" placeholder="Type a message..."></textarea>
          <button class="send-btn" type="submit" aria-label="Send message">${ICON_SEND}</button>
        </form>
        <footer class="powered-by">Powered by <a href="https://botdock.dev" target="_blank" rel="noopener noreferrer">BotDock</a></footer>
      </div>
    </div>
  `;

  const rootEl = shadowRoot.querySelector<HTMLDivElement>('.root')!;
  const launcherEl = shadowRoot.querySelector<HTMLButtonElement>('.launcher')!;
  const closeBtnEl = shadowRoot.querySelector<HTMLButtonElement>('.close-btn')!;
  const bannerEl = shadowRoot.querySelector<HTMLDivElement>('.banner')!;
  const messageListEl = shadowRoot.querySelector<HTMLDivElement>('.message-list')!;
  const composerEl = shadowRoot.querySelector<HTMLFormElement>('.composer')!;
  const inputEl = shadowRoot.querySelector<HTMLTextAreaElement>('.composer-input')!;
  const sendBtnEl = shadowRoot.querySelector<HTMLButtonElement>('.send-btn')!;

  let isOpen = false;
  let messages: WidgetMessage[] = [];
  let isStreaming = false;
  let conversationId: string | undefined = readPersisted(config.deploymentId, 'conversation');
  let visitorId: string | undefined = readPersisted(config.deploymentId, 'visitor');
  let banner: BannerState | null = null;
  const expandedSources = new Set<string>();
  let rateLimitTimer: ReturnType<typeof setInterval> | undefined;
  let activeAbortController: AbortController | undefined;

  function isComposerDisabled(): boolean {
    return isStreaming || (banner !== null && DISABLING_BANNER_KINDS.has(banner.kind));
  }

  function renderBanner() {
    if (!banner) {
      bannerEl.hidden = true;
      bannerEl.textContent = '';
      bannerEl.removeAttribute('data-kind');
      return;
    }
    bannerEl.hidden = false;
    bannerEl.dataset.kind = banner.kind;
    bannerEl.textContent =
      banner.kind === 'rate_limited' ? `${banner.message} (${banner.secondsLeft}s)` : banner.message;
  }

  function renderMessages() {
    if (messages.length === 0) {
      messageListEl.innerHTML = `<p class="welcome">${escapeHtml(config.welcomeMessage)}</p>`;
      return;
    }

    messageListEl.innerHTML = messages
      .map((message) => {
        const isExpanded = expandedSources.has(message.id);
        const citationsHtml =
          message.citations && message.citations.length > 0
            ? `<button class="sources-toggle" type="button" data-toggle-sources="${message.id}">${
                isExpanded ? 'Hide sources' : `Sources (${message.citations.length})`
              }</button>${
                isExpanded
                  ? `<div class="sources-list">${message.citations
                      .map((source) => `<span>${escapeHtml(source.label)}${source.location ? ` · ${escapeHtml(source.location)}` : ''}</span>`)
                      .join('')}</div>`
                  : ''
              }`
            : '';

        const cursorHtml = message.status === 'streaming' ? '<span class="cursor"></span>' : '';
        const errorHtml = message.status === 'error' && message.errorMessage
          ? `<div style="margin-top:6px;font-size:11.5px;">${escapeHtml(message.errorMessage)}</div>`
          : '';

        return `<div class="bubble" data-role="${message.role}" data-status="${message.status}">${escapeHtml(message.content)}${cursorHtml}${errorHtml}${citationsHtml}</div>`;
      })
      .join('');

    messageListEl.scrollTo({ top: messageListEl.scrollHeight });
  }

  function renderComposer() {
    const disabled = isComposerDisabled();
    inputEl.disabled = disabled;
    sendBtnEl.disabled = disabled || inputEl.value.trim().length === 0;
  }

  function render() {
    rootEl.dataset.open = String(isOpen);
    renderBanner();
    renderMessages();
    renderComposer();
  }

  function open() {
    isOpen = true;
    render();
    inputEl.focus();
  }

  function close() {
    isOpen = false;
    render();
  }

  function startRateLimitCountdown(seconds: number, message: string) {
    if (rateLimitTimer) clearInterval(rateLimitTimer);
    banner = { kind: 'rate_limited', message, secondsLeft: seconds };
    render();
    rateLimitTimer = setInterval(() => {
      if (!banner || banner.kind !== 'rate_limited') {
        clearInterval(rateLimitTimer);
        return;
      }
      banner = { ...banner, secondsLeft: banner.secondsLeft - 1 };
      if (banner.secondsLeft <= 0) {
        clearInterval(rateLimitTimer);
        banner = null;
      }
      render();
    }, 1000);
  }

  function updateMessage(id: string, patch: Partial<WidgetMessage>) {
    messages = messages.map((message) => (message.id === id ? { ...message, ...patch } : message));
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isComposerDisabled()) return;

    if (banner && banner.kind !== 'rate_limited') {
      banner = null;
    }

    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `assistant_${Date.now()}`;
    messages = [
      ...messages,
      { id: userMessageId, role: 'user', content: text, status: 'complete' },
      { id: assistantMessageId, role: 'assistant', content: '', status: 'streaming' },
    ];
    isStreaming = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    render();

    const controller = new AbortController();
    activeAbortController = controller;

    try {
      const generator = transport({ message: text, conversationId, visitorId, signal: controller.signal });
      let step = await generator.next();
      while (!step.done) {
        handleStreamEvent(step.value, assistantMessageId);
        render();
        step = await generator.next();
      }
      if (step.value?.visitorId) {
        visitorId = step.value.visitorId;
        persist(config.deploymentId, 'visitor', visitorId);
      }
      updateMessage(assistantMessageId, { status: 'complete' });
    } catch (error) {
      if (controller.signal.aborted) {
        updateMessage(assistantMessageId, { status: 'complete' });
      } else if (error instanceof TransportError) {
        handleTransportError(error, assistantMessageId);
      } else {
        banner = { kind: 'network', message: 'Could not reach the assistant. Please try again.' };
        updateMessage(assistantMessageId, { status: 'error', errorMessage: 'Message not sent.' });
      }
    } finally {
      isStreaming = false;
      activeAbortController = undefined;
      render();
    }
  }

  function handleStreamEvent(event: ChatStreamEvent, assistantMessageId: string) {
    if (event.type === 'token') {
      updateMessage(assistantMessageId, {
        content: (messages.find((message) => message.id === assistantMessageId)?.content ?? '') + event.delta,
      });
    } else if (event.type === 'citation') {
      updateMessage(assistantMessageId, { citations: event.sources });
    } else if (event.type === 'done') {
      conversationId = event.conversationId;
      persist(config.deploymentId, 'conversation', event.conversationId);
    } else if (event.type === 'error') {
      updateMessage(assistantMessageId, { status: 'error', errorMessage: event.message });
    }
    // 'usage' is intentionally handled silently — no public-facing UI for it.
  }

  function handleTransportError(error: TransportError, assistantMessageId: string) {
    messages = messages.filter((message) => message.id !== assistantMessageId);
    if (error.kind === 'rate_limited') {
      startRateLimitCountdown(error.retryAfterSeconds ?? 30, error.message);
    } else if (error.kind === 'forbidden' || error.kind === 'not_found') {
      banner = { kind: error.kind, message: error.message };
    } else {
      banner = { kind: 'network', message: error.message };
    }
  }

  launcherEl.addEventListener('click', open);
  closeBtnEl.addEventListener('click', close);

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${inputEl.scrollHeight}px`;
    renderComposer();
  });

  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composerEl.requestSubmit();
    }
  });

  composerEl.addEventListener('submit', (event) => {
    event.preventDefault();
    void sendMessage(inputEl.value);
  });

  messageListEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const messageId = target.dataset.toggleSources;
    if (!messageId) return;
    if (expandedSources.has(messageId)) {
      expandedSources.delete(messageId);
    } else {
      expandedSources.add(messageId);
    }
    renderMessages();
  });

  render();

  return {
    destroy() {
      activeAbortController?.abort();
      if (rateLimitTimer) clearInterval(rateLimitTimer);
      host.remove();
    },
  };
}
