'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  authSessionResponseSchema,
  botSchema,
  botsResponseSchema,
  providerCredentialSchema,
  providerCredentialsResponseSchema,
  type AuthSessionUser,
  type Bot as BotRecord,
  type BotBehaviorConfig,
  type BotCitationStyle,
  type BotModelConfig,
  type BotResponseLength,
  type BotRetrievalMode,
  type KnowledgeSource,
  type KnowledgeSourceType,
  type ModelProvider,
  type ProviderCredential,
} from '@botdock/contracts';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Brain,
  Bot,
  ChevronDown,
  CheckCircle2,
  Copy,
  EyeOff,
  ExternalLink,
  FileText,
  Filter,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  MoreHorizontal,
  Moon,
  Plus,
  MessageSquareText,
  Play,
  RefreshCw,
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
  Upload,
} from 'lucide-react';
import {
  Badge,
  Button,
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
        id: 'provider-keys',
        label: 'Model Providers',
        icon: KeyRound,
        description: 'Bring your own model provider keys for chat and embeddings.',
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
type BotConfigurationPanelId = 'identity' | 'instructions' | 'model' | 'conversation' | 'safety';

type BotRow = {
  id: string;
  name: string;
  description: string;
  initials: string;
  status: BotStatus;
  behaviorConfig: BotBehaviorConfig;
  modelConfig: BotModelConfig;
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
  updatedAtTimestamp?: string;
  error?: string;
};

type CredentialOperation = { type: 'create' } | { type: 'rotate'; credential: ProviderCredential };

type ProviderCredentialAction = 'loading' | 'saving' | 'validating' | 'deleting' | 'rotating';

type ProviderCredentialsMessage = {
  tone: 'success' | 'danger' | 'warning';
  text: string;
};

const workspaceOrganisationId = process.env.NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID ?? '';

const defaultBotModelConfig: BotModelConfig = {
  providerCredentialId: null,
  provider: null,
  credentialLabel: null,
  model: 'gpt-4o-mini',
  temperature: 0.35,
  responseLength: 'balanced',
  retrievalMode: 'hybrid',
  maxSources: 6,
  citationStyle: 'inline_source_chips',
};

const defaultBotBehaviorConfig: BotBehaviorConfig = {
  initials: 'BD',
  welcomeMessage: "Hi! I'm here to help with orders, returns, and account questions.",
  instructions: `You are a customer support assistant for this account.
Answer only using the provided knowledge sources.
Be concise, friendly, and professional.
If policy details conflict, prefer the most recent source.
Escalate billing disputes, account access issues, and refund exceptions.`,
  tone: 'Friendly, precise, and calm',
  handoffBehavior: 'Escalate after low-confidence answer',
  widgetTheme: 'Dark system default',
  widgetPosition: 'Bottom right',
  strictKnowledge: true,
  promptInjectionProtection: true,
  piiRedaction: true,
  collectFeedback: true,
  humanHandoff: true,
};

const modelOptionsByProvider: Record<ModelProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'o4-mini'],
};

const responseLengthLabels: Record<BotResponseLength, string> = {
  brief: 'Brief',
  balanced: 'Balanced',
  detailed: 'Detailed',
};

const retrievalModeLabels: Record<BotRetrievalMode, string> = {
  hybrid: 'Hybrid semantic + keyword',
  semantic: 'Semantic only',
  keyword: 'Keyword exact-match first',
};

const citationStyleLabels: Record<BotCitationStyle, string> = {
  inline_source_chips: 'Inline source chips',
  footer_source_list: 'Footer source list',
  hidden: 'Hidden from visitors',
};

function getProviderLabel(provider: ModelProvider) {
  if (provider === 'openai') {
    return 'OpenAI';
  }

  return provider;
}

function getProviderCredentialStatus(credential: ProviderCredential) {
  if (credential.status === 'active') {
    return 'Active';
  }

  if (!credential.lastValidatedAt) {
    return 'Unvalidated';
  }

  return 'Invalid';
}

function getProviderCredentialTone(credential: ProviderCredential) {
  if (credential.status === 'active') {
    return 'success' as const;
  }

  if (!credential.lastValidatedAt) {
    return 'warning' as const;
  }

  return 'danger' as const;
}

function getBotModelCredentialLabel(bot: BotRow) {
  if (bot.modelConfig.provider && bot.modelConfig.credentialLabel) {
    return `${getProviderLabel(bot.modelConfig.provider)} · ${bot.modelConfig.credentialLabel}`;
  }

  return 'No provider key';
}

export function getBotSearchText(bot: BotRow) {
  return [
    bot.name,
    bot.id,
    bot.description,
    bot.environment,
    bot.updatedBy,
    bot.modelConfig.model,
    bot.modelConfig.providerCredentialId ?? '',
    bot.modelConfig.provider ? getProviderLabel(bot.modelConfig.provider) : '',
    bot.modelConfig.credentialLabel ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;

    return message ?? 'Request failed.';
  } catch {
    return 'Request failed.';
  }
}

function getBotInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  return name.trim().slice(0, 2).toUpperCase() || 'BD';
}

function getRelativeTimestamp(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(deltaMs / 60000));

  if (minutes < 60) {
    return `${minutes || 1}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function toBotStatus(status: BotRecord['status']): BotStatus {
  if (status === 'published') {
    return 'Published';
  }

  if (status === 'archived') {
    return 'Disabled';
  }

  return 'Draft';
}

function toBotRow(bot: BotRecord): BotRow {
  return {
    id: bot.id,
    name: bot.name,
    description: bot.description ?? 'No description',
    initials: bot.behaviorConfig.initials || getBotInitials(bot.name),
    status: toBotStatus(bot.status),
    behaviorConfig: bot.behaviorConfig,
    modelConfig: bot.modelConfig,
    environment: bot.status === 'published' ? 'Production' : 'Draft',
    knowledge: 'No sources connected',
    conversations: 0,
    version: bot.status === 'published' ? 'Published' : 'Draft',
    resolutionRate: '0%',
    feedbackRate: '0%',
    estimatedCost: '$0.00',
    errorRate: '0.00%',
    lastPublished:
      bot.status === 'published' ? getRelativeTimestamp(bot.updatedAt) : 'Not published',
    updatedBy: 'Workspace',
    updatedAt: getRelativeTimestamp(bot.updatedAt),
    updatedAtTimestamp: bot.updatedAt,
  };
}

const botRows: BotRow[] = [
  {
    id: 'bot_7f3a1',
    name: 'Support Assistant',
    description: 'Production customer support widget',
    initials: 'SA',
    status: 'Published',
    behaviorConfig: { ...defaultBotBehaviorConfig, initials: 'SA' },
    modelConfig: defaultBotModelConfig,
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
    behaviorConfig: { ...defaultBotBehaviorConfig, initials: 'DA' },
    modelConfig: defaultBotModelConfig,
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
    behaviorConfig: { ...defaultBotBehaviorConfig, initials: 'SQ' },
    modelConfig: defaultBotModelConfig,
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
    behaviorConfig: { ...defaultBotBehaviorConfig, initials: 'IK' },
    modelConfig: defaultBotModelConfig,
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
    behaviorConfig: { ...defaultBotBehaviorConfig, initials: 'OH' },
    modelConfig: defaultBotModelConfig,
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
    behaviorConfig: { ...defaultBotBehaviorConfig, initials: 'CR' },
    modelConfig: defaultBotModelConfig,
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

type DashboardRouteState = {
  activeItemId: string;
  selectedBotId: string | null;
  selectedBotTab: BotDetailTab;
  selectedBotConfigurationPanel: BotConfigurationPanelId;
};

export function getCreatedBotDashboardRoute(botId: string): DashboardRouteState {
  return {
    activeItemId: 'bots',
    selectedBotId: botId,
    selectedBotTab: 'configuration',
    selectedBotConfigurationPanel: 'identity',
  };
}

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
  providerCredentialId: string | null;
  model: string;
  temperature: number;
  retrievalMode: BotRetrievalMode;
  maxSources: number;
  responseLength: BotResponseLength;
  citationStyle: BotCitationStyle;
  widgetTheme: string;
  widgetPosition: string;
  strictKnowledge: boolean;
  promptInjectionProtection: boolean;
  piiRedaction: boolean;
  collectFeedback: boolean;
  humanHandoff: boolean;
};

export function areBotConfigurationsEqual(left: BotConfiguration, right: BotConfiguration) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getBotConfiguration(bot: BotRow): BotConfiguration {
  return {
    name: bot.name,
    description: bot.description,
    initials: bot.behaviorConfig.initials,
    welcomeMessage: bot.behaviorConfig.welcomeMessage,
    instructions: bot.behaviorConfig.instructions,
    tone: bot.behaviorConfig.tone,
    handoffBehavior: bot.behaviorConfig.handoffBehavior,
    providerCredentialId: bot.modelConfig.providerCredentialId,
    model: bot.modelConfig.model,
    temperature: bot.modelConfig.temperature,
    retrievalMode: bot.modelConfig.retrievalMode,
    maxSources: bot.modelConfig.maxSources,
    responseLength: bot.modelConfig.responseLength,
    citationStyle: bot.modelConfig.citationStyle,
    widgetTheme: bot.behaviorConfig.widgetTheme,
    widgetPosition: bot.behaviorConfig.widgetPosition,
    strictKnowledge: bot.behaviorConfig.strictKnowledge,
    promptInjectionProtection: bot.behaviorConfig.promptInjectionProtection,
    piiRedaction: bot.behaviorConfig.piiRedaction,
    collectFeedback: bot.behaviorConfig.collectFeedback,
    humanHandoff: bot.behaviorConfig.humanHandoff,
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

function isNavItemId(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return (
    value === settingsNavItem.id ||
    navGroups.some((group) => group.items.some((item) => item.id === value))
  );
}

function isBotDetailTab(value: string | null): value is BotDetailTab {
  return Boolean(value && botDetailTabs.some((tab) => tab.id === value));
}

function isBotConfigurationPanel(value: string | null): value is BotConfigurationPanelId {
  return (
    value === 'identity' ||
    value === 'instructions' ||
    value === 'model' ||
    value === 'conversation' ||
    value === 'safety'
  );
}

export function getInitialDashboardRoute(): DashboardRouteState {
  if (typeof window === 'undefined') {
    return {
      activeItemId: 'overview',
      selectedBotId: null,
      selectedBotTab: 'overview',
      selectedBotConfigurationPanel: 'identity',
    };
  }

  const params = new URLSearchParams(window.location.search);
  const selectedBotId = params.get('bot');

  if (selectedBotId) {
    const selectedBotTab = params.get('tab');
    const selectedBotConfigurationPanel = params.get('config');

    return {
      activeItemId: 'bots',
      selectedBotId,
      selectedBotTab: isBotDetailTab(selectedBotTab) ? selectedBotTab : 'overview',
      selectedBotConfigurationPanel: isBotConfigurationPanel(selectedBotConfigurationPanel)
        ? selectedBotConfigurationPanel
        : 'identity',
    };
  }

  const section = params.get('section');
  const activeItemId = isNavItemId(section) ? section : 'overview';

  return {
    activeItemId,
    selectedBotId: null,
    selectedBotTab: 'overview',
    selectedBotConfigurationPanel: 'identity',
  };
}

export function writeDashboardRoute(routeState: DashboardRouteState) {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams();

  if (routeState.selectedBotId) {
    params.set('section', 'bots');
    params.set('bot', routeState.selectedBotId);

    if (routeState.selectedBotTab !== 'overview') {
      params.set('tab', routeState.selectedBotTab);
    }

    if (
      routeState.selectedBotTab === 'configuration' &&
      routeState.selectedBotConfigurationPanel !== 'identity'
    ) {
      params.set('config', routeState.selectedBotConfigurationPanel);
    }
  } else if (routeState.activeItemId !== 'overview') {
    params.set('section', routeState.activeItemId);
  }

  const query = params.toString();
  window.history.replaceState(null, '', query ? `/?${query}` : '/');
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

function BotsEmptyState({ onCreateBot }: { onCreateBot: () => void }) {
  return (
    <EmptyState
      title="No bots in this workspace"
      description="Create the first bot to connect knowledge, test responses, and publish a production-ready assistant."
      action={
        <Button size="md" onClick={onCreateBot}>
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
      className={`h-9 w-full min-w-0 rounded-md border border-input bg-surface-raised px-3 text-sm text-foreground shadow-surface-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
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
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-surface-raised px-4 py-3">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{detail}</p>
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
        <div className="min-w-0">
          <PanelTitle>{title}</PanelTitle>
          <PanelDescription>{description}</PanelDescription>
        </div>
      </PanelHeader>
      <PanelBody className="grid gap-4">{children}</PanelBody>
    </Panel>
  );
}

function BotDetailConfiguration({
  activePanel,
  bot,
  onPanelChange,
  onBotUpdated,
  onOpenModelProviders,
}: {
  activePanel: BotConfigurationPanelId;
  bot: BotRow;
  onPanelChange: (panel: BotConfigurationPanelId) => void;
  onBotUpdated: (bot: BotRecord) => void;
  onOpenModelProviders: () => void;
}) {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const initialConfig = useMemo(() => getBotConfiguration(bot), [bot]);
  const [config, setConfig] = useState<BotConfiguration>(initialConfig);
  const [savedConfig, setSavedConfig] = useState<BotConfiguration>(initialConfig);
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [didLoadCredentials, setDidLoadCredentials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<ProviderCredentialsMessage | null>(null);
  const savedConfigRef = useRef(savedConfig);
  const activeBotIdRef = useRef(bot.id);
  const hasUnsavedChanges = !areBotConfigurationsEqual(config, savedConfig);
  const activeCredentials = credentials.filter((credential) => credential.status === 'active');
  const selectedCredential =
    activeCredentials.find((credential) => credential.id === config.providerCredentialId) ?? null;
  const modelOptions = selectedCredential
    ? modelOptionsByProvider[selectedCredential.provider]
    : modelOptionsByProvider.openai;
  const modelSelectionDisabled = isLoadingCredentials || activeCredentials.length === 0;
  const publishReadiness = selectedCredential
    ? {
        tone: 'success' as const,
        label: 'Ready to publish',
        detail: `${getProviderLabel(selectedCredential.provider)} credential selected for draft model calls.`,
      }
    : {
        tone: 'warning' as const,
        label: 'Provider key required',
        detail: isLoadingCredentials
          ? 'Checking workspace provider credentials before publishing.'
          : 'Choose an active provider key before publishing this draft.',
      };
  const configurationPanels: Array<{
    id: BotConfigurationPanelId;
    label: string;
    icon: LucideIcon;
  }> = [
    { id: 'identity', label: 'Identity', icon: Bot },
    { id: 'instructions', label: 'Instructions', icon: FileText },
    { id: 'model', label: 'Model', icon: Brain },
    { id: 'conversation', label: 'Conversation', icon: MessageSquareText },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
  ];

  useEffect(() => {
    savedConfigRef.current = savedConfig;
  }, [savedConfig]);

  useEffect(() => {
    if (saveMessage?.tone !== 'success') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSaveMessage(null), 3800);

    return () => window.clearTimeout(timeoutId);
  }, [saveMessage]);

  useEffect(() => {
    const botChanged = activeBotIdRef.current !== bot.id;
    const previousSavedConfig = savedConfigRef.current;

    activeBotIdRef.current = bot.id;
    setSavedConfig(initialConfig);
    setConfig((currentConfig) => {
      if (botChanged || areBotConfigurationsEqual(currentConfig, previousSavedConfig)) {
        return initialConfig;
      }

      return currentConfig;
    });
  }, [bot.id, initialConfig]);

  useEffect(() => {
    let isMounted = true;

    async function loadCredentials() {
      if (!workspaceOrganisationId.trim()) {
        setIsLoadingCredentials(false);
        setSaveMessage({
          tone: 'warning',
          text: 'Set NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID before selecting model providers.',
        });
        return;
      }

      setIsLoadingCredentials(true);

      try {
        const response = await fetch(
          new URL(`/organisations/${workspaceOrganisationId}/provider-credentials`, apiBaseUrl),
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const payload = providerCredentialsResponseSchema.parse(await response.json());

        if (isMounted) {
          setCredentials(payload.credentials);
          setDidLoadCredentials(true);
        }
      } catch (error) {
        if (isMounted) {
          setDidLoadCredentials(false);
          setSaveMessage({
            tone: 'danger',
            text: error instanceof Error ? error.message : 'Could not load provider credentials.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingCredentials(false);
        }
      }
    }

    void loadCredentials();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!didLoadCredentials || isLoadingCredentials || !config.providerCredentialId) {
      return;
    }

    if (activeCredentials.some((credential) => credential.id === config.providerCredentialId)) {
      return;
    }

    setConfig((currentConfig) => ({ ...currentConfig, providerCredentialId: null }));
    setSaveMessage({
      tone: 'warning',
      text: 'The saved provider key is no longer active. Choose a new key before publishing.',
    });
  }, [activeCredentials, config.providerCredentialId, didLoadCredentials, isLoadingCredentials]);

  function updateConfig<Key extends keyof BotConfiguration>(
    key: Key,
    value: BotConfiguration[Key],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
    setSaveMessage((currentMessage) =>
      currentMessage?.tone === 'success' ? null : currentMessage,
    );
  }

  async function saveConfiguration() {
    if (!workspaceOrganisationId.trim()) {
      setSaveMessage({
        tone: 'warning',
        text: 'Bot configuration needs a configured workspace organisation id.',
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(
        new URL(`/organisations/${workspaceOrganisationId}/bots/${bot.id}`, apiBaseUrl),
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: config.name,
            description: config.description,
            behaviorConfig: {
              initials: config.initials,
              welcomeMessage: config.welcomeMessage,
              instructions: config.instructions,
              tone: config.tone,
              handoffBehavior: config.handoffBehavior,
              widgetTheme: config.widgetTheme,
              widgetPosition: config.widgetPosition,
              strictKnowledge: config.strictKnowledge,
              promptInjectionProtection: config.promptInjectionProtection,
              piiRedaction: config.piiRedaction,
              collectFeedback: config.collectFeedback,
              humanHandoff: config.humanHandoff,
            },
            modelConfig: {
              providerCredentialId: config.providerCredentialId,
              model: config.model,
              temperature: config.temperature,
              responseLength: config.responseLength,
              retrievalMode: config.retrievalMode,
              maxSources: config.maxSources,
              citationStyle: config.citationStyle,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const updatedBot = botSchema.parse(await response.json());
      onBotUpdated(updatedBot);
      const updatedConfig = getBotConfiguration(toBotRow(updatedBot));
      setSavedConfig(updatedConfig);
      setConfig(updatedConfig);
      setSaveMessage({ tone: 'success', text: 'Draft configuration saved.' });
    } catch (error) {
      setSaveMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Could not save bot configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 pb-28 xl:grid-cols-[minmax(0,820px)_minmax(0,1fr)] xl:pb-24">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)]">
        <Panel className="h-fit lg:sticky lg:top-20">
          <PanelBody className="flex snap-x gap-1 overflow-x-auto p-2 lg:grid lg:overflow-visible">
            {configurationPanels.map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Open ${item.label} configuration`}
                  aria-pressed={isActive}
                  onClick={() => onPanelChange(item.id)}
                  className={`flex min-w-11 shrink-0 snap-start items-center justify-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold transition sm:min-w-0 sm:justify-start lg:w-full ${
                    isActive
                      ? 'border-primary/40 bg-primary-muted text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="hidden truncate sm:inline">{item.label}</span>
                </button>
              );
            })}
          </PanelBody>
        </Panel>

        <div className="grid min-w-0 gap-4">
          {saveMessage ? (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                saveMessage.tone === 'success'
                  ? 'border-success/40 bg-success-muted text-success'
                  : saveMessage.tone === 'warning'
                    ? 'border-warning/40 bg-warning-muted text-warning'
                    : 'border-danger/40 bg-danger-muted text-danger'
              }`}
            >
              {saveMessage.tone === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          ) : null}

          {activePanel === 'identity' ? (
            <ConfigurationSection
              icon={Bot}
              title="Identity"
              description="Public naming, default greeting, and the compact avatar used across channels."
            >
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_120px]">
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
          ) : null}

          {activePanel === 'instructions' ? (
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
          ) : null}

          {activePanel === 'model' ? (
            <ConfigurationSection
              icon={Brain}
              title="Model"
              description="Provider, retrieval, and response controls for draft and published versions."
            >
              {activeCredentials.length === 0 && !isLoadingCredentials ? (
                <div className="flex min-w-0 flex-col gap-3 rounded-md border border-warning/40 bg-warning-muted p-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 break-words">
                    No active provider key exists for this workspace.
                  </span>
                  <Button variant="secondary" size="sm" onClick={onOpenModelProviders}>
                    <KeyRound className="size-4" aria-hidden="true" />
                    Model Providers
                  </Button>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provider credential">
                  <SelectInput
                    value={config.providerCredentialId ?? ''}
                    disabled={modelSelectionDisabled}
                    onChange={(event) => {
                      const nextCredential =
                        activeCredentials.find(
                          (credential) => credential.id === event.target.value,
                        ) ?? null;
                      updateConfig('providerCredentialId', nextCredential?.id ?? null);

                      if (nextCredential) {
                        updateConfig(
                          'model',
                          modelOptionsByProvider[nextCredential.provider][0] ?? config.model,
                        );
                      }
                    }}
                  >
                    <option value="">
                      {isLoadingCredentials ? 'Loading credentials...' : 'Select active credential'}
                    </option>
                    {activeCredentials.map((credential) => (
                      <option key={credential.id} value={credential.id}>
                        {getProviderLabel(credential.provider)} · {credential.label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Model">
                  <SelectInput
                    value={config.model}
                    disabled={modelSelectionDisabled}
                    onChange={(event) => updateConfig('model', event.target.value)}
                  >
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={`Temperature · ${config.temperature.toFixed(2)}`}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.temperature}
                    disabled={modelSelectionDisabled}
                    onChange={(event) => updateConfig('temperature', Number(event.target.value))}
                    className="h-9 w-full accent-primary disabled:cursor-not-allowed disabled:opacity-55"
                  />
                </Field>
                <Field label="Response length">
                  <SelectInput
                    value={config.responseLength}
                    disabled={modelSelectionDisabled}
                    onChange={(event) =>
                      updateConfig('responseLength', event.target.value as BotResponseLength)
                    }
                  >
                    {Object.entries(responseLengthLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Retrieval behavior">
                  <SelectInput
                    value={config.retrievalMode}
                    onChange={(event) =>
                      updateConfig('retrievalMode', event.target.value as BotRetrievalMode)
                    }
                  >
                    {Object.entries(retrievalModeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Source budget">
                  <SelectInput
                    value={String(config.maxSources)}
                    onChange={(event) => updateConfig('maxSources', Number(event.target.value))}
                  >
                    {[4, 6, 8, 10, 12].map((sourceCount) => (
                      <option key={sourceCount} value={sourceCount}>
                        {sourceCount} sources
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Citations">
                  <SelectInput
                    value={config.citationStyle}
                    onChange={(event) =>
                      updateConfig('citationStyle', event.target.value as BotCitationStyle)
                    }
                  >
                    {Object.entries(citationStyleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <div className="min-w-0 rounded-md border border-border bg-surface-raised p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Save state</span>
                    <Badge tone={hasUnsavedChanges ? 'warning' : 'success'}>
                      {isSaving ? 'Saving' : hasUnsavedChanges ? 'Unsaved' : 'Clean'}
                    </Badge>
                  </div>
                  <p className="mt-2 break-words text-xs text-foreground [overflow-wrap:anywhere]">
                    {selectedCredential
                      ? `${getProviderLabel(selectedCredential.provider)} · ${selectedCredential.label}`
                      : 'No active credential selected'}
                  </p>
                </div>
              </div>
            </ConfigurationSection>
          ) : null}

          {activePanel === 'conversation' ? (
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
          ) : null}

          {activePanel === 'safety' ? (
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
          ) : null}
        </div>
      </div>

      <div className="grid h-fit gap-4 xl:sticky xl:top-20">
        <Panel className={hasUnsavedChanges ? 'border-warning/60' : undefined}>
          <PanelBody className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Change state</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasUnsavedChanges ? 'Unsaved draft changes' : 'No pending changes'}
                </p>
              </div>
              <Badge tone={hasUnsavedChanges ? 'warning' : 'success'}>
                {hasUnsavedChanges ? 'Unsaved' : 'Clean'}
              </Badge>
            </div>
            <div
              className={`rounded-md border p-3 ${
                publishReadiness.tone === 'success'
                  ? 'border-success/40 bg-success-muted'
                  : 'border-warning/40 bg-warning-muted'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {publishReadiness.tone === 'success' ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  <p
                    className={`text-sm font-semibold ${
                      publishReadiness.tone === 'success' ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {publishReadiness.label}
                  </p>
                </div>
                <Badge tone={publishReadiness.tone}>Publish</Badge>
              </div>
              <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                {publishReadiness.detail}
              </p>
            </div>
            <div className="grid gap-2">
              <Button
                size="md"
                disabled={!hasUnsavedChanges || isSaving}
                onClick={() => void saveConfiguration()}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Save draft
              </Button>
              <Button variant="secondary" size="md">
                <Play className="size-4" aria-hidden="true" />
                Preview
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={!selectedCredential || isLoadingCredentials}
              >
                <Rocket className="size-4" aria-hidden="true" />
                Publish changes
              </Button>
              <Button
                variant="ghost"
                size="md"
                disabled={!hasUnsavedChanges}
                onClick={() => {
                  setConfig(savedConfig);
                  setSaveMessage(null);
                }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset draft
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </div>

      {hasUnsavedChanges ? (
        <div className="fixed inset-x-2 bottom-2 z-30 mx-auto flex max-w-5xl flex-col gap-2 rounded-lg border border-warning/60 bg-surface-raised p-2.5 shadow-surface-md sm:inset-x-4 sm:bottom-4 sm:flex-row sm:items-center sm:justify-between sm:p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-warning-muted text-warning sm:flex">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Unsaved configuration changes</p>
              <p className="truncate text-xs text-muted-foreground">
                Save this draft before publishing.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfig(savedConfig);
                setSaveMessage(null);
              }}
            >
              Reset
            </Button>
            <Button variant="secondary" size="sm">
              Preview
            </Button>
            <Button size="sm" disabled={isSaving} onClick={() => void saveConfiguration()}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Save draft
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const knowledgeSourceTypeLabel: Record<KnowledgeSourceType, string> = {
  file: 'File',
  text: 'Text',
  faq: 'FAQ',
};

const knowledgeSourceStatusLabel: Record<KnowledgeSource['status'], string> = {
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

function knowledgeSourceStatusTone(status: KnowledgeSource['status']) {
  if (status === 'ready') {
    return 'success' as const;
  }

  if (status === 'failed') {
    return 'danger' as const;
  }

  return 'primary' as const;
}

function getKnowledgeSourcesFixture(bot: BotRow): KnowledgeSource[] {
  const now = Date.now();

  return [
    {
      id: `${bot.id}-source-1`,
      organisationId: workspaceOrganisationId,
      botId: bot.id,
      type: 'file',
      name: 'refund-policy.pdf',
      status: 'ready',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 186,
      errorMessage: null,
      createdAt: new Date(now - 4 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 4 * 86_400_000).toISOString(),
    },
    {
      id: `${bot.id}-source-2`,
      organisationId: workspaceOrganisationId,
      botId: bot.id,
      type: 'faq',
      name: 'Shipping FAQ',
      status: 'ready',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 42,
      errorMessage: null,
      createdAt: new Date(now - 7 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 7 * 86_400_000).toISOString(),
    },
    {
      id: `${bot.id}-source-3`,
      organisationId: workspaceOrganisationId,
      botId: bot.id,
      type: 'text',
      name: 'Account & billing notes',
      status: 'processing',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 0,
      errorMessage: null,
      createdAt: new Date(now - 60_000).toISOString(),
      updatedAt: new Date(now - 60_000).toISOString(),
    },
    {
      id: `${bot.id}-source-4`,
      organisationId: workspaceOrganisationId,
      botId: bot.id,
      type: 'file',
      name: 'onboarding-guide.pdf',
      status: 'failed',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      chunkCount: 0,
      errorMessage: 'PDF parsing is not supported yet; upload a text or markdown file instead.',
      createdAt: new Date(now - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
    },
  ];
}

function BotDetailKnowledge({ bot }: { bot: BotRow }) {
  const [sources] = useState<KnowledgeSource[]>(() => getKnowledgeSourcesFixture(bot));
  const totalChunks = sources.reduce((sum, source) => sum + source.chunkCount, 0);

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PanelTitle>Knowledge sources</PanelTitle>
            <PanelDescription>
              {sources.length} source{sources.length === 1 ? '' : 's'} · {totalChunks} chunks
              indexed
            </PanelDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Add text
            </Button>
            <Button variant="secondary" size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Add FAQ
            </Button>
            <Button size="sm">
              <Upload className="size-4" aria-hidden="true" />
              Upload files
            </Button>
          </div>
        </PanelHeader>
        <PanelBody className="grid gap-4">
          <div className="rounded-lg border border-dashed border-border bg-surface/70 p-8 text-center">
            <Upload className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Drag and drop files, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, TXT, Markdown · up to 20MB per file
            </p>
          </div>

          {sources.length === 0 ? (
            <EmptyState
              title="No knowledge sources yet"
              description="Upload a file or add text/FAQ content so this bot can answer from your knowledge base."
            />
          ) : (
            <>
              <div className="-mx-4 -my-4 grid gap-3 p-4 md:hidden">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="min-w-0 rounded-md border border-border bg-surface-raised p-4"
                  >
                    <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
                      {source.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{knowledgeSourceTypeLabel[source.type]}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{source.chunkCount} chunks</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{getRelativeTimestamp(source.updatedAt)}</span>
                    </div>
                    <StatusBadge
                      status={knowledgeSourceStatusLabel[source.status]}
                      tone={knowledgeSourceStatusTone(source.status)}
                      className="mt-3"
                    />
                    {source.errorMessage ? (
                      <p className="mt-2 break-words text-xs text-danger [overflow-wrap:anywhere]">
                        {source.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <DataTable className="w-full max-w-full table-fixed" wrapperClassName="hidden md:block">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[38%] px-3 sm:px-4">Source</TableHead>
                    <TableHead className="w-20 px-3 sm:px-4">Type</TableHead>
                    <TableHead className="w-36 px-3 sm:px-4">Status</TableHead>
                    <TableHead className="w-20 px-3 text-right sm:px-4">Chunks</TableHead>
                    <TableHead className="w-28 px-3 sm:px-4">Updated</TableHead>
                    <TableHead className="w-16 px-2 sm:px-3">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="min-w-0 whitespace-normal px-3 sm:px-4">
                        <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
                          {source.name}
                        </p>
                        {source.errorMessage ? (
                          <p className="mt-1 break-words text-xs text-danger [overflow-wrap:anywhere]">
                            {source.errorMessage}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-normal px-3 text-muted-foreground sm:px-4">
                        {knowledgeSourceTypeLabel[source.type]}
                      </TableCell>
                      <TableCell className="whitespace-normal px-3 sm:px-4">
                        <StatusBadge
                          status={knowledgeSourceStatusLabel[source.status]}
                          tone={knowledgeSourceStatusTone(source.status)}
                        />
                      </TableCell>
                      <TableCell className="px-3 text-right font-mono text-foreground sm:px-4">
                        {source.chunkCount}
                      </TableCell>
                      <TableCell className="whitespace-normal px-3 text-muted-foreground sm:px-4">
                        {getRelativeTimestamp(source.updatedAt)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-3">
                        <div className="flex justify-end">
                          <IconButton
                            aria-label={`Delete ${source.name}`}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </IconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </DataTable>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Website, Notion, Google Drive, and GitHub sources are coming soon.
          </p>
        </PanelBody>
      </Panel>
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

function BotsListCard({ bot, onOpenBot }: { bot: BotRow; onOpenBot: (botId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenBot(bot.id)}
      className={`grid min-w-0 gap-3 border-b border-border p-4 text-left transition last:border-b-0 hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        bot.status === 'Error' ? 'bg-danger/5' : ''
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <BotAvatar bot={bot} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 break-words font-medium text-foreground [overflow-wrap:anywhere]">
              {bot.name}
            </p>
            <StatusBadge status={bot.status} tone={botStatusTone[bot.status]} />
          </div>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{bot.id}</p>
          <p className="mt-2 break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {bot.description}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 rounded-md border border-border bg-surface-raised p-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0">Environment</span>
          <span className="min-w-0 break-words text-right text-foreground">{bot.environment}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0">Conversations</span>
          <span className="font-mono text-foreground">{formatCount(bot.conversations)}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0">Model key</span>
          <span className="min-w-0 break-words text-right text-foreground [overflow-wrap:anywhere]">
            {getBotModelCredentialLabel(bot)}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0">Published</span>
          <span className="min-w-0 break-words text-right text-foreground">
            {bot.lastPublished}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="shrink-0">Updated</span>
          <span className="min-w-0 break-words text-right text-foreground [overflow-wrap:anywhere]">
            {bot.updatedAt} by {bot.updatedBy}
          </span>
        </div>
      </div>

      {bot.error ? <p className="break-words text-xs text-danger">{bot.error}</p> : null}
    </button>
  );
}

function BotDetailScreen({
  activeTab,
  activeConfigurationPanel,
  bot,
  onBack,
  onTabChange,
  onConfigurationPanelChange,
  onBotUpdated,
  onOpenModelProviders,
}: {
  activeTab: BotDetailTab;
  activeConfigurationPanel: BotConfigurationPanelId;
  bot: BotRow;
  onBack: () => void;
  onTabChange: (tab: BotDetailTab) => void;
  onConfigurationPanelChange: (panel: BotConfigurationPanelId) => void;
  onBotUpdated: (bot: BotRecord) => void;
  onOpenModelProviders: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-4 border-b border-border pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="shrink-0">Bots</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="min-w-0 truncate text-foreground">{bot.name}</span>
        </button>

        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3">
            <BotAvatar bot={bot} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words text-2xl font-semibold tracking-normal text-foreground [overflow-wrap:anywhere]">
                  {bot.name}
                </h1>
                <StatusBadge status={bot.status} tone={botStatusTone[bot.status]} />
              </div>
              <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                {bot.description}
              </p>
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge tone="neutral" className="max-w-full break-all font-mono normal-case">
                  {bot.id}
                </Badge>
                <span className="break-words">{bot.environment}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="break-words">{bot.version}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="break-words [overflow-wrap:anywhere]">
                  Updated {bot.updatedAt} by {bot.updatedBy}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
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
            <Tab key={tab.id} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>
              {tab.label}
            </Tab>
          ))}
        </Tabs>
      </div>

      {activeTab === 'overview' ? <BotDetailOverview bot={bot} /> : null}
      {activeTab === 'configuration' ? (
        <BotDetailConfiguration
          activePanel={activeConfigurationPanel}
          bot={bot}
          onPanelChange={onConfigurationPanelChange}
          onBotUpdated={onBotUpdated}
          onOpenModelProviders={onOpenModelProviders}
        />
      ) : null}
      {activeTab === 'knowledge' ? <BotDetailKnowledge bot={bot} /> : null}
      {activeTab !== 'overview' && activeTab !== 'configuration' && activeTab !== 'knowledge' ? (
        <BotDetailPlaceholder bot={bot} tab={activeTab} />
      ) : null}
    </div>
  );
}

function BotsListScreen({
  bots,
  initialQuery,
  onCreateBot,
  onOpenBot,
}: {
  bots: BotRow[];
  initialQuery: string;
  onCreateBot: () => void;
  onOpenBot: (botId: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<BotFilter>('All');
  const [sortBy, setSortBy] = useState<BotSort>('updated');

  useEffect(() => {
    setQuery(initialQuery);
    setStatusFilter('All');
  }, [initialQuery]);

  const filteredBots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bots
      .filter((bot) => {
        const matchesStatus = statusFilter === 'All' || bot.status === statusFilter;
        const matchesQuery =
          normalizedQuery.length === 0 || getBotSearchText(bot).includes(normalizedQuery);

        return matchesStatus && matchesQuery;
      })
      .toSorted((first, second) => {
        if (sortBy === 'name') {
          return first.name.localeCompare(second.name);
        }

        if (sortBy === 'conversations') {
          return second.conversations - first.conversations;
        }

        return bots.indexOf(first) - bots.indexOf(second);
      });
  }, [bots, query, sortBy, statusFilter]);

  const statusCounts = bots.reduce<Record<BotFilter, number>>(
    (counts, bot) => {
      counts.All += 1;
      counts[bot.status] += 1;

      return counts;
    },
    { All: 0, Published: 0, Draft: 0, Processing: 0, Error: 0, Disabled: 0 },
  );

  if (bots.length === 0) {
    return <BotsEmptyState onCreateBot={onCreateBot} />;
  }

  return (
    <div className="grid min-w-0 gap-4 overflow-hidden">
      <Panel className="min-w-0 overflow-hidden">
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
              <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-muted-foreground">
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

          <div className="grid min-w-0 gap-3 border-t border-border pt-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <p className="min-w-0 text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredBots.length}</span> of{' '}
              <span className="font-medium text-foreground">{bots.length}</span> bots
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
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
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <PanelTitle>Bot inventory</PanelTitle>
              <PanelDescription>
                Operational state, ownership, and publication freshness across workspace bots.
              </PanelDescription>
            </div>
            <Button variant="secondary" size="sm">
              Export CSV
            </Button>
          </PanelHeader>
          <PanelBody className="grid gap-4 p-4">
            <div className="-mx-4 -my-4 grid md:hidden">
              {filteredBots.map((bot) => (
                <BotsListCard key={bot.id} bot={bot} onOpenBot={onOpenBot} />
              ))}
            </div>
            <DataTable className="w-full max-w-full table-fixed" wrapperClassName="hidden md:block">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%] px-3 sm:px-4">Bot</TableHead>
                  <TableHead className="w-24 px-3 sm:px-4">Status</TableHead>
                  <TableHead className="hidden w-28 px-3 lg:table-cell sm:px-4">
                    Environment
                  </TableHead>
                  <TableHead className="hidden w-36 px-3 xl:table-cell sm:px-4">
                    Model key
                  </TableHead>
                  <TableHead className="w-24 px-3 text-right sm:px-4">
                    <span className="block truncate">Conversations</span>
                  </TableHead>
                  <TableHead className="hidden w-28 px-3 2xl:table-cell sm:px-4">
                    Published
                  </TableHead>
                  <TableHead className="w-16 px-2 sm:px-3">
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
                    <TableCell className="min-w-0 whitespace-normal px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <BotAvatar bot={bot} size="sm" />
                        <div className="min-w-0">
                          <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
                            {bot.name}
                          </p>
                          <p className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                            {bot.id} · {bot.description}
                          </p>
                          <p className="mt-1 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                            {bot.knowledge} · Updated {bot.updatedAt} by {bot.updatedBy}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal px-3 sm:px-4">
                      <StatusBadge status={bot.status} tone={botStatusTone[bot.status]} />
                      {bot.error ? (
                        <p className="mt-2 break-words text-[11px] text-danger">{bot.error}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal px-3 lg:table-cell sm:px-4">
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <span
                          className={`size-1.5 rounded-full ${
                            bot.environment === 'Production' ? 'bg-success' : 'bg-muted-foreground'
                          }`}
                        />
                        {bot.environment}
                      </span>
                    </TableCell>
                    <TableCell className="hidden min-w-0 whitespace-normal px-3 xl:table-cell sm:px-4">
                      <p className="break-words text-xs font-medium text-foreground [overflow-wrap:anywhere]">
                        {getBotModelCredentialLabel(bot)}
                      </p>
                      <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                        {bot.modelConfig.model}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 text-right font-mono text-foreground sm:px-4">
                      {formatCount(bot.conversations)}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal px-3 2xl:table-cell sm:px-4">
                      {bot.lastPublished}
                    </TableCell>
                    <TableCell className="px-2 sm:px-3">
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

function ProviderCredentialsScreen({
  onOpenLinkedBots,
  onCredentialsChanged,
}: {
  onOpenLinkedBots: (credential: ProviderCredential) => void;
  onCredentialsChanged: () => void;
}) {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [operation, setOperation] = useState<CredentialOperation>({ type: 'create' });
  const [label, setLabel] = useState('Production OpenAI');
  const [rotateLabel, setRotateLabel] = useState('');
  const [pendingAction, setPendingAction] = useState<ProviderCredentialAction | null>(null);
  const [pendingCredentialId, setPendingCredentialId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ProviderCredential | null>(null);
  const [message, setMessage] = useState<ProviderCredentialsMessage | null>(null);

  const canUseCredentialsApi = workspaceOrganisationId.trim().length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadCredentials() {
      if (!canUseCredentialsApi) {
        setIsLoading(false);
        setMessage({
          tone: 'warning',
          text: 'Provider credentials need a configured workspace organisation id.',
        });
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const response = await fetch(
          new URL(`/organisations/${workspaceOrganisationId}/provider-credentials`, apiBaseUrl),
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const payload = providerCredentialsResponseSchema.parse(await response.json());

        if (isMounted) {
          setCredentials(payload.credentials);
        }
      } catch (error) {
        if (isMounted) {
          setMessage({
            tone: 'danger',
            text: error instanceof Error ? error.message : 'Could not load provider credentials.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCredentials();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, canUseCredentialsApi]);

  function openCreateModal() {
    setOperation({ type: 'create' });
    setLabel('Production OpenAI');
    setMessage(null);
    setIsKeyModalOpen(true);
    window.setTimeout(() => keyInputRef.current?.focus(), 0);
  }

  function openRotateModal(credential: ProviderCredential) {
    setOperation({ type: 'rotate', credential });
    setRotateLabel(credential.label);
    setMessage(null);
    setIsKeyModalOpen(true);
    window.setTimeout(() => keyInputRef.current?.focus(), 0);
  }

  function replaceCredential(nextCredential: ProviderCredential) {
    setCredentials((currentCredentials) => {
      const existingIndex = currentCredentials.findIndex(
        (credential) => credential.id === nextCredential.id,
      );

      if (existingIndex === -1) {
        return [...currentCredentials, nextCredential].toSorted((first, second) =>
          first.label.localeCompare(second.label),
        );
      }

      return currentCredentials.map((credential) =>
        credential.id === nextCredential.id ? nextCredential : credential,
      );
    });
  }

  async function upsertCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isRotating = operation.type === 'rotate';
    const nextLabel = isRotating ? rotateLabel.trim() : label.trim();
    const apiKey = keyInputRef.current?.value.trim() ?? '';

    if (!nextLabel || !apiKey) {
      setMessage({ tone: 'warning', text: 'Add a label and API key before saving.' });
      return;
    }

    setPendingAction(isRotating ? 'rotating' : 'saving');
    setPendingCredentialId(isRotating ? operation.credential.id : null);
    setMessage(null);

    try {
      const response = await fetch(
        new URL(`/organisations/${workspaceOrganisationId}/provider-credentials`, apiBaseUrl),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'openai',
            label: nextLabel,
            apiKey,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const credential = providerCredentialSchema.parse(await response.json());
      replaceCredential(credential);
      onCredentialsChanged();
      setIsKeyModalOpen(false);
      setOperation({ type: 'create' });
      setRotateLabel('');
      setLabel('Production OpenAI');
      keyInputRef.current?.form?.reset();
      setMessage({
        tone: credential.status === 'active' ? 'success' : 'warning',
        text:
          credential.status === 'active'
            ? `${credential.label} saved and validated.`
            : `${credential.label} was saved, but the key did not validate.`,
      });
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Could not save the provider credential.',
      });
    } finally {
      setPendingAction(null);
      setPendingCredentialId(null);
    }
  }

  async function validateCredential(credential: ProviderCredential) {
    setPendingAction('validating');
    setPendingCredentialId(credential.id);
    setMessage(null);

    try {
      const response = await fetch(
        new URL(
          `/organisations/${workspaceOrganisationId}/provider-credentials/${credential.id}/validate`,
          apiBaseUrl,
        ),
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const nextCredential = providerCredentialSchema.parse(await response.json());
      replaceCredential(nextCredential);
      onCredentialsChanged();
      setMessage({
        tone: nextCredential.status === 'active' ? 'success' : 'warning',
        text:
          nextCredential.status === 'active'
            ? `${nextCredential.label} validated successfully.`
            : `${nextCredential.label} is still not accepted by OpenAI.`,
      });
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Could not validate the credential.',
      });
    } finally {
      setPendingAction(null);
      setPendingCredentialId(null);
    }
  }

  async function deleteCredential() {
    if (!deleteCandidate) {
      return;
    }

    setPendingAction('deleting');
    setPendingCredentialId(deleteCandidate.id);
    setMessage(null);

    try {
      const response = await fetch(
        new URL(
          `/organisations/${workspaceOrganisationId}/provider-credentials/${deleteCandidate.id}`,
          apiBaseUrl,
        ),
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setCredentials((currentCredentials) =>
        currentCredentials.filter((credential) => credential.id !== deleteCandidate.id),
      );
      onCredentialsChanged();
      setMessage({ tone: 'success', text: `${deleteCandidate.label} was removed.` });
      setDeleteCandidate(null);
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Could not remove the credential.',
      });
    } finally {
      setPendingAction(null);
      setPendingCredentialId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            message.tone === 'success'
              ? 'border-success/40 bg-success-muted text-success'
              : message.tone === 'warning'
                ? 'border-warning/40 bg-warning-muted text-warning'
                : 'border-danger/40 bg-danger-muted text-danger'
          }`}
        >
          {message.tone === 'danger' ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      ) : null}

      <Panel>
        <PanelHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <PanelTitle>Provider keys</PanelTitle>
            <PanelDescription>
              Add model provider keys once. BotDock stores the secret encrypted and only shows safe
              metadata here.
            </PanelDescription>
          </div>
          <Button size="md" onClick={openCreateModal} disabled={!canUseCredentialsApi}>
            <Plus className="size-4" aria-hidden="true" />
            Add key
          </Button>
        </PanelHeader>
        <PanelBody className={credentials.length > 0 ? 'p-0' : undefined}>
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              Loading provider keys...
            </div>
          ) : credentials.length === 0 ? (
            <EmptyState
              title="No provider keys connected"
              description="Add an OpenAI key to make it available for bot model settings."
              action={
                <Button size="md" onClick={openCreateModal} disabled={!canUseCredentialsApi}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add key
                </Button>
              }
            />
          ) : (
            <DataTable wrapperClassName="rounded-none border-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bots</TableHead>
                  <TableHead>Last validated</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {credentials.map((credential) => {
                  const rowIsPending = pendingCredentialId === credential.id;

                  return (
                    <TableRow
                      key={credential.id}
                      className={credential.status === 'invalid' ? 'bg-danger/5' : undefined}
                    >
                      <TableCell className="text-foreground">
                        {getProviderLabel(credential.provider)}
                      </TableCell>
                      <TableCell className="text-foreground">{credential.label}</TableCell>
                      <TableCell>
                        <span className="font-mono text-foreground">
                          {credential.maskedKeyPreview}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={getProviderCredentialStatus(credential)}
                          tone={getProviderCredentialTone(credential)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="rounded-sm font-mono text-foreground underline-offset-4 transition hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => onOpenLinkedBots(credential)}
                          aria-label={`Show bots linked to ${credential.label}`}
                        >
                          {credential.linkedBotCount}
                        </button>
                      </TableCell>
                      <TableCell>{formatTimestamp(credential.lastValidatedAt)}</TableCell>
                      <TableCell>{formatTimestamp(credential.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <IconButton
                            aria-label={`Validate ${credential.label}`}
                            variant="ghost"
                            size="sm"
                            disabled={pendingAction !== null}
                            onClick={() => void validateCredential(credential)}
                          >
                            {rowIsPending && pendingAction === 'validating' ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <ShieldCheck className="size-4" aria-hidden="true" />
                            )}
                          </IconButton>
                          <IconButton
                            aria-label={`Rotate ${credential.label}`}
                            variant="ghost"
                            size="sm"
                            disabled={pendingAction !== null}
                            onClick={() => openRotateModal(credential)}
                          >
                            <RefreshCw className="size-4" aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            aria-label={`Remove ${credential.label}`}
                            variant="ghost"
                            size="sm"
                            disabled={pendingAction !== null}
                            onClick={() => setDeleteCandidate(credential)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </IconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </PanelBody>
      </Panel>

      {isKeyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <Panel className="w-full max-w-md">
            <PanelHeader>
              <PanelTitle>
                {operation.type === 'rotate' ? 'Rotate provider key' : 'Add provider key'}
              </PanelTitle>
              <PanelDescription>
                Secrets are encrypted before storage and never returned by the API.
              </PanelDescription>
            </PanelHeader>
            <PanelBody>
              <form className="grid gap-4" onSubmit={(event) => void upsertCredential(event)}>
                <Field label="Provider">
                  <select
                    className="h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-sm text-foreground shadow-surface-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55"
                    defaultValue="openai"
                    disabled
                  >
                    <option value="openai">OpenAI</option>
                  </select>
                </Field>

                <Field label="Label">
                  <TextInput
                    value={operation.type === 'rotate' ? rotateLabel : label}
                    onChange={(event) =>
                      operation.type === 'rotate'
                        ? setRotateLabel(event.target.value)
                        : setLabel(event.target.value)
                    }
                    maxLength={80}
                    placeholder="Production OpenAI"
                    autoComplete="off"
                  />
                </Field>

                <Field label="API key">
                  <div className="relative">
                    <EyeOff
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      ref={keyInputRef}
                      type="password"
                      className="h-9 w-full rounded-md border border-input bg-surface-raised px-3 pl-9 text-sm text-foreground shadow-surface-sm transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="sk-..."
                      autoComplete="off"
                    />
                  </div>
                </Field>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={() => setIsKeyModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pendingAction !== null || !canUseCredentialsApi}>
                    {pendingAction === 'saving' || pendingAction === 'rotating' ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : operation.type === 'rotate' ? (
                      <RefreshCw className="size-4" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                    {operation.type === 'rotate' ? 'Rotate key' : 'Save key'}
                  </Button>
                </div>
              </form>
            </PanelBody>
          </Panel>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <Panel className="w-full max-w-md">
            <PanelHeader>
              <PanelTitle>Remove provider key?</PanelTitle>
              <PanelDescription>
                This removes {deleteCandidate.label} from the workspace
                {deleteCandidate.linkedBotCount > 0
                  ? ` and clears it from ${deleteCandidate.linkedBotCount} linked ${
                      deleteCandidate.linkedBotCount === 1 ? 'bot' : 'bots'
                    }`
                  : ''}
                .
              </PanelDescription>
            </PanelHeader>
            <PanelBody className="grid gap-4">
              <div className="rounded-md border border-border bg-surface-raised p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Key</span>
                  <span className="font-mono text-foreground">
                    {deleteCandidate.maskedKeyPreview}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
                  <span className="text-muted-foreground">Linked bots</span>
                  <span className="font-mono text-foreground">
                    {deleteCandidate.linkedBotCount}
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => setDeleteCandidate(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => void deleteCredential()}
                >
                  {pendingAction === 'deleting' ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                  Remove key
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function CreateBotModal({
  onClose,
  onBotCreated,
  onOpenModelProviders,
}: {
  onClose: () => void;
  onBotCreated: (bot: BotRecord) => void;
  onOpenModelProviders: () => void;
}) {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<ProviderCredentialsMessage | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [providerCredentialId, setProviderCredentialId] = useState<string | null>(null);
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.35);
  const [responseLength, setResponseLength] = useState<BotResponseLength>('balanced');
  const [retrievalMode, setRetrievalMode] = useState<BotRetrievalMode>('hybrid');
  const [maxSources, setMaxSources] = useState(6);
  const [citationStyle, setCitationStyle] = useState<BotCitationStyle>('inline_source_chips');
  const activeCredentials = credentials.filter((credential) => credential.status === 'active');
  const selectedCredential =
    activeCredentials.find((credential) => credential.id === providerCredentialId) ?? null;
  const modelOptions = selectedCredential
    ? modelOptionsByProvider[selectedCredential.provider]
    : modelOptionsByProvider.openai;
  const modelSelectionDisabled = isLoadingCredentials || activeCredentials.length === 0;
  const createDisabled = isSaving || isLoadingCredentials || !name.trim();

  useEffect(() => {
    let isMounted = true;

    async function loadCredentials() {
      if (!workspaceOrganisationId.trim()) {
        setIsLoadingCredentials(false);
        setMessage({
          tone: 'warning',
          text: 'Set NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID before creating persisted bots.',
        });
        return;
      }

      try {
        const response = await fetch(
          new URL(`/organisations/${workspaceOrganisationId}/provider-credentials`, apiBaseUrl),
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const payload = providerCredentialsResponseSchema.parse(await response.json());

        if (isMounted) {
          const nextActiveCredentials = payload.credentials.filter(
            (credential) => credential.status === 'active',
          );
          setCredentials(payload.credentials);
          setProviderCredentialId(nextActiveCredentials[0]?.id ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setMessage({
            tone: 'danger',
            text: error instanceof Error ? error.message : 'Could not load provider credentials.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingCredentials(false);
        }
      }
    }

    void loadCredentials();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function createBot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceOrganisationId.trim()) {
      setMessage({ tone: 'warning', text: 'Choose a configured workspace before creating bots.' });
      return;
    }

    if (!name.trim()) {
      setMessage({ tone: 'warning', text: 'Add a bot name before creating the draft.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(new URL('/bots', apiBaseUrl), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId: workspaceOrganisationId,
          name,
          description,
          behaviorConfig: {
            ...defaultBotBehaviorConfig,
            initials: getBotInitials(name),
          },
          modelConfig: {
            providerCredentialId,
            model,
            temperature,
            responseLength,
            retrievalMode,
            maxSources,
            citationStyle,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const createdBot = botSchema.parse(await response.json());
      onBotCreated(createdBot);
      onClose();
    } catch (error) {
      setMessage({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Could not create the bot.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/80 px-3 py-4 backdrop-blur-sm sm:px-4">
      <Panel className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto">
        <PanelHeader>
          <PanelTitle>Create bot</PanelTitle>
          <PanelDescription>
            Start with an active provider key and compact model defaults.
          </PanelDescription>
        </PanelHeader>
        <PanelBody>
          <form className="grid min-w-0 gap-4" onSubmit={(event) => void createBot(event)}>
            {message ? (
              <div
                className={`flex min-w-0 items-start gap-3 rounded-md border px-3 py-2 text-sm ${
                  message.tone === 'danger'
                    ? 'border-danger/40 bg-danger-muted text-danger'
                    : 'border-warning/40 bg-warning-muted text-warning'
                }`}
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{message.text}</span>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Bot name">
                <TextInput
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Docs Assistant"
                  autoFocus
                />
              </Field>
              <Field label="Provider credential">
                <SelectInput
                  value={providerCredentialId ?? ''}
                  disabled={modelSelectionDisabled}
                  onChange={(event) => {
                    const nextCredential =
                      activeCredentials.find(
                        (credential) => credential.id === event.target.value,
                      ) ?? null;
                    setProviderCredentialId(nextCredential?.id ?? null);

                    if (nextCredential) {
                      setModel(modelOptionsByProvider[nextCredential.provider][0] ?? model);
                    }
                  }}
                >
                  <option value="">
                    {isLoadingCredentials ? 'Loading credentials...' : 'Select active credential'}
                  </option>
                  {activeCredentials.map((credential) => (
                    <option key={credential.id} value={credential.id}>
                      {getProviderLabel(credential.provider)} · {credential.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <Field label="Description">
              <TextInput
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Answers product and API questions"
              />
            </Field>

            {activeCredentials.length === 0 && !isLoadingCredentials ? (
              <div className="flex min-w-0 flex-col gap-3 rounded-md border border-warning/40 bg-warning-muted p-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 break-words">
                  Create a draft now, then add a validated provider key before publishing.
                </span>
                <Button variant="secondary" size="sm" type="button" onClick={onOpenModelProviders}>
                  <KeyRound className="size-4" aria-hidden="true" />
                  Model Providers
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Model">
                <SelectInput
                  value={model}
                  disabled={modelSelectionDisabled}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {modelOptions.map((modelOption) => (
                    <option key={modelOption} value={modelOption}>
                      {modelOption}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label={`Temperature · ${temperature.toFixed(2)}`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  disabled={modelSelectionDisabled}
                  onChange={(event) => setTemperature(Number(event.target.value))}
                  className="h-9 w-full accent-primary disabled:cursor-not-allowed disabled:opacity-55"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Response length">
                <SelectInput
                  value={responseLength}
                  onChange={(event) => setResponseLength(event.target.value as BotResponseLength)}
                >
                  {Object.entries(responseLengthLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Retrieval">
                <SelectInput
                  value={retrievalMode}
                  onChange={(event) => setRetrievalMode(event.target.value as BotRetrievalMode)}
                >
                  {Object.entries(retrievalModeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Source budget">
                <SelectInput
                  value={String(maxSources)}
                  onChange={(event) => setMaxSources(Number(event.target.value))}
                >
                  {[4, 6, 8, 10, 12].map((sourceCount) => (
                    <option key={sourceCount} value={sourceCount}>
                      {sourceCount}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <Field label="Citations">
              <SelectInput
                value={citationStyle}
                onChange={(event) => setCitationStyle(event.target.value as BotCitationStyle)}
              >
                {Object.entries(citationStyleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" type="button" disabled={isSaving} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDisabled}>
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
                Create bot
              </Button>
            </div>
          </form>
        </PanelBody>
      </Panel>
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
  const initialRoute = useMemo(getInitialDashboardRoute, []);
  const [activeItemId, setActiveItemId] = useState(initialRoute.activeItemId);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(initialRoute.selectedBotId);
  const [selectedBotTab, setSelectedBotTab] = useState<BotDetailTab>(initialRoute.selectedBotTab);
  const [selectedBotConfigurationPanel, setSelectedBotConfigurationPanel] =
    useState<BotConfigurationPanelId>(initialRoute.selectedBotConfigurationPanel);
  const [bots, setBots] = useState<BotRow[]>(botRows);
  const [botsMessage, setBotsMessage] = useState<ProviderCredentialsMessage | null>(null);
  const [botsInitialQuery, setBotsInitialQuery] = useState('');
  const [isCreateBotOpen, setIsCreateBotOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<AuthSessionUser>(fallbackUser);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const activeItem = useMemo(() => getNavItem(activeItemId), [activeItemId]);
  const selectedBot = useMemo(
    () => bots.find((bot) => bot.id === selectedBotId) ?? null,
    [bots, selectedBotId],
  );
  const ActiveIcon = activeItem.icon;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const sessionDisplayName = getDisplayName(sessionUser);
  const sessionFirstName = getFirstName(sessionUser);

  const loadBots = useCallback(async () => {
    if (!workspaceOrganisationId.trim()) {
      setBotsMessage({
        tone: 'warning',
        text: 'Set NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID to load persisted bots.',
      });
      return;
    }

    try {
      const response = await fetch(
        new URL(`/organisations/${workspaceOrganisationId}/bots`, apiBaseUrl),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = botsResponseSchema.parse(await response.json());

      setBots(payload.bots.map(toBotRow));
      setBotsMessage(null);
    } catch (error) {
      setBotsMessage({
        tone: 'warning',
        text:
          error instanceof Error
            ? `${error.message} Showing sample bots.`
            : 'Could not load persisted bots. Showing sample bots.',
      });
    }
  }, [apiBaseUrl]);

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

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  function replaceBot(updatedBot: BotRecord) {
    setBots((currentBots) => {
      const updatedRow = toBotRow(updatedBot);

      if (!currentBots.some((bot) => bot.id === updatedRow.id)) {
        return [updatedRow, ...currentBots];
      }

      return currentBots.map((bot) =>
        bot.id === updatedRow.id
          ? {
              ...bot,
              ...updatedRow,
              conversations: bot.conversations,
              knowledge: bot.knowledge,
              resolutionRate: bot.resolutionRate,
              feedbackRate: bot.feedbackRate,
              estimatedCost: bot.estimatedCost,
              errorRate: bot.errorRate,
              updatedBy: bot.updatedBy,
            }
          : bot,
      );
    });
  }

  function openModelProviders() {
    openSection('provider-keys');
    setIsCreateBotOpen(false);
  }

  function openLinkedBots(credential: ProviderCredential) {
    setBotsInitialQuery(credential.id);
    applyDashboardRoute({
      activeItemId: 'bots',
      selectedBotId: null,
      selectedBotTab: 'overview',
      selectedBotConfigurationPanel: 'identity',
    });
  }

  function applyDashboardRoute(routeState: DashboardRouteState) {
    setActiveItemId(routeState.activeItemId);
    setSelectedBotId(routeState.selectedBotId);
    setSelectedBotTab(routeState.selectedBotTab);
    setSelectedBotConfigurationPanel(routeState.selectedBotConfigurationPanel);
    writeDashboardRoute(routeState);
  }

  function openSection(sectionId: string) {
    if (sectionId === 'bots') {
      setBotsInitialQuery('');
    }

    applyDashboardRoute({
      activeItemId: sectionId,
      selectedBotId: null,
      selectedBotTab: 'overview',
      selectedBotConfigurationPanel: 'identity',
    });
  }

  function openBot(
    botId: string,
    tab: BotDetailTab = 'overview',
    configurationPanel: BotConfigurationPanelId = 'identity',
  ) {
    applyDashboardRoute({
      activeItemId: 'bots',
      selectedBotId: botId,
      selectedBotTab: tab,
      selectedBotConfigurationPanel: configurationPanel,
    });
  }

  function changeBotTab(tab: BotDetailTab) {
    setSelectedBotTab(tab);
    writeDashboardRoute({
      activeItemId: 'bots',
      selectedBotId,
      selectedBotTab: tab,
      selectedBotConfigurationPanel,
    });
  }

  function changeBotConfigurationPanel(panel: BotConfigurationPanelId) {
    setSelectedBotConfigurationPanel(panel);
    writeDashboardRoute({
      activeItemId: 'bots',
      selectedBotId,
      selectedBotTab,
      selectedBotConfigurationPanel: panel,
    });
  }

  function closeBotDetail() {
    openSection('bots');
  }

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
    openSection('settings');
    setIsUserMenuOpen(false);
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="flex min-h-screen min-w-0">
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
                          onClick={() => openSection(item.id)}
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
          <main className="min-w-0 flex-1 overflow-x-clip overflow-y-auto">
            <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 md:px-8 md:py-8">
              {selectedBot ? null : (
                <div className="mb-6 flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <ActiveIcon className="size-4 text-primary" aria-hidden="true" />
                      <span className="min-w-0 truncate">Default workspace</span>
                    </div>
                    <h1 className="break-words text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
                      {activeItemId === 'overview'
                        ? `Good afternoon, ${sessionFirstName}`
                        : activeItem.label}
                    </h1>
                    <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                      {activeItemId === 'overview'
                        ? 'Create and manage multiple bots from your account.'
                        : activeItem.description}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
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
                    <Button size="md" onClick={() => setIsCreateBotOpen(true)}>
                      <Bot className="size-4" aria-hidden="true" />
                      Create bot
                    </Button>
                    <div className="relative min-w-0">
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
                <BotDetailScreen
                  activeTab={selectedBotTab}
                  activeConfigurationPanel={selectedBotConfigurationPanel}
                  bot={selectedBot}
                  onBack={closeBotDetail}
                  onTabChange={changeBotTab}
                  onConfigurationPanelChange={changeBotConfigurationPanel}
                  onBotUpdated={replaceBot}
                  onOpenModelProviders={openModelProviders}
                />
              ) : activeItemId === 'overview' ? (
                <OverviewDashboard />
              ) : activeItemId === 'bots' ? (
                <div className="grid gap-4">
                  {botsMessage ? (
                    <div
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                        botsMessage.tone === 'danger'
                          ? 'border-danger/40 bg-danger-muted text-danger'
                          : 'border-warning/40 bg-warning-muted text-warning'
                      }`}
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{botsMessage.text}</span>
                    </div>
                  ) : null}
                  <BotsListScreen
                    bots={bots}
                    initialQuery={botsInitialQuery}
                    onCreateBot={() => setIsCreateBotOpen(true)}
                    onOpenBot={openBot}
                  />
                </div>
              ) : activeItemId === 'provider-keys' ? (
                <ProviderCredentialsScreen
                  onOpenLinkedBots={openLinkedBots}
                  onCredentialsChanged={() => void loadBots()}
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
          {isCreateBotOpen ? (
            <CreateBotModal
              onClose={() => setIsCreateBotOpen(false)}
              onBotCreated={(bot) => {
                replaceBot(bot);
                applyDashboardRoute(getCreatedBotDashboardRoute(bot.id));
              }}
              onOpenModelProviders={openModelProviders}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
