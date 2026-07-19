import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInitialDashboardRoute, writeDashboardRoute } from './app-shell';

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
});
