'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  ChevronDown,
  CheckCircle2,
  Copy,
  CircleHelp,
  Code2,
  CreditCard,
  Database,
  ExternalLink,
  FileClock,
  FileText,
  Filter,
  GitBranch,
  Globe2,
  Home,
  KeyRound,
  LifeBuoy,
  MoreHorizontal,
  Plus,
  MessageSquareText,
  Play,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
  Webhook,
} from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  IconButton,
  MetricCard,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
  ProgressBar,
  StatusBadge,
  Tab,
  Tabs,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
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

const overviewMetrics = [
  { label: 'Active bots', value: '12', trend: '+2 this month', tone: 'success' as const },
  { label: 'Conversations', value: '8,204', trend: '+14.2%', tone: 'success' as const },
  { label: 'Messages', value: '41,930', trend: '+6.1%', tone: 'primary' as const },
  { label: 'Positive feedback', value: '92.4%', trend: '+1.8 pt', tone: 'success' as const },
  { label: 'Est. AI cost', value: '$284.10', trend: '62% budget', tone: 'warning' as const },
];

const botUsage = [
  { name: 'Support Assistant', messages: '16,204', value: 78 },
  { name: 'Docs Assistant', messages: '11,850', value: 57 },
  { name: 'Onboarding Helper', messages: '6,120', value: 32 },
  { name: 'Sales Qualifier', messages: '4,302', value: 22 },
];

const recentConversations = [
  {
    visitor: 'Visitor #8213',
    bot: 'Support Assistant',
    message: 'Can I get a refund on my order?',
    status: 'resolved',
    tone: 'success' as const,
    age: '8m ago',
  },
  {
    visitor: 'Visitor #8214',
    bot: 'Docs Assistant',
    message: 'How do I authenticate the REST API?',
    status: 'active',
    tone: 'primary' as const,
    age: '12m ago',
  },
  {
    visitor: 'Visitor #8215',
    bot: 'Support Assistant',
    message: "This didn't answer my question",
    status: 'needs review',
    tone: 'danger' as const,
    age: '18m ago',
  },
];

const updatedBots = [
  {
    name: 'Support Assistant',
    owner: 'Jamie Doyle',
    change: 'Prompt guardrail updated',
    age: '24m ago',
  },
  {
    name: 'Docs Assistant',
    owner: 'Mina Patel',
    change: 'API reference reindexed',
    age: '41m ago',
  },
  { name: 'Sales Qualifier', owner: 'Eli Stone', change: 'Routing rules adjusted', age: '1h ago' },
];

const processingActivity = [
  { source: 'help-center/refunds.md', status: 'Ready', detail: '184 chunks' },
  { source: 'docs/api-authentication.md', status: 'Indexing', detail: '63 of 91 chunks' },
  { source: 'pricing-faq.csv', status: 'Queued', detail: 'waiting for worker' },
];

const deployments = [
  { bot: 'Support Assistant', status: 'Live', version: 'v14', traffic: '72%' },
  { bot: 'Docs Assistant', status: 'Deploying', version: 'v9', traffic: '18%' },
  { bot: 'Onboarding Helper', status: 'Draft', version: 'v3', traffic: '0%' },
];

const recentErrors = [
  {
    title: 'Webhook delivery failed',
    detail: 'crm-sync endpoint returned 503',
    count: '4 retries',
  },
  {
    title: 'Knowledge sync warning',
    detail: 'pricing-faq.csv has 3 duplicate rows',
    count: '3 rows',
  },
];

type BotStatus = 'Published' | 'Draft' | 'Processing' | 'Error' | 'Disabled';
type BotFilter = 'All' | BotStatus;
type BotSort = 'updated' | 'conversations' | 'name';
type BotDetailTab =
  | 'overview'
  | 'configuration'
  | 'knowledge'
  | 'playground'
  | 'conversations'
  | 'analytics'
  | 'deployments'
  | 'settings';

type BotRow = {
  id: string;
  name: string;
  description: string;
  initials: string;
  status: BotStatus;
  environment: string;
  knowledge: string;
  conversations: number;
  version: string;
  resolutionRate: string;
  feedbackRate: string;
  estimatedCost: string;
  errorRate: string;
  lastPublished: string;
  updatedBy: string;
  updatedAt: string;
  error?: string;
};

const botRows: BotRow[] = [
  {
    id: 'bot_7f3a1',
    name: 'Support Assistant',
    description: 'Production customer support widget',
    initials: 'SA',
    status: 'Published',
    environment: 'Production',
    knowledge: '3 sources · 1,284 chunks',
    conversations: 16204,
    version: 'v14',
    resolutionRate: '91.8%',
    feedbackRate: '94.1%',
    estimatedCost: '$41.20',
    errorRate: '0.04%',
    lastPublished: '2 days ago',
    updatedBy: 'Jamie Doyle',
    updatedAt: '24m ago',
  },
  {
    id: 'bot_9c2d0',
    name: 'Docs Assistant',
    description: 'Answers API and SDK implementation questions',
    initials: 'DA',
    status: 'Processing',
    environment: 'Staging',
    knowledge: '7 sources · indexing',
    conversations: 11850,
    version: 'v9',
    resolutionRate: '88.2%',
    feedbackRate: '90.7%',
    estimatedCost: '$38.90',
    errorRate: '0.11%',
    lastPublished: '6 days ago',
    updatedBy: 'Mina Patel',
    updatedAt: '41m ago',
  },
  {
    id: 'bot_1aa84',
    name: 'Sales Qualifier',
    description: 'Routes high-intent leads to the revenue team',
    initials: 'SQ',
    status: 'Draft',
    environment: 'Draft',
    knowledge: '2 sources · 318 chunks',
    conversations: 4302,
    version: 'v3',
    resolutionRate: '84.5%',
    feedbackRate: '87.0%',
    estimatedCost: '$12.70',
    errorRate: '0.08%',
    lastPublished: 'Not published',
    updatedBy: 'Eli Stone',
    updatedAt: '1h ago',
  },
  {
    id: 'bot_5e9b7',
    name: 'Internal Knowledge Bot',
    description: 'Employee-facing policy and billing reference',
    initials: 'IK',
    status: 'Error',
    environment: 'Preview',
    knowledge: '4 sources · sync failed',
    conversations: 924,
    version: 'v6',
    resolutionRate: '72.4%',
    feedbackRate: '74.8%',
    estimatedCost: '$5.80',
    errorRate: '2.80%',
    lastPublished: '12 days ago',
    updatedBy: 'Noor Ali',
    updatedAt: '2h ago',
    error: 'Source sync failed',
  },
  {
    id: 'bot_3d6ef',
    name: 'Onboarding Helper',
    description: 'Guides new accounts through workspace setup',
    initials: 'OH',
    status: 'Published',
    environment: 'Production',
    knowledge: '5 sources · 842 chunks',
    conversations: 6120,
    version: 'v3',
    resolutionRate: '89.6%',
    feedbackRate: '91.2%',
    estimatedCost: '$18.40',
    errorRate: '0.06%',
    lastPublished: 'Yesterday',
    updatedBy: 'Rae Kim',
    updatedAt: '3h ago',
  },
  {
    id: 'bot_8b440',
    name: 'Churn Risk Triage',
    description: 'Paused experiment for account health reviews',
    initials: 'CR',
    status: 'Disabled',
    environment: 'Sandbox',
    knowledge: '1 source · 96 chunks',
    conversations: 288,
    version: 'v1',
    resolutionRate: '68.0%',
    feedbackRate: '71.5%',
    estimatedCost: '$1.90',
    errorRate: '0.00%',
    lastPublished: 'Last month',
    updatedBy: 'Jamie Doyle',
    updatedAt: '1d ago',
  },
];

const botFilters: BotFilter[] = ['All', 'Published', 'Draft', 'Processing', 'Error', 'Disabled'];

const botStatusTone: Record<BotStatus, 'neutral' | 'success' | 'danger' | 'info'> = {
  Published: 'success',
  Draft: 'neutral',
  Processing: 'info',
  Error: 'danger',
  Disabled: 'neutral',
};

const botDetailTabs: Array<{ id: BotDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'playground', label: 'Playground' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'deployments', label: 'Deployments' },
  { id: 'settings', label: 'Settings' },
];

const botRecentActivity = [
  {
    title: 'Published production version',
    detail: 'v14 promoted after 240 sampled responses passed review.',
    age: '2 days ago',
    icon: Rocket,
    tone: 'success' as const,
  },
  {
    title: 'System instructions updated',
    detail: 'Refund escalation path and invoice policy phrasing tightened.',
    age: '3 days ago',
    icon: GitBranch,
    tone: 'primary' as const,
  },
  {
    title: 'Knowledge source added',
    detail: 'refund-policy.pdf indexed with 186 production-ready chunks.',
    age: '4 days ago',
    icon: FileText,
    tone: 'info' as const,
  },
];

const botDeploymentChecks = [
  { label: 'Widget embed', detail: 'Active on docs.acme.com and app.acme.com', status: 'Live' },
  { label: 'REST API', detail: '142 requests/day from production keys', status: 'Ready' },
  { label: 'Preview channel', detail: 'v15 draft receiving internal traffic', status: 'Active' },
];

const botKnowledgeHealth = [
  { label: 'Indexed chunks', value: '1,284', progress: 92 },
  { label: 'Citation coverage', value: '96.2%', progress: 96 },
  { label: 'Stale content risk', value: 'Low', progress: 18 },
];

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

function OverviewLineChart() {
  return (
    <div>
      <svg className="h-44 w-full" viewBox="0 0 520 176" fill="none" aria-hidden="true">
        <path d="M0 145H520M0 105H520M0 65H520M0 25H520" stroke="hsl(var(--color-border))" />
        <path
          d="M0 132L40 120L80 112L120 118L160 92L200 101L240 72L280 80L320 58L360 63L400 42L440 48L480 31L520 36"
          stroke="hsl(var(--color-primary))"
          strokeWidth="2.5"
        />
        <path
          d="M0 154L40 151L80 146L120 149L160 138L200 140L240 126L280 128L320 116L360 119L400 104L440 109L480 95L520 99"
          stroke="#22D3EE"
          strokeDasharray="4 4"
          strokeWidth="2"
        />
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-sm bg-primary" />
          Conversations
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-sm bg-cyan-300" />
          Messages
        </div>
      </div>
    </div>
  );
}

function OverviewDashboard() {
  return (
    <div className="grid gap-6">
      <Panel>
        <PanelBody>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <PanelTitle>Getting started</PanelTitle>
              <PanelDescription>
                Complete the production launch checklist for this workspace.
              </PanelDescription>
            </div>
            <span className="text-xs font-medium text-muted-foreground">3 of 5 complete</span>
          </div>
          <ProgressBar value={60} />
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ['Create a bot', true],
              ['Upload knowledge', true],
              ['Test the bot', true],
              ['Publish the bot', false],
              ['Add to a website', false],
            ].map(([label, complete]) => (
              <div
                key={String(label)}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {complete ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-border" />
                )}
                <span className={complete ? 'text-foreground' : undefined}>{label}</span>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {overviewMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Conversations over time</PanelTitle>
            <PanelDescription>
              Production traffic and message volume across all bots.
            </PanelDescription>
          </PanelHeader>
          <PanelBody>
            <OverviewLineChart />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Messages by bot</PanelTitle>
            <PanelDescription>Top production bots by message volume.</PanelDescription>
          </PanelHeader>
          <PanelBody className="grid gap-4">
            {botUsage.map((bot) => (
              <ProgressBar
                key={bot.name}
                value={bot.value}
                label={`${bot.name} · ${bot.messages}`}
              />
            ))}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Recent conversations</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-3">
            {recentConversations.map((conversation) => (
              <div
                key={conversation.visitor}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-raised p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {conversation.visitor} · {conversation.bot}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {conversation.message}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={conversation.tone}>{conversation.status}</Badge>
                  <p className="mt-2 text-[11px] text-muted-foreground">{conversation.age}</p>
                </div>
              </div>
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Deployment status</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-3">
            {deployments.map((deployment) => (
              <div
                key={deployment.bot}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-raised p-3"
              >
                <div>
                  <p className="text-sm font-medium">{deployment.bot}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deployment.version} · {deployment.traffic} traffic
                  </p>
                </div>
                <StatusBadge status={deployment.status} />
              </div>
            ))}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.85fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Updated bots</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <DataTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {updatedBots.map((bot) => (
                  <TableRow key={bot.name}>
                    <TableCell className="text-foreground">{bot.name}</TableCell>
                    <TableCell>{bot.owner}</TableCell>
                    <TableCell>{bot.change}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Processing activity</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-3">
            {processingActivity.map((item) => (
              <div
                key={item.source}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-raised p-3"
              >
                <Database className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.source}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Recent errors</PanelTitle>
          </PanelHeader>
          <PanelBody className="grid gap-3">
            {recentErrors.map((error) => (
              <div
                key={error.title}
                className="rounded-md border border-danger/30 bg-danger-muted p-3"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-danger">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  {error.title}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{error.detail}</p>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <FileClock className="size-3.5" aria-hidden="true" />
                  {error.count}
                </p>
              </div>
            ))}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function BotsEmptyState() {
  return (
    <EmptyState
      title="No bots in this workspace"
      description="Create the first bot to connect knowledge, test responses, and publish a production-ready assistant."
      action={
        <Button size="md">
          <Plus className="size-4" aria-hidden="true" />
          Create bot
        </Button>
      }
    />
  );
}

function BotAvatar({ bot, size = 'md' }: { bot: BotRow; size?: 'sm' | 'md' | 'lg' }) {
  const sizeStyles = {
    sm: 'size-9 text-[11px]',
    md: 'size-11 text-xs',
    lg: 'size-12 text-sm',
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised font-mono font-semibold text-primary ${sizeStyles[size]}`}
    >
      {bot.initials}
    </div>
  );
}

function BotDetailOverview({ bot }: { bot: BotRow }) {
  const detailMetrics = [
    {
      label: 'Conversations',
      value: formatCount(bot.conversations),
      trend: '+12.4%',
      tone: 'success' as const,
    },
    { label: 'Resolution', value: bot.resolutionRate, trend: '+2.1 pt', tone: 'success' as const },
    { label: 'Feedback', value: bot.feedbackRate, trend: '684 votes', tone: 'primary' as const },
    { label: 'AI cost', value: bot.estimatedCost, trend: '68% budget', tone: 'warning' as const },
    {
      label: 'Errors',
      value: bot.errorRate,
      trend: bot.status === 'Error' ? 'review' : 'stable',
      tone: bot.status === 'Error' ? ('danger' as const) : ('success' as const),
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {detailMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Recent activity</PanelTitle>
            <PanelDescription>
              Operational changes and knowledge updates for this bot.
            </PanelDescription>
          </PanelHeader>
          <PanelBody className="grid gap-3">
            {botRecentActivity.map((activity) => {
              const ActivityIcon = activity.icon;

              return (
                <div
                  key={activity.title}
                  className="flex gap-3 rounded-md border border-border bg-surface-raised p-3"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                    <ActivityIcon className="size-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <Badge tone={activity.tone}>{activity.age}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {activity.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Deployment status</PanelTitle>
            <PanelDescription>Production surfaces currently serving {bot.name}.</PanelDescription>
          </PanelHeader>
          <PanelBody className="grid gap-3">
            {botDeploymentChecks.map((deployment) => (
              <div
                key={deployment.label}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-raised p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{deployment.label}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{deployment.detail}</p>
                </div>
                <StatusBadge status={deployment.status} />
              </div>
            ))}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Knowledge health</PanelTitle>
            <PanelDescription>{bot.knowledge} powering grounded answers.</PanelDescription>
          </PanelHeader>
          <PanelBody className="grid gap-4">
            {botKnowledgeHealth.map((item) => (
              <ProgressBar
                key={item.label}
                value={item.progress}
                label={`${item.label} · ${item.value}`}
              />
            ))}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Production readiness</PanelTitle>
            <PanelDescription>
              Guardrails, routing, and monitored channels for this bot.
            </PanelDescription>
          </PanelHeader>
          <PanelBody>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['Prompt guardrails', 'Strict sources only', 'Ready'],
                  ['Escalation routing', 'Zendesk handoff', 'Live'],
                  ['Fallback policy', 'Human review queue', 'Ready'],
                ] as const
              ).map(([label, detail, status]) => (
                <div key={label} className="rounded-md border border-border bg-surface-raised p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{detail}</p>
                  <StatusBadge status={status} className="mt-3" />
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function BotDetailPlaceholder({ bot, tab }: { bot: BotRow; tab: BotDetailTab }) {
  const tabLabel = botDetailTabs.find((item) => item.id === tab)?.label ?? 'Section';

  return (
    <Panel>
      <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PanelTitle>
            {tabLabel} for {bot.name}
          </PanelTitle>
          <PanelDescription>
            This tab is present for navigation continuity. Its full production UI is tracked in a
            later task.
          </PanelDescription>
        </div>
        <Badge tone="neutral">Placeholder</Badge>
      </PanelBody>
    </Panel>
  );
}

function BotDetailScreen({ bot, onBack }: { bot: BotRow; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<BotDetailTab>('overview');

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 border-b border-border pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Bots
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground">{bot.name}</span>
        </button>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3">
            <BotAvatar bot={bot} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                  {bot.name}
                </h1>
                <StatusBadge status={bot.status} tone={botStatusTone[bot.status]} />
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {bot.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge tone="neutral" className="font-mono normal-case">
                  {bot.id}
                </Badge>
                <span>{bot.environment}</span>
                <span className="text-muted-foreground/50">·</span>
                <span>{bot.version}</span>
                <span className="text-muted-foreground/50">·</span>
                <span>
                  Updated {bot.updatedAt} by {bot.updatedBy}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="md">
              <Play className="size-4" aria-hidden="true" />
              Test
            </Button>
            <Button size="md">
              <Rocket className="size-4" aria-hidden="true" />
              Publish
            </Button>
            <IconButton aria-label={`Copy ${bot.name} bot ID`} variant="secondary" size="md">
              <Copy className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton aria-label={`More actions for ${bot.name}`} variant="secondary" size="md">
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        <Tabs className="overflow-x-auto">
          {botDetailTabs.map((tab) => (
            <Tab key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </Tab>
          ))}
        </Tabs>
      </div>

      {activeTab === 'overview' ? (
        <BotDetailOverview bot={bot} />
      ) : (
        <BotDetailPlaceholder bot={bot} tab={activeTab} />
      )}
    </div>
  );
}

function BotsListScreen({ onOpenBot }: { onOpenBot: (botId: string) => void }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BotFilter>('All');
  const [sortBy, setSortBy] = useState<BotSort>('updated');

  const filteredBots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return botRows
      .filter((bot) => {
        const matchesStatus = statusFilter === 'All' || bot.status === statusFilter;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [bot.name, bot.id, bot.description, bot.environment, bot.updatedBy].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          );

        return matchesStatus && matchesQuery;
      })
      .toSorted((first, second) => {
        if (sortBy === 'name') {
          return first.name.localeCompare(second.name);
        }

        if (sortBy === 'conversations') {
          return second.conversations - first.conversations;
        }

        return botRows.indexOf(first) - botRows.indexOf(second);
      });
  }, [query, sortBy, statusFilter]);

  const statusCounts = botRows.reduce<Record<BotFilter, number>>(
    (counts, bot) => {
      counts.All += 1;
      counts[bot.status] += 1;

      return counts;
    },
    { All: 0, Published: 0, Draft: 0, Processing: 0, Error: 0, Disabled: 0 },
  );

  if (botRows.length === 0) {
    return <BotsEmptyState />;
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelBody className="grid gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <TextInput
                aria-label="Search bots"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bots, IDs, owners, or environments..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-muted-foreground">
                <Filter className="size-3.5" aria-hidden="true" />
                Status
              </div>
              {botFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  aria-pressed={statusFilter === filter}
                >
                  {filter}
                  <span className="font-mono text-[10px] opacity-75">{statusCounts[filter]}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredBots.length}</span> of{' '}
              <span className="font-medium text-foreground">{botRows.length}</span> bots
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                ['updated', 'Recently updated'],
                ['conversations', 'Most conversations'],
                ['name', 'Name'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={sortBy === value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy(value as BotSort)}
                  aria-pressed={sortBy === value}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </PanelBody>
      </Panel>

      {filteredBots.length > 0 ? (
        <Panel>
          <PanelHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <PanelTitle>Bot inventory</PanelTitle>
              <PanelDescription>
                Operational state, ownership, and publication freshness across workspace bots.
              </PanelDescription>
            </div>
            <Button variant="secondary" size="sm">
              Export CSV
            </Button>
          </PanelHeader>
          <PanelBody className="p-0">
            <DataTable wrapperClassName="rounded-none border-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Knowledge</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead>Last published</TableHead>
                  <TableHead>Updated by</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {filteredBots.map((bot) => (
                  <TableRow
                    key={bot.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenBot(bot.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenBot(bot.id);
                      }
                    }}
                    className={`cursor-pointer ${bot.status === 'Error' ? 'bg-danger/5' : ''}`}
                  >
                    <TableCell className="min-w-64">
                      <div className="flex items-center gap-3">
                        <BotAvatar bot={bot} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{bot.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {bot.id} · {bot.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={bot.status} tone={botStatusTone[bot.status]} />
                      {bot.error ? (
                        <p className="mt-2 text-[11px] text-danger">{bot.error}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <span
                          className={`size-1.5 rounded-full ${
                            bot.environment === 'Production' ? 'bg-success' : 'bg-muted-foreground'
                          }`}
                        />
                        {bot.environment}
                      </span>
                    </TableCell>
                    <TableCell>{bot.knowledge}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {formatCount(bot.conversations)}
                    </TableCell>
                    <TableCell>{bot.lastPublished}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{bot.updatedBy}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{bot.updatedAt}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <IconButton
                          aria-label={`Open ${bot.name}`}
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenBot(bot.id);
                          }}
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          aria-label={`More actions for ${bot.name}`}
                          variant="ghost"
                          size="sm"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTable>
          </PanelBody>
        </Panel>
      ) : (
        <EmptyState
          title="No bots match these filters"
          description="Adjust the search query or status filter to find bots in this workspace."
          action={
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setQuery('');
                setStatusFilter('All');
              }}
            >
              Reset filters
            </Button>
          }
        />
      )}
    </div>
  );
}

export function AppShell() {
  const [activeItemId, setActiveItemId] = useState('overview');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const activeItem = useMemo(() => getNavItem(activeItemId), [activeItemId]);
  const selectedBot = useMemo(
    () => botRows.find((bot) => bot.id === selectedBotId) ?? null,
    [selectedBotId],
  );
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
                          onClick={() => {
                            setActiveItemId(item.id);
                            setSelectedBotId(null);
                          }}
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
              {selectedBot ? null : (
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <ActiveIcon className="size-4 text-primary" aria-hidden="true" />
                      <span>Acme Corp workspace</span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
                      {activeItemId === 'overview' ? 'Good afternoon, Jamie' : activeItem.label}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {activeItemId === 'overview'
                        ? 'Acme Corp workspace · Production'
                        : activeItem.description}
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
              )}

              {selectedBot ? (
                <BotDetailScreen bot={selectedBot} onBack={() => setSelectedBotId(null)} />
              ) : activeItemId === 'overview' ? (
                <OverviewDashboard />
              ) : activeItemId === 'bots' ? (
                <BotsListScreen
                  onOpenBot={(botId) => {
                    setActiveItemId('bots');
                    setSelectedBotId(botId);
                  }}
                />
              ) : (
                <Panel>
                  <PanelBody className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <div>
                      <PanelTitle>{activeItem.label} workspace surface</PanelTitle>
                      <PanelDescription>
                        This placeholder keeps the shell stable while the dedicated screen task
                        fills in the production UI.
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
                        The shell is shown only after the existing auth return flow completes.
                        Future backend session checks can replace this placeholder gate without
                        changing the navigation layout.
                      </p>
                    </div>
                  </PanelBody>
                </Panel>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
