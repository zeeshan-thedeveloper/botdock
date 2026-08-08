import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  areBotConfigurationsEqual,
  getCreatedBotDashboardRoute,
  getInitialDashboardRoute,
  getBotSearchText,
  writeDashboardRoute,
} from './app-shell';

describe('dashboard route state', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores bot detail, tab, and configuration panel from the URL', () => {
    vi.stubGlobal('window', {
      location: { search: '?section=bots&bot=bot-123&tab=configuration&config=safety' },
      history: { replaceState: vi.fn() },
    });

    expect(getInitialDashboardRoute()).toEqual({
      activeItemId: 'bots',
      selectedBotId: 'bot-123',
      selectedBotTab: 'configuration',
      selectedBotConfigurationPanel: 'safety',
    });
  });

  it('writes compact bot configuration routes and omits default state', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { search: '' },
      history: { replaceState },
    });

    writeDashboardRoute({
      activeItemId: 'bots',
      selectedBotId: 'bot-123',
      selectedBotTab: 'configuration',
      selectedBotConfigurationPanel: 'conversation',
    });

    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/?section=bots&bot=bot-123&tab=configuration&config=conversation',
    );

    writeDashboardRoute({
      activeItemId: 'bots',
      selectedBotId: 'bot-123',
      selectedBotTab: 'configuration',
      selectedBotConfigurationPanel: 'identity',
    });

    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/?section=bots&bot=bot-123&tab=configuration',
    );
  });

  it('does not persist configuration panel state outside the configuration tab', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { search: '' },
      history: { replaceState },
    });

    writeDashboardRoute({
      activeItemId: 'bots',
      selectedBotId: 'bot-123',
      selectedBotTab: 'knowledge',
      selectedBotConfigurationPanel: 'safety',
    });

    expect(replaceState).toHaveBeenCalledWith(null, '', '/?section=bots&bot=bot-123&tab=knowledge');
  });

  it('opens newly created bots directly in configuration with a clean default panel', () => {
    const routeState = getCreatedBotDashboardRoute('bot-created-123');

    expect(routeState).toEqual({
      activeItemId: 'bots',
      selectedBotId: 'bot-created-123',
      selectedBotTab: 'configuration',
      selectedBotConfigurationPanel: 'identity',
    });
  });
});

describe('bot configuration dirty state', () => {
  const baseConfiguration = {
    name: 'Support Bot',
    description: 'Handles support questions',
    initials: 'SB',
    welcomeMessage: 'Hi there',
    instructions: 'Answer from sources.',
    tone: 'Friendly, precise, and calm',
    handoffBehavior: 'Escalate after low-confidence answer',
    providerCredentialId: null,
    model: 'gpt-4o-mini',
    temperature: 0.35,
    retrievalMode: 'hybrid',
    maxSources: 6,
    responseLength: 'balanced',
    citationStyle: 'inline_source_chips',
    widgetTheme: 'Dark system default',
    widgetPosition: 'Bottom right',
    strictKnowledge: true,
    promptInjectionProtection: true,
    piiRedaction: true,
    collectFeedback: true,
    humanHandoff: true,
  } as const;

  it('treats restored draft values as clean and changed draft values as dirty', () => {
    expect(areBotConfigurationsEqual(baseConfiguration, { ...baseConfiguration })).toBe(true);
    expect(
      areBotConfigurationsEqual(baseConfiguration, {
        ...baseConfiguration,
        welcomeMessage: 'Updated greeting',
      }),
    ).toBe(false);
  });
});

describe('bot inventory search metadata', () => {
  it('includes model credential metadata so provider-key shortcuts can filter linked bots', () => {
    const searchText = getBotSearchText({
      id: 'bot-123',
      name: 'Support Bot',
      description: 'Handles support questions',
      initials: 'SB',
      status: 'Draft',
      behaviorConfig: {
        initials: 'SB',
        welcomeMessage: 'Hi there',
        instructions: 'Answer from sources.',
        tone: 'Friendly, precise, and calm',
        handoffBehavior: 'Escalate after low-confidence answer',
        widgetTheme: 'Dark system default',
        widgetPosition: 'Bottom right',
        strictKnowledge: true,
        promptInjectionProtection: true,
        piiRedaction: true,
        collectFeedback: true,
        humanHandoff: true,
      },
      modelConfig: {
        providerCredentialId: 'credential-openai-production',
        provider: 'openai',
        credentialLabel: 'Production OpenAI',
        model: 'gpt-4o-mini',
        temperature: 0.35,
        retrievalMode: 'hybrid',
        maxSources: 6,
        responseLength: 'balanced',
        citationStyle: 'inline_source_chips',
      },
      environment: 'Draft',
      stats: {
        conversationCount: 0,
        messageCount: 0,
        estCostUsd: 0,
        knowledgeSourceCount: 0,
        readyKnowledgeSourceCount: 0,
        totalIndexedChunks: 0,
        allowedDomainCount: 0,
        citationCoverage: null,
        positiveFeedbackRate: null,
      },
      version: 'Draft',
      lastPublished: 'Not published',
      updatedBy: 'Workspace',
      updatedAt: '1m ago',
    });

    expect(searchText).toContain('credential-openai-production');
    expect(searchText).toContain('production openai');
    expect(searchText).toContain('gpt-4o-mini');
  });
});
