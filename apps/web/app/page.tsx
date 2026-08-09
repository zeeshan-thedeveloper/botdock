import Link from 'next/link';
import {
  Blocks,
  Braces,
  Gauge,
  Layers,
  Radar,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Blocks,
    tone: 'text-primary bg-primary-muted',
    title: 'Configurable behaviour',
    description:
      'Instructions, tone, response length, and safety rules — saved as a draft and versioned on every publish.',
  },
  {
    icon: Braces,
    tone: 'text-cyan-300 bg-cyan-400/10',
    title: 'Grounded knowledge',
    description:
      'Upload PDFs, text, and FAQs. BotDock chunks, embeds, and cites real sources in every answer.',
  },
  {
    icon: Gauge,
    tone: 'text-success bg-success-muted',
    title: 'Real dev playground',
    description:
      'Inspect retrieved chunks, similarity scores, prompts, latency, and token cost for every request.',
  },
  {
    icon: Layers,
    tone: 'text-warning bg-warning-muted',
    title: 'Versioned publishing',
    description:
      'Every publish snapshots your draft into an immutable version tied to the live production deployment.',
  },
  {
    icon: Zap,
    tone: 'text-primary bg-primary-muted',
    title: 'Drop-in embed',
    description:
      'One script tag or a lightweight JS SDK, with per-bot domain allowlisting built in.',
  },
  {
    icon: Radar,
    tone: 'text-danger bg-danger-muted',
    title: 'Real observability',
    description:
      'Every conversation, citation, cost, and feedback signal — searchable and inspectable, not simulated.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <nav className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                B
              </div>
              <span className="text-[15px] font-semibold">BotDock</span>
            </div>
            <a
              href="#features"
              className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline"
            >
              Features
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-surface-sm transition hover:bg-primary/90"
            >
              Start building
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Streaming responses &amp; source citations, live today
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Configure, deploy, and monitor AI chatbots anywhere.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          BotDock gives you a single dashboard to build configurable AI chatbots, ground them in
          your own knowledge, and embed them into any website — with full observability into
          every conversation.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-surface-sm transition hover:bg-primary/90 sm:w-auto"
          >
            Start building
          </Link>
          <a
            href="#features"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-surface-raised px-5 text-sm font-semibold text-foreground shadow-surface-sm transition hover:border-primary/50 hover:bg-muted sm:w-auto"
          >
            See how it works
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Bring your own OpenAI key — BotDock itself is free, no credit card required.
        </p>
      </section>

      <section className="px-6 pb-24" id="product">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-surface shadow-surface-md">
          <div className="flex h-10 items-center gap-2 border-b border-border px-4">
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
            <span className="size-2.5 rounded-full bg-muted" />
          </div>
          <div className="flex h-[26rem] flex-col md:flex-row">
            <div className="hidden w-48 shrink-0 flex-col gap-4 border-r border-border p-4 md:flex">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Workspace
              </span>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="rounded-md bg-surface-raised px-2.5 py-1.5 font-medium text-foreground">
                  Overview
                </span>
                <span className="px-2.5 py-1.5 text-muted-foreground">Bots</span>
                <span className="px-2.5 py-1.5 text-muted-foreground">Conversations</span>
                <span className="px-2.5 py-1.5 text-muted-foreground">Analytics</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-6">
              <p className="mb-4 text-lg font-semibold">Good afternoon</p>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Active bots', '3'],
                  ['Conversations', '128'],
                  ['Positive feedback', '94%'],
                  ['Est. cost', '$6.40'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-surface-raised p-3.5">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="mt-1.5 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="mb-3 text-sm font-semibold">Conversations over time</p>
                <svg width="100%" height="100" viewBox="0 0 700 100" aria-hidden="true">
                  <polyline
                    points="0,80 70,72 140,76 210,55 280,58 350,38 420,42 490,24 560,28 630,14 700,18"
                    fill="none"
                    stroke="hsl(var(--color-primary))"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24" id="features">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Everything a production chatbot needs
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              One platform to configure, ground, test, deploy, and observe — no glue code
              required.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, tone, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-surface-raised p-6"
              >
                <div className={`mb-4 flex size-9 items-center justify-center rounded-md ${tone}`}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
                <p className="mb-2 text-[15px] font-semibold">{title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
              Built for developers
            </p>
            <h2 className="mb-4 text-2xl font-semibold sm:text-3xl">
              Embed in minutes, not sprints
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Publish a bot, then drop a single script tag on any site. Every request is scoped
              to your allowed domains, so a stolen snippet can&apos;t spend your provider key
              anywhere else.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex gap-2">
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[13px] leading-7 text-muted-foreground">
              <span className="text-muted-foreground/70">{'<script\n'}</span>
              {'  '}
              <span className="text-cyan-300">src</span>
              {'='}
              <span className="text-success">&quot;https://your-api-domain/widget.js&quot;</span>
              {'\n  '}
              <span className="text-cyan-300">data-deployment-id</span>
              {'='}
              <span className="text-success">&quot;dep_...&quot;</span>
              {'\n'}
              <span className="text-muted-foreground/70">{'></script>'}</span>
            </pre>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold sm:text-3xl">Ship your first bot today</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Free to start. Bring your own OpenAI key.
        </p>
        <div className="mt-7 flex justify-center">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-surface-sm transition hover:bg-primary/90"
          >
            Start building free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            B
          </div>
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} BotDock</span>
        </div>
      </footer>
    </main>
  );
}
