'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CheckCircle2, Copy, Monitor, Smartphone, TabletSmartphone } from 'lucide-react';
import { Button, CodeBlock, Tab, Tabs } from '@botdock/ui';

// What the embedded widget actually renders today. The embed snippet carries no
// appearance attributes, so visitors get the widget's built-in defaults
// (apps/widget/src/main.ts DEFAULT_CONFIG and the markup in widget.ts).
const WIDGET_ACCENT = '#17201b';
const WIDGET_TITLE = 'Chat with us';
const WIDGET_WELCOME = 'Hi, I am the BotDock demo assistant. How can I help?';
const SAMPLE_QUESTION = 'Do you ship internationally?';
const SAMPLE_ANSWER =
  'Yes! We ship to over 40 countries. Orders usually arrive in 5–9 business days.';

const FALLBACK_HOST = 'your-site.com';

/** Shows the deployment id as `dep_••••••••••••067b` so it can't be read off a screen share. */
export function maskDeploymentId(snippet: string, deploymentId: string | null): string {
  if (!deploymentId) return snippet;
  const prefix = deploymentId.startsWith('dep_') ? 'dep_' : '';
  const masked = `${prefix}${'•'.repeat(12)}${deploymentId.slice(-4)}`;
  return snippet.split(deploymentId).join(masked);
}

/** The first allowed domain an app could use as its WebView origin, or a placeholder. */
export function pickPreviewHost(patterns: string[]): string {
  const exactHost = patterns.find(
    (pattern) => !pattern.includes('*') && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(pattern),
  );
  return exactHost ?? FALLBACK_HOST;
}

/**
 * A minimal Android Activity that hosts the widget in a WebView. The base URL
 * becomes the page's origin, and the widget only answers origins listed in
 * Allowed domains, so it has to be one of them.
 */
export function buildAndroidSnippet(embedSnippet: string, host: string): string {
  return `import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class SupportChatActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            // Keeps the visitor's conversation between app launches.
            settings.domStorageEnabled = true
        }

        val html = """
            <!doctype html>
            <html>
              <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
              <body>
                ${embedSnippet}
              </body>
            </html>
        """.trimIndent()

        // Must be one of this bot's allowed domains: the widget rejects any other origin.
        webView.loadDataWithBaseURL("https://${host}", html, "text/html", "utf-8", null)
        setContentView(webView)
    }
}`;
}

type PreviewDevice = 'desktop' | 'mobile' | 'android';

/** 0 closed · 1 open · 2 visitor asks · 3 bot typing · 4 bot answers. */
type PreviewStep = 0 | 1 | 2 | 3 | 4;
const STEP_DURATIONS_MS: Record<PreviewStep, number> = {
  0: 1600,
  1: 1300,
  2: 1100,
  3: 1200,
  4: 3200,
};

function usePreviewLoop(): PreviewStep {
  const [step, setStep] = useState<PreviewStep>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReducedMotion(Boolean(query?.matches));
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(
      () => setStep((current) => ((current + 1) % 5) as PreviewStep),
      STEP_DURATIONS_MS[step],
    );
    return () => window.clearTimeout(timer);
  }, [step, reducedMotion]);

  // Without motion, show the finished exchange instead of a loop.
  return reducedMotion ? 4 : step;
}

function LauncherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="55%"
      height="55%"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/** A scaled-down copy of the real widget, driven by the preview loop. */
function WidgetMock({ step, fullscreen }: { step: PreviewStep; fullscreen: boolean }) {
  const open = step > 0;
  const bubble: CSSProperties = {
    maxWidth: '82%',
    borderRadius: 8,
    padding: '5px 8px',
    fontSize: 9,
    lineHeight: 1.45,
    transition: 'opacity 250ms ease, transform 250ms ease',
  };
  const shown = (visible: boolean): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(4px)',
  });

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: fullscreen ? 10 : 12,
          bottom: fullscreen ? 10 : 12,
          width: 30,
          height: 30,
          borderRadius: 999,
          background: WIDGET_ACCENT,
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
          opacity: open && fullscreen ? 0 : 1,
          transform: step === 0 ? 'scale(1.06)' : 'scale(1)',
          transition: 'opacity 250ms ease, transform 600ms ease',
        }}
      >
        <LauncherIcon />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
          color: '#17201b',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          ...(fullscreen
            ? { inset: 0, borderRadius: 0 }
            : {
                right: 12,
                bottom: 50,
                width: '42%',
                minWidth: 150,
                height: '72%',
                borderRadius: 9,
                boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
              }),
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
          transformOrigin: 'bottom right',
          transition: 'opacity 300ms ease, transform 300ms ease',
        }}
      >
        <div
          style={{
            background: WIDGET_ACCENT,
            color: '#fff',
            padding: '7px 9px',
            fontSize: 9.5,
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{WIDGET_TITLE}</span>
          <span style={{ opacity: 0.8 }}>✕</span>
        </div>
        <div
          style={{
            flex: 1,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflow: 'hidden',
          }}
        >
          <p style={{ fontSize: 9, lineHeight: 1.5, color: '#3a453e', margin: 0 }}>
            {WIDGET_WELCOME}
          </p>
          <div
            style={{
              ...bubble,
              ...shown(step >= 2),
              alignSelf: 'flex-end',
              background: WIDGET_ACCENT,
              color: '#fff',
            }}
          >
            {SAMPLE_QUESTION}
          </div>
          {step === 3 ? (
            <div
              style={{
                ...bubble,
                alignSelf: 'flex-start',
                background: '#eef2ef',
                display: 'flex',
                gap: 3,
              }}
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="animate-pulse"
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: '#4c5f52',
                    animationDelay: `${dot * 150}ms`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                ...bubble,
                ...shown(step === 4),
                alignSelf: 'flex-start',
                background: '#eef2ef',
              }}
            >
              {SAMPLE_ANSWER}
            </div>
          )}
        </div>
        <div
          style={{
            padding: 7,
            borderTop: '1px solid #e3e8e4',
            display: 'flex',
            gap: 5,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              border: '1px solid #d6ddd8',
              borderRadius: 6,
              padding: '4px 6px',
              fontSize: 8.5,
              color: '#93a19a',
            }}
          >
            Type a message...
          </div>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: WIDGET_ACCENT }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 7, color: '#93a19a', paddingBottom: 4 }}>
          Powered by BotDock
        </div>
      </div>
    </>
  );
}

/** Grey blocks standing in for the customer's own page. */
function PageSkeleton({ compact }: { compact: boolean }) {
  const block = (width: string, height: number) => (
    <div style={{ width, height, borderRadius: 4, background: '#e8ece9' }} />
  );
  return (
    <div style={{ padding: compact ? 10 : 16, display: 'grid', gap: compact ? 7 : 10 }}>
      {block('45%', compact ? 10 : 14)}
      {block('85%', 7)}
      {block('70%', 7)}
      <div style={{ height: compact ? 70 : 90, borderRadius: 6, background: '#f0f3f1' }} />
      {block('80%', 7)}
      {block('60%', 7)}
    </div>
  );
}

function DesktopFrame({ host, children }: { host: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-[560px] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex gap-1">
          {['#f87171', '#fbbf24', '#4ade80'].map((color) => (
            <span key={color} className="size-2 rounded-full" style={{ background: color }} />
          ))}
        </div>
        <div className="min-w-0 flex-1 truncate rounded bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
          https://{host}
        </div>
      </div>
      <div className="relative" style={{ aspectRatio: '16 / 10', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
}

function PhoneFrame({ chrome, children }: { chrome: ReactNode; children: ReactNode }) {
  return (
    <div className="w-[210px] rounded-[26px] border border-border bg-surface-raised p-2 shadow-sm">
      <div className="overflow-hidden rounded-[19px] border border-border">
        {chrome}
        <div className="relative" style={{ height: 340, background: '#fff' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark }: { dark: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-1 text-[8px] font-semibold"
      style={{ background: dark ? '#1f2a24' : '#f4f6f5', color: dark ? '#fff' : '#17201b' }}
    >
      <span>9:41</span>
      <span>▴ ◼ ▮</span>
    </div>
  );
}

interface DeploymentPreviewProps {
  embedSnippet: string;
  deploymentId: string | null;
  allowedDomainPatterns: string[];
}

export function DeploymentPreview({
  embedSnippet,
  deploymentId,
  allowedDomainPatterns,
}: DeploymentPreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [androidCopied, setAndroidCopied] = useState(false);
  const step = usePreviewLoop();
  const host = pickPreviewHost(allowedDomainPatterns);
  const androidSnippet = buildAndroidSnippet(embedSnippet, host);

  async function copyAndroidSnippet() {
    try {
      await navigator.clipboard.writeText(androidSnippet);
      setAndroidCopied(true);
      window.setTimeout(() => setAndroidCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied; nothing else to do.
    }
  }

  const devices: { id: PreviewDevice; label: string; icon: typeof Monitor }[] = [
    { id: 'desktop', label: 'Desktop website', icon: Monitor },
    { id: 'mobile', label: 'Mobile website', icon: Smartphone },
    { id: 'android', label: 'Android app', icon: TabletSmartphone },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <Tabs aria-label="Preview device">
        {devices.map(({ id, label, icon: Icon }) => (
          <Tab
            key={id}
            active={device === id}
            onClick={() => setDevice(id)}
            className="inline-flex items-center gap-1.5"
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Tab>
        ))}
      </Tabs>

      <div
        className="flex min-w-0 justify-center rounded-md border border-border bg-surface/70 px-3 py-6"
        role="img"
        aria-label={`Animated preview of the chat widget on a ${devices.find((item) => item.id === device)?.label.toLowerCase()}`}
      >
        {device === 'desktop' ? (
          <DesktopFrame host={host}>
            <PageSkeleton compact={false} />
            <WidgetMock step={step} fullscreen={false} />
          </DesktopFrame>
        ) : device === 'mobile' ? (
          <PhoneFrame
            chrome={
              <>
                <StatusBar dark={false} />
                <div
                  className="truncate px-3 pb-1.5 text-center text-[8px]"
                  style={{ background: '#f4f6f5', color: '#4c5f52' }}
                >
                  {host}
                </div>
              </>
            }
          >
            <PageSkeleton compact />
            {/* Under 480px wide the real widget opens full screen. */}
            <WidgetMock step={step} fullscreen />
          </PhoneFrame>
        ) : (
          <PhoneFrame
            chrome={
              <>
                <StatusBar dark />
                <div
                  className="px-3 py-2 text-[10px] font-semibold"
                  style={{ background: '#1f2a24', color: '#fff' }}
                >
                  Your app · Support
                </div>
              </>
            }
          >
            <WidgetMock step={step} fullscreen />
          </PhoneFrame>
        )}
      </div>

      {device === 'mobile' ? (
        <p className="text-xs text-muted-foreground">
          The same embed snippet works on mobile sites. On screens narrower than 480px the chat
          opens full screen.
        </p>
      ) : null}

      {device === 'android' ? (
        <div className="grid min-w-0 gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Android (Kotlin WebView)</p>
            <Button variant="secondary" size="sm" onClick={() => void copyAndroidSnippet()}>
              {androidCopied ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {androidCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <CodeBlock className="max-h-80 overflow-auto text-xs">
            {maskDeploymentId(androidSnippet, deploymentId)}
          </CodeBlock>
          <p className="text-xs text-muted-foreground">
            Add this Activity to your app and open it from a &quot;Help&quot; button. It loads the
            widget with <code>https://{host}</code> as its origin, so that domain must stay in
            Allowed domains below
            {host === FALLBACK_HOST
              ? ' — add your real domain there and replace the placeholder'
              : ''}
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
