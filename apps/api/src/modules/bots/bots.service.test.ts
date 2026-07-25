import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BotsService } from './bots.service.js';

const now = new Date('2026-07-19T10:00:00.000Z');

function createPrismaMock() {
  return {
    bot: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    organisationMember: {
      findUnique: vi.fn(),
    },
    providerCredential: {
      findFirst: vi.fn(),
    },
  };
}

describe('BotsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: BotsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new BotsService(prisma as never);
  });

  it('lists bots with model configuration and active credential metadata', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findMany.mockResolvedValue([
      {
        id: 'bot-1',
        organisationId: 'org-1',
        name: 'Docs Assistant',
        description: 'Answers docs questions',
        status: 'DRAFT',
        initials: 'DA',
        welcomeMessage: 'Welcome to docs support.',
        instructions: 'Answer from docs only.',
        tone: 'Concise and technical',
        handoffBehavior: 'Escalate after low-confidence answer',
        providerCredentialId: 'credential-1',
        model: 'gpt-4o-mini',
        temperature: 0.25,
        responseLength: 'brief',
        retrievalMode: 'semantic',
        maxSources: 4,
        citationStyle: 'footer_source_list',
        widgetTheme: 'Dark system default',
        widgetPosition: 'Bottom right',
        strictKnowledge: true,
        promptInjectionProtection: true,
        piiRedaction: true,
        collectFeedback: true,
        humanHandoff: false,
        createdAt: now,
        updatedAt: now,
        providerCredential: {
          provider: 'OPENAI',
          label: 'Production OpenAI',
          status: 'ACTIVE',
        },
      },
    ]);

    await expect(service.listBots('org-1', 'user-1')).resolves.toEqual({
      bots: [
        {
          id: 'bot-1',
          organisationId: 'org-1',
          name: 'Docs Assistant',
          description: 'Answers docs questions',
          status: 'draft',
          behaviorConfig: {
            initials: 'DA',
            welcomeMessage: 'Welcome to docs support.',
            instructions: 'Answer from docs only.',
            tone: 'Concise and technical',
            handoffBehavior: 'Escalate after low-confidence answer',
            widgetTheme: 'Dark system default',
            widgetPosition: 'Bottom right',
            strictKnowledge: true,
            promptInjectionProtection: true,
            piiRedaction: true,
            collectFeedback: true,
            humanHandoff: false,
          },
          modelConfig: {
            providerCredentialId: 'credential-1',
            provider: 'openai',
            credentialLabel: 'Production OpenAI',
            model: 'gpt-4o-mini',
            temperature: 0.25,
            responseLength: 'brief',
            retrievalMode: 'semantic',
            maxSources: 4,
            citationStyle: 'footer_source_list',
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
    });
  });

  it('rejects bot model configuration that references a missing or inactive credential', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.providerCredential.findFirst.mockResolvedValue(null);

    await expect(
      service.updateBot('org-1', 'user-1', 'bot-1', {
        modelConfig: {
          providerCredentialId: 'credential-2',
          model: 'gpt-4o',
          temperature: 0.4,
          responseLength: 'balanced',
          retrievalMode: 'hybrid',
          maxSources: 6,
          citationStyle: 'inline_source_chips',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bot.update).not.toHaveBeenCalled();
  });

  it('creates bots with an active provider credential model configuration', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.providerCredential.findFirst.mockResolvedValue({ id: 'credential-1' });
    prisma.bot.create.mockResolvedValue({
      id: 'bot-1',
      organisationId: 'org-1',
      name: 'Sales Assistant',
      description: 'Answers sales questions',
      status: 'DRAFT',
      initials: 'SA',
      welcomeMessage: 'Welcome.',
      instructions: 'Answer from sales docs.',
      tone: 'Friendly, precise, and calm',
      handoffBehavior: 'Escalate after low-confidence answer',
      providerCredentialId: 'credential-1',
      model: 'gpt-4o',
      temperature: 0.45,
      responseLength: 'balanced',
      retrievalMode: 'hybrid',
      maxSources: 8,
      citationStyle: 'inline_source_chips',
      widgetTheme: 'Dark system default',
      widgetPosition: 'Bottom right',
      strictKnowledge: true,
      promptInjectionProtection: true,
      piiRedaction: true,
      collectFeedback: true,
      humanHandoff: true,
      createdAt: now,
      updatedAt: now,
      providerCredential: {
        provider: 'OPENAI',
        label: 'Production OpenAI',
        status: 'ACTIVE',
      },
    });

    const result = await service.createBot('user-1', {
      organisationId: ' org-1 ',
      name: ' Sales Assistant ',
      description: ' Answers sales questions ',
      modelConfig: {
        providerCredentialId: 'credential-1',
        model: ' gpt-4o ',
        temperature: 0.45,
        responseLength: 'balanced',
        retrievalMode: 'hybrid',
        maxSources: 8,
        citationStyle: 'inline_source_chips',
      },
      behaviorConfig: {
        initials: 'sa',
        welcomeMessage: 'Welcome.',
        instructions: 'Answer from sales docs.',
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
    });

    expect(prisma.providerCredential.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'credential-1',
          organisationId: 'org-1',
          status: 'ACTIVE',
        },
      }),
    );
    expect(prisma.bot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationId: 'org-1',
          name: 'Sales Assistant',
          description: 'Answers sales questions',
          providerCredentialId: 'credential-1',
          model: 'gpt-4o',
          temperature: 0.45,
          maxSources: 8,
          initials: 'SA',
        }),
      }),
    );
    expect(result.modelConfig).toMatchObject({
      providerCredentialId: 'credential-1',
      provider: 'openai',
      credentialLabel: 'Production OpenAI',
      model: 'gpt-4o',
    });
  });

  it('updates persisted bot behavior configuration such as instructions', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.bot.update.mockResolvedValue({
      id: 'bot-1',
      organisationId: 'org-1',
      name: 'Docs Assistant',
      description: 'Answers docs questions',
      status: 'DRAFT',
      initials: 'DA',
      welcomeMessage: 'Welcome.',
      instructions: 'New saved instructions.',
      tone: 'Concise and technical',
      handoffBehavior: 'Never escalate automatically',
      providerCredentialId: null,
      model: 'gpt-4o-mini',
      temperature: 0.35,
      responseLength: 'balanced',
      retrievalMode: 'hybrid',
      maxSources: 6,
      citationStyle: 'inline_source_chips',
      widgetTheme: 'Match visitor preference',
      widgetPosition: 'Inline embed',
      strictKnowledge: false,
      promptInjectionProtection: true,
      piiRedaction: false,
      collectFeedback: true,
      humanHandoff: true,
      createdAt: now,
      updatedAt: now,
      providerCredential: null,
    });

    const result = await service.updateBot('org-1', 'user-1', 'bot-1', {
      behaviorConfig: {
        initials: 'DA',
        welcomeMessage: 'Welcome.',
        instructions: 'New saved instructions.',
        tone: 'Concise and technical',
        handoffBehavior: 'Never escalate automatically',
        widgetTheme: 'Match visitor preference',
        widgetPosition: 'Inline embed',
        strictKnowledge: false,
        promptInjectionProtection: true,
        piiRedaction: false,
        collectFeedback: true,
        humanHandoff: true,
      },
    });

    expect(prisma.bot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instructions: 'New saved instructions.',
          strictKnowledge: false,
          widgetPosition: 'Inline embed',
        }),
      }),
    );
    expect(result.behaviorConfig.instructions).toBe('New saved instructions.');
  });

  it('persists the complete draft configuration returned after save', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.bot.findFirst.mockResolvedValue({ id: 'bot-1' });
    prisma.providerCredential.findFirst.mockResolvedValue({ id: 'credential-1' });
    prisma.bot.update.mockResolvedValue({
      id: 'bot-1',
      organisationId: 'org-1',
      name: 'Launch Assistant',
      description: 'Handles launch questions',
      status: 'DRAFT',
      initials: 'LA',
      welcomeMessage: 'Welcome to launch support.',
      instructions: 'Use the launch runbook and cite sources.',
      tone: 'Warm and consultative',
      handoffBehavior: 'Escalate before policy exceptions',
      providerCredentialId: 'credential-1',
      model: 'gpt-4o',
      temperature: 0.55,
      responseLength: 'detailed',
      retrievalMode: 'keyword',
      maxSources: 10,
      citationStyle: 'hidden',
      widgetTheme: 'Light system default',
      widgetPosition: 'Bottom left',
      strictKnowledge: false,
      promptInjectionProtection: false,
      piiRedaction: true,
      collectFeedback: false,
      humanHandoff: true,
      createdAt: now,
      updatedAt: now,
      providerCredential: {
        provider: 'OPENAI',
        label: 'Production OpenAI',
        status: 'ACTIVE',
      },
    });

    const result = await service.updateBot('org-1', 'user-1', 'bot-1', {
      name: ' Launch Assistant ',
      description: ' Handles launch questions ',
      behaviorConfig: {
        initials: 'la',
        welcomeMessage: 'Welcome to launch support.',
        instructions: 'Use the launch runbook and cite sources.',
        tone: 'Warm and consultative',
        handoffBehavior: 'Escalate before policy exceptions',
        widgetTheme: 'Light system default',
        widgetPosition: 'Bottom left',
        strictKnowledge: false,
        promptInjectionProtection: false,
        piiRedaction: true,
        collectFeedback: false,
        humanHandoff: true,
      },
      modelConfig: {
        providerCredentialId: 'credential-1',
        model: ' gpt-4o ',
        temperature: 0.55,
        responseLength: 'detailed',
        retrievalMode: 'keyword',
        maxSources: 10,
        citationStyle: 'hidden',
      },
    });

    expect(prisma.bot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Launch Assistant',
          description: 'Handles launch questions',
          initials: 'LA',
          model: 'gpt-4o',
          temperature: 0.55,
          responseLength: 'detailed',
          retrievalMode: 'keyword',
          maxSources: 10,
          citationStyle: 'hidden',
          widgetTheme: 'Light system default',
          widgetPosition: 'Bottom left',
          collectFeedback: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      name: 'Launch Assistant',
      description: 'Handles launch questions',
      status: 'draft',
      behaviorConfig: {
        initials: 'LA',
        widgetPosition: 'Bottom left',
        collectFeedback: false,
      },
      modelConfig: {
        providerCredentialId: 'credential-1',
        provider: 'openai',
        credentialLabel: 'Production OpenAI',
        model: 'gpt-4o',
        responseLength: 'detailed',
        retrievalMode: 'keyword',
        maxSources: 10,
        citationStyle: 'hidden',
      },
    });
  });

  it('blocks list access when the user is not an organisation member', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue(null);

    await expect(service.listBots('org-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.bot.findMany).not.toHaveBeenCalled();
  });
});
