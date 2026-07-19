'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { authSessionResponseSchema, type AuthSessionUser } from '@botdock/contracts';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  BookOpen,
  Bot,
  Boxes,
  ChevronDown,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Home,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Moon,
  Plus,
  MessageSquareText,
  Play,
  RotateCcw,
  Rocket,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import {
  Badge,
  Button,
  CodeBlock,
  DataTable,
  EmptyState,
  Field,
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
  TextArea,
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

type AppTheme = 'dark' | 'light';

const themeStorageKey = 'botdock.theme';
const authSessionStorageKey = 'botdock.oauth-session-ready';
const fallbackUser: AuthSessionUser = {
  id: 'local-placeholder',
  email: 'user@botdock.local',
  name: 'BotDock user',
  avatarUrl: null,
};

const navGroups: NavGroup[] = [
  {
    title: 'BotDock',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: Home,
        description: 'Account health, setup progress, and recent activity.',
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
    ],
  },
];

const defaultNavItem = navGroups[0]?.items[0];
const settingsNavItem: NavItem = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  description: 'Account preferences and local session controls.',
};

const overviewMetrics = [
  { label: 'Active bots', value: '0', trend: '0 this month', tone: 'neutral' as const },
  { label: 'Conversations', value: '0', trend: '0%', tone: 'neutral' as const },
  { label: 'Messages', value: '0', trend: '0%', tone: 'neutral' as const },
  { label: 'Positive feedback', value: '0%', trend: '0 pt', tone: 'neutral' as const },
  { label: 'Est. AI cost', value: '$0.00', trend: '0% budget', tone: 'neutral' as const },
];

const botUsage = [
  { name: 'Support Assistant', messages: '16,204', value: 78 },
  { name: 'Docs Assistant', messages: '11,850', value: 57 },
  { name: 'Onboarding Helper', messages: '6,120', value: 32 },
  { name: 'Sales Qualifier', messages: '4,302', value: 22 },
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

const botKnowledgeHealth = [
  { label: 'Indexed chunks', value: '1,284', progress: 92 },
  { label: 'Citation coverage', value: '96.2%', progress: 96 },
  { label: 'Stale content risk', value: 'Low', progress: 18 },
];

type BotConfiguration = {
  name: string;
  description: string;
  initials: string;
  welcomeMessage: string;
  instructions: string;
  tone: string;
  handoffBehavior: string;
  providerModel: string;
  temperature: number;
  retrievalMode: string;
  maxSources: string;
  responseLength: string;
  citationStyle: string;
  widgetTheme: string;
  widgetPosition: string;
  strictKnowledge: boolean;
  promptInjectionProtection: boolean;
  piiRedaction: boolean;
  collectFeedback: boolean;
  humanHandoff: boolean;
};

const promptTemplate = `You are a customer support assistant for this account.
Answer only using the provided knowledge sources.
Be concise, friendly, and professional.
If policy details conflict, prefer the most recent source.
Escalate billing disputes, account access issues, and refund exceptions.`;

function getBotConfiguration(bot: BotRow): BotConfiguration {
  return {
    name: bot.name,
    description: bot.description,
    initials: bot.initials,
    welcomeMessage: "Hi! I'm here to help with orders, returns, and account questions.",
    instructions: promptTemplate,
    tone: 'Friendly, precise, and calm',
    handoffBehavior: 'Escalate after low-confidence answer',
    providerModel: 'OpenAI · gpt-4o-mini',
    temperature: 0.35,
    retrievalMode: 'Hybrid semantic + keyword',
    maxSources: '6 sources',
    responseLength: 'Balanced',
    citationStyle: 'Inline source chips',
    widgetTheme: 'Dark system default',
    widgetPosition: 'Bottom right',
    strictKnowledge: true,
    promptInjectionProtection: true,
    piiRedaction: true,
    collectFeedback: true,
    humanHandoff: bot.status !== 'Disabled',
  };
}

function getNavItem(id: string): NavItem {
  const navItem = navGroups.flatMap((group) => group.items).find((item) => item.id === id);

  if (navItem) {
    return navItem;
  }

  if (id === settingsNavItem.id) {
    return settingsNavItem;
  }

  if (!defaultNavItem) {
    throw new Error('App shell navigation requires at least one item.');
  }

  return defaultNavItem;
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BOTDOCK_API_BASE_URL ?? 'http://localhost:4000';
}

function getDisplayName(user: AuthSessionUser) {
  return user.name?.trim() || user.email.split('@')[0] || 'BotDock user';
}

function getFirstName(user: AuthSessionUser) {
  return getDisplayName(user).split(/\s+/)[0] ?? 'there';
}

function getInitials(user: AuthSessionUser) {
  const displayName = getDisplayName(user);
  const parts = displayName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  return displayName.slice(0, 2).toUpperCase();
}

function UserAvatar({ user, className = 'size-6' }: { user: AuthSessionUser; className?: string }) {
  const initials = getInitials(user);

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className={`${className} rounded-md border border-border object-cover`}
      />
    );
  }

  return (
    <span
      className={`${className} flex items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground`}
    >
      {initials}
    </span>
  );
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

function SelectInput({
  className = '',
  ...props
}: ComponentPropsWithoutRef<'select'> & { className?: string }) {
  return (
    <select
      className={`h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-sm text-foreground shadow-surface-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 ${className}`}
      {...props}
    />
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-raised px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-10 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          checked ? 'border-primary bg-primary' : 'border-border bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-foreground shadow-surface-sm transition ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

function ConfigurationSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          <Icon className="size-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <PanelTitle>{title}</PanelTitle>
          <PanelDescription>{description}</PanelDescription>
        </div>
      </PanelHeader>
      <PanelBody className="grid gap-4">{children}</PanelBody>
    </Panel>
  );
}

function BotDetailConfiguration({ bot }: { bot: BotRow }) {
  const initialConfig = useMemo(() => getBotConfiguration(bot), [bot]);
  const [config, setConfig] = useState<BotConfiguration>(initialConfig);
  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);

  function updateConfig<Key extends keyof BotConfiguration>(
    key: Key,
    value: BotConfiguration[Key],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-4 pb-20 xl:grid-cols-[minmax(0,820px)_minmax(280px,1fr)]">
      <div className="grid gap-4">
        <ConfigurationSection
          icon={Bot}
          title="Identity"
          description="Public naming, default greeting, and the compact avatar used across channels."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_120px]">
            <Field label="Bot name">
              <TextInput
                value={config.name}
                onChange={(event) => updateConfig('name', event.target.value)}
              />
            </Field>
            <Field label="Initials">
              <TextInput
                value={config.initials}
                maxLength={3}
                onChange={(event) => updateConfig('initials', event.target.value.toUpperCase())}
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="Description">
            <TextInput
              value={config.description}
              onChange={(event) => updateConfig('description', event.target.value)}
            />
          </Field>
          <Field label="Welcome message">
            <TextArea
              value={config.welcomeMessage}
              onChange={(event) => updateConfig('welcomeMessage', event.target.value)}
              className="min-h-20"
            />
          </Field>
        </ConfigurationSection>

        <ConfigurationSection
          icon={FileText}
          title="Instructions"
          description="System prompt, conversational posture, and escalation intent for production answers."
        >
          <Field label="System instructions">
            <TextArea
              value={config.instructions}
              onChange={(event) => updateConfig('instructions', event.target.value)}
              className="min-h-48 font-mono text-xs leading-6"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tone">
              <SelectInput
                value={config.tone}
                onChange={(event) => updateConfig('tone', event.target.value)}
              >
                <option>Friendly, precise, and calm</option>
                <option>Concise and technical</option>
                <option>Warm and consultative</option>
              </SelectInput>
            </Field>
            <Field label="Handoff behavior">
              <SelectInput
                value={config.handoffBehavior}
                onChange={(event) => updateConfig('handoffBehavior', event.target.value)}
              >
                <option>Escalate after low-confidence answer</option>
                <option>Escalate before policy exceptions</option>
                <option>Never escalate automatically</option>
              </SelectInput>
            </Field>
          </div>
        </ConfigurationSection>

        <ConfigurationSection
          icon={Brain}
          title="Model"
          description="Provider, retrieval, and response controls for draft and published versions."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Provider / Model">
              <SelectInput
                value={config.providerModel}
                onChange={(event) => updateConfig('providerModel', event.target.value)}
              >
                <option>OpenAI · gpt-4o-mini</option>
                <option>OpenAI · gpt-4o</option>
                <option>OpenAI · o4-mini</option>
              </SelectInput>
            </Field>
            <Field label={`Temperature · ${config.temperature.toFixed(2)}`}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.temperature}
                onChange={(event) => updateConfig('temperature', Number(event.target.value))}
                className="h-9 w-full accent-primary"
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Retrieval behavior">
              <SelectInput
                value={config.retrievalMode}
                onChange={(event) => updateConfig('retrievalMode', event.target.value)}
              >
                <option>Hybrid semantic + keyword</option>
                <option>Semantic only</option>
                <option>Keyword exact-match first</option>
              </SelectInput>
            </Field>
            <Field label="Source budget">
              <SelectInput
                value={config.maxSources}
                onChange={(event) => updateConfig('maxSources', event.target.value)}
              >
                <option>4 sources</option>
                <option>6 sources</option>
                <option>8 sources</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Response length">
              <SelectInput
                value={config.responseLength}
                onChange={(event) => updateConfig('responseLength', event.target.value)}
              >
                <option>Brief</option>
                <option>Balanced</option>
                <option>Detailed</option>
              </SelectInput>
            </Field>
            <Field label="Citations">
              <SelectInput
                value={config.citationStyle}
                onChange={(event) => updateConfig('citationStyle', event.target.value)}
              >
                <option>Inline source chips</option>
                <option>Footer source list</option>
                <option>Hidden from visitors</option>
              </SelectInput>
            </Field>
          </div>
        </ConfigurationSection>

        <ConfigurationSection
          icon={MessageSquareText}
          title="Conversation"
          description="Default visitor-facing behavior for the embedded widget."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Widget theme">
              <SelectInput
                value={config.widgetTheme}
                onChange={(event) => updateConfig('widgetTheme', event.target.value)}
              >
                <option>Dark system default</option>
                <option>Match visitor preference</option>
                <option>Light system default</option>
              </SelectInput>
            </Field>
            <Field label="Widget position">
              <SelectInput
                value={config.widgetPosition}
                onChange={(event) => updateConfig('widgetPosition', event.target.value)}
              >
                <option>Bottom right</option>
                <option>Bottom left</option>
                <option>Inline embed</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleSwitch
              label="Collect visitor feedback"
              detail="Show helpful or not helpful controls after answers."
              checked={config.collectFeedback}
              onChange={(checked) => updateConfig('collectFeedback', checked)}
            />
            <ToggleSwitch
              label="Human handoff"
              detail="Offer an escalation path when confidence is low."
              checked={config.humanHandoff}
              onChange={(checked) => updateConfig('humanHandoff', checked)}
            />
          </div>
        </ConfigurationSection>

        <ConfigurationSection
          icon={ShieldCheck}
          title="Safety"
          description="Guardrails applied before retrieval, generation, and visitor delivery."
        >
          <div className="grid gap-3">
            <ToggleSwitch
              label="Answer only from knowledge sources"
              detail="Refuse or escalate when no grounded source supports the answer."
              checked={config.strictKnowledge}
              onChange={(checked) => updateConfig('strictKnowledge', checked)}
            />
            <ToggleSwitch
              label="Prompt-injection protection"
              detail="Detect instructions that attempt to override workspace policy."
              checked={config.promptInjectionProtection}
              onChange={(checked) => updateConfig('promptInjectionProtection', checked)}
            />
            <ToggleSwitch
              label="PII redaction"
              detail="Mask sensitive visitor data in logs and conversation exports."
              checked={config.piiRedaction}
              onChange={(checked) => updateConfig('piiRedaction', checked)}
            />
          </div>
        </ConfigurationSection>
      </div>

      <div className="grid h-fit gap-4 xl:sticky xl:top-20">
        <Panel>
          <PanelHeader>
            <PanelTitle>Draft preview</PanelTitle>
            <PanelDescription>Current configuration summary for {bot.name}.</PanelDescription>
          </PanelHeader>
          <PanelBody className="grid gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-semibold text-primary">
                {config.initials || 'BD'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{config.name}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex justify-between gap-3">
                <span>Model</span>
                <span className="text-right text-foreground">{config.providerModel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Retrieval</span>
                <span className="text-right text-foreground">{config.retrievalMode}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Temperature</span>
                <span className="font-mono text-foreground">{config.temperature.toFixed(2)}</span>
              </div>
            </div>
            <CodeBlock className="max-h-48">{config.instructions}</CodeBlock>
          </PanelBody>
        </Panel>

        <Panel className={hasUnsavedChanges ? 'border-warning/60' : undefined}>
          <PanelBody className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Change state</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasUnsavedChanges ? 'Unsaved draft changes' : 'No pending changes'}
                </p>
              </div>
              <Badge tone={hasUnsavedChanges ? 'warning' : 'success'}>
                {hasUnsavedChanges ? 'Unsaved' : 'Clean'}
              </Badge>
            </div>
            <div className="grid gap-2">
              <Button size="md" disabled={!hasUnsavedChanges}>
                <Save className="size-4" aria-hidden="true" />
                Save draft
              </Button>
              <Button variant="secondary" size="md">
                <Play className="size-4" aria-hidden="true" />
                Preview
              </Button>
              <Button variant="secondary" size="md">
                <Rocket className="size-4" aria-hidden="true" />
                Publish changes
              </Button>
              <Button
                variant="ghost"
                size="md"
                disabled={!hasUnsavedChanges}
                onClick={() => setConfig(initialConfig)}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset draft
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </div>

      {hasUnsavedChanges ? (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-5xl flex-col gap-3 rounded-lg border border-warning/60 bg-surface-raised p-3 shadow-surface-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning-muted text-warning">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Unsaved configuration changes</p>
              <p className="text-xs text-muted-foreground">Save this draft before publishing.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfig(initialConfig)}>
              Reset
            </Button>
            <Button variant="secondary" size="sm">
              Preview
            </Button>
            <Button size="sm">
              <Save className="size-4" aria-hidden="true" />
              Save draft
            </Button>
          </div>
        </div>
      ) : null}
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

      {activeTab === 'overview' ? <BotDetailOverview bot={bot} /> : null}
      {activeTab === 'configuration' ? <BotDetailConfiguration bot={bot} /> : null}
      {activeTab !== 'overview' && activeTab !== 'configuration' ? (
        <BotDetailPlaceholder bot={bot} tab={activeTab} />
      ) : null}
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
          <div className="grid gap-3">
            <div className="relative min-w-0">
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

            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            <DataTable className="table-fixed" wrapperClassName="rounded-none border-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Bot</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead className="w-[14%]">Environment</TableHead>
                  <TableHead className="w-[12%] text-right">Conversations</TableHead>
                  <TableHead className="w-[14%]">Published</TableHead>
                  <TableHead className="w-[8%]">
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
                    <TableCell className="min-w-0 whitespace-normal">
                      <div className="flex items-center gap-3">
                        <BotAvatar bot={bot} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{bot.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {bot.id} · {bot.description}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {bot.knowledge} · Updated {bot.updatedAt} by {bot.updatedBy}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <StatusBadge status={bot.status} tone={botStatusTone[bot.status]} />
                      {bot.error ? (
                        <p className="mt-2 text-[11px] text-danger">{bot.error}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <span
                          className={`size-1.5 rounded-full ${
                            bot.environment === 'Production' ? 'bg-success' : 'bg-muted-foreground'
                          }`}
                        />
                        {bot.environment}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {formatCount(bot.conversations)}
                    </TableCell>
                    <TableCell className="whitespace-normal">{bot.lastPublished}</TableCell>
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

function SettingsScreen({ user }: { user: AuthSessionUser }) {
  const displayName = getDisplayName(user);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
      <Panel>
        <PanelHeader>
          <PanelTitle>Account settings</PanelTitle>
          <PanelDescription>
            Manage your account and the bots connected to your default workspace.
          </PanelDescription>
        </PanelHeader>
        <PanelBody className="grid gap-4">
          <div className="grid gap-3">
            <div className="rounded-md border border-border bg-surface-raised p-4">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <div className="mt-2 flex items-center gap-3">
                <UserAvatar user={user} className="size-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-danger/40 bg-danger-muted p-4">
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
              <p className="text-sm font-semibold text-danger">Danger zone</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Deleting your account will remove your profile, sessions, OAuth identities, and bots
              from BotDock.
            </p>
            <Button
              className="mt-4"
              variant="danger"
              size="md"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </PanelBody>
      </Panel>

      {isDeleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md rounded-lg border border-danger/40 bg-surface-raised p-5 shadow-surface-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-danger/40 bg-danger-muted">
                <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
              </div>
              <div>
                <h2 id="delete-account-title" className="text-lg font-semibold text-foreground">
                  Delete account?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This is a destructive action. Your profile, login connections, sessions, and bots
                  will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="md" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={() => setIsDeleteModalOpen(false)}>
                I understand, delete account
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AppShell() {
  const [activeItemId, setActiveItemId] = useState('overview');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<AuthSessionUser>(fallbackUser);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const activeItem = useMemo(() => getNavItem(activeItemId), [activeItemId]);
  const selectedBot = useMemo(
    () => botRows.find((bot) => bot.id === selectedBotId) ?? null,
    [selectedBotId],
  );
  const ActiveIcon = activeItem.icon;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const sessionDisplayName = getDisplayName(sessionUser);
  const sessionFirstName = getFirstName(sessionUser);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const nextStoredTheme: AppTheme = storedTheme === 'light' ? 'light' : 'dark';

    setTheme(nextStoredTheme);
    document.documentElement.dataset.theme = nextStoredTheme;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionUser() {
      try {
        const response = await fetch(new URL('/auth/session', apiBaseUrl), {
          credentials: 'include',
        });

        if (!response.ok) {
          return;
        }

        const payload = authSessionResponseSchema.parse(await response.json());

        if (isMounted && payload.user) {
          setSessionUser(payload.user);
        }
      } catch {
        // Keep the dashboard usable with local fallback data if the API is unavailable.
      }
    }

    void loadSessionUser();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const updatedTheme = currentTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.dataset.theme = updatedTheme;
      window.localStorage.setItem(themeStorageKey, updatedTheme);

      return updatedTheme;
    });
  }

  function handleLogout() {
    window.localStorage.removeItem(authSessionStorageKey);
    window.location.assign('/login');
  }

  function openSettings() {
    setActiveItemId('settings');
    setSelectedBotId(null);
    setIsUserMenuOpen(false);
  }

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
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
              {selectedBot ? null : (
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <ActiveIcon className="size-4 text-primary" aria-hidden="true" />
                      <span>Default workspace</span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
                      {activeItemId === 'overview'
                        ? `Good afternoon, ${sessionFirstName}`
                        : activeItem.label}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {activeItemId === 'overview'
                        ? 'Create and manage multiple bots from your account.'
                        : activeItem.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={toggleTheme}
                      aria-label={`Switch to ${nextTheme} mode`}
                    >
                      <ThemeIcon className="size-4" aria-hidden="true" />
                      {nextTheme === 'light' ? 'Day mode' : 'Night mode'}
                    </Button>
                    <Button variant="secondary" size="md">
                      Last 30 days
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </Button>
                    <Button size="md">
                      <Bot className="size-4" aria-hidden="true" />
                      Create bot
                    </Button>
                    <div className="relative">
                      <button
                        type="button"
                        className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 text-left text-sm font-semibold shadow-surface-sm transition hover:border-primary/50 hover:bg-muted"
                        aria-haspopup="menu"
                        aria-expanded={isUserMenuOpen}
                        onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                      >
                        <UserAvatar user={sessionUser} />
                        <span className="hidden max-w-28 truncate text-foreground sm:inline">
                          {sessionFirstName}
                        </span>
                        <ChevronDown
                          className="size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>

                      {isUserMenuOpen ? (
                        <div
                          role="menu"
                          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-surface-md"
                        >
                          <div className="border-b border-border px-3 py-3">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {sessionDisplayName}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {sessionUser.email}
                            </p>
                          </div>
                          <div className="grid gap-1 p-1.5">
                            <button
                              type="button"
                              role="menuitem"
                              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              onClick={openSettings}
                            >
                              <Settings className="size-4" aria-hidden="true" />
                              Settings
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-danger transition hover:bg-danger-muted"
                              onClick={handleLogout}
                            >
                              <LogOut className="size-4" aria-hidden="true" />
                              Log out
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
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
              ) : activeItemId === 'settings' ? (
                <SettingsScreen user={sessionUser} />
              ) : (
                <Panel>
                  <PanelBody className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <div>
                      <PanelTitle>{activeItem.label} surface</PanelTitle>
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
                          <p className="text-xs text-muted-foreground">Account</p>
                          <p className="mt-2 text-sm font-semibold">Default workspace</p>
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
