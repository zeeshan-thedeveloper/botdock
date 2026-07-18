'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  ChevronDown,
  CircleHelp,
  Code2,
  CreditCard,
  Globe2,
  Home,
  KeyRound,
  LifeBuoy,
  MessageSquareText,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
} from 'lucide-react';
import {
  Badge,
  Button,
  IconButton,
  Panel,
  PanelBody,
  PanelDescription,
  PanelTitle,
} from '@botdock/ui';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: Home,
        description: 'Workspace health, setup progress, and recent activity.',
      },
      {
        id: 'bots',
        label: 'Bots',
        icon: Bot,
        description: 'Bot inventory, ownership, and publication status.',
      },
      {
        id: 'conversations',
        label: 'Conversations',
        icon: MessageSquareText,
        description: 'Live and historical visitor conversations across bots.',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        description: 'Usage, feedback, resolution rate, and volume trends.',
      },
    ],
  },
  {
    title: 'Build',
    items: [
      {
        id: 'knowledge',
        label: 'Knowledge',
        icon: BookOpen,
        description: 'Documents, URLs, FAQs, and ingestion state.',
      },
      {
        id: 'playground',
        label: 'Playground',
        icon: Play,
        description: 'Test prompts, retrieval traces, and draft behavior.',
      },
      {
        id: 'deployments',
        label: 'Deployments',
        icon: Boxes,
        description: 'Environment versions, rollout state, and errors.',
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        id: 'activity',
        label: 'Activity',
        icon: Activity,
        description: 'Operational events and workspace audit signals.',
      },
    ],
  },
  {
    title: 'Developers',
    items: [
      {
        id: 'api-keys',
        label: 'API Keys',
        icon: KeyRound,
        description: 'Scoped API keys and rotation workflows.',
      },
      {
        id: 'domains',
        label: 'Allowed Domains',
        icon: Globe2,
        description: 'Production and preview embed allowlists.',
      },
      {
        id: 'integration',
        label: 'SDK & Integration',
        icon: Code2,
        description: 'Install snippets, REST API details, and widget setup.',
      },
      {
        id: 'webhooks',
        label: 'Webhooks',
        icon: Webhook,
        description: 'Delivery endpoints, event filters, and retries.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        id: 'team',
        label: 'Team',
        icon: Users,
        description: 'Members, roles, invites, and access controls.',
      },
      {
        id: 'billing',
        label: 'Usage & Billing',
        icon: CreditCard,
        description: 'Plan limits, invoices, usage, and workspace spend.',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        description: 'Organisation profile, defaults, and compliance controls.',
      },
    ],
  },
];

const defaultNavItem = navGroups[0]?.items[0];

function getNavItem(id: string): NavItem {
  const navItem = navGroups.flatMap((group) => group.items).find((item) => item.id === id);

  if (navItem) {
    return navItem;
  }

  if (!defaultNavItem) {
    throw new Error('App shell navigation requires at least one item.');
  }

  return defaultNavItem;
}

export function AppShell() {
  const [activeItemId, setActiveItemId] = useState('overview');
  const activeItem = useMemo(() => getNavItem(activeItemId), [activeItemId]);
  const ActiveIcon = activeItem.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              B
            </div>
            <span className="text-sm font-semibold">BotDock</span>
          </div>

          <div className="border-b border-border p-3">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-raised p-2 text-left transition hover:border-primary/40 hover:bg-muted"
            >
              <span className="flex size-6 items-center justify-center rounded-md border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                AC
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">
                  Acme Corp
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Growth plan
                </span>
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
            <div className="grid gap-5">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase text-muted-foreground/70">
                    {group.title}
                  </p>
                  <div className="grid gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeItemId === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveItemId(item.id)}
                          className={`flex items-center gap-2.5 rounded-md border px-2 py-2 text-left text-sm font-medium transition ${
                            isActive
                              ? 'border-border bg-surface-raised text-foreground'
                              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="border-t border-border p-3">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <LifeBuoy className="size-4" aria-hidden="true" />
              Documentation
            </Button>
            <Button variant="ghost" size="sm" className="mt-1 w-full justify-start">
              <CircleHelp className="size-4" aria-hidden="true" />
              Help & feedback
            </Button>
            <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
                JD
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">Jamie Doyle</p>
                <p className="truncate text-[11px] text-muted-foreground">jamie@acme.com</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-sm text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" />
                <span>Production</span>
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </div>
              <Badge tone="success" className="hidden sm:inline-flex">
                Live
              </Badge>
            </div>

            <div className="hidden min-w-64 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground shadow-surface-sm md:flex">
              <Search className="size-4" aria-hidden="true" />
              <span className="truncate">Search or jump to...</span>
              <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                K
              </kbd>
            </div>

            <div className="flex items-center gap-2">
              <IconButton aria-label="Notifications" variant="ghost" size="sm">
                <Bell className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton aria-label="Account menu" variant="secondary" size="sm">
                <span className="text-[11px] font-semibold">JD</span>
              </IconButton>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <ActiveIcon className="size-4 text-primary" aria-hidden="true" />
                    <span>Acme Corp workspace</span>
                  </div>
                  <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
                    {activeItem.label}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {activeItem.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="md">
                    Last 30 days
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button size="md">
                    <Bot className="size-4" aria-hidden="true" />
                    Create bot
                  </Button>
                </div>
              </div>

              <Panel>
                <PanelBody className="grid gap-6 md:grid-cols-[1fr_320px]">
                  <div>
                    <PanelTitle>{activeItem.label} workspace surface</PanelTitle>
                    <PanelDescription>
                      This placeholder keeps the shell stable while the dedicated screen task fills
                      in the production UI.
                    </PanelDescription>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-border bg-surface-raised p-4">
                        <p className="text-xs text-muted-foreground">Environment</p>
                        <p className="mt-2 text-sm font-semibold">Production</p>
                      </div>
                      <div className="rounded-md border border-border bg-surface-raised p-4">
                        <p className="text-xs text-muted-foreground">Workspace</p>
                        <p className="mt-2 text-sm font-semibold">Acme Corp</p>
                      </div>
                      <div className="rounded-md border border-border bg-surface-raised p-4">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="mt-2 text-sm font-semibold text-success">Ready</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                      <p className="text-sm font-semibold">OAuth session active</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      The shell is shown only after the existing auth return flow completes. Future
                      backend session checks can replace this placeholder gate without changing the
                      navigation layout.
                    </p>
                  </div>
                </PanelBody>
              </Panel>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
