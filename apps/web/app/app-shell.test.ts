import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  areBotConfigurationsEqual,
  getInitialDashboardRoute,
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
