import Link from 'next/link';
import type { ReactNode } from 'react';

export const LEGAL_CONTACT_EMAIL = 'zeeshanahmedd0010@gmail.com';
export const LEGAL_OPERATOR = 'Zeeshan Ahmed';
export const LEGAL_LAST_UPDATED = '22 October 2026';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid gap-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid list-disc gap-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function ContactLink() {
  return (
    <a
      className="font-medium text-primary underline-offset-4 hover:underline"
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}

/** Shared frame for the Privacy Policy and Terms pages. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              B
            </span>
            BotDock
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto grid max-w-3xl gap-8 px-6 py-12">
        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <div className="text-sm leading-7 text-muted-foreground">{intro}</div>
        </div>
        {children}
      </article>
    </main>
  );
}
