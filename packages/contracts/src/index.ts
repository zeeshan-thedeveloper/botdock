import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('botdock-api'),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const createBotSchema = z.object({
  organisationId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  modelConfig: z
    .object({
      providerCredentialId: z.string().nullable(),
      model: z.string().trim().min(1).max(120),
      temperature: z.number().min(0).max(1),
      responseLength: z.enum(['brief', 'balanced', 'detailed']),
      retrievalMode: z.enum(['hybrid', 'semantic', 'keyword']),
      maxSources: z.number().int().min(1).max(12),
      citationStyle: z.enum(['inline_source_chips', 'footer_source_list', 'hidden']),
    })
    .optional(),
  behaviorConfig: z
    .object({
      initials: z.string().trim().max(3),
      welcomeMessage: z.string().max(1000),
      instructions: z.string().max(8000),
      tone: z.string().max(120),
      handoffBehavior: z.string().max(160),
      widgetTheme: z.string().max(120),
      widgetPosition: z.string().max(80),
      strictKnowledge: z.boolean(),
      promptInjectionProtection: z.boolean(),
      piiRedaction: z.boolean(),
      collectFeedback: z.boolean(),
      humanHandoff: z.boolean(),
    })
    .optional(),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;

export const authProviderSchema = z.enum(['google', 'github']);

export type AuthProvider = z.infer<typeof authProviderSchema>;

export const authProviderStatusSchema = z.object({
  provider: authProviderSchema,
  configured: z.boolean(),
});

export type AuthProviderStatus = z.infer<typeof authProviderStatusSchema>;

export const authProvidersResponseSchema = z.object({
  providers: z.array(authProviderStatusSchema),
});

export type AuthProvidersResponse = z.infer<typeof authProvidersResponseSchema>;

export const authSessionUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});

export type AuthSessionUser = z.infer<typeof authSessionUserSchema>;

export const authSessionResponseSchema = z.object({
  user: authSessionUserSchema.nullable(),
});

export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

export const oauthStartResponseSchema = z.object({
  provider: authProviderSchema,
  state: z.string(),
  authorizationUrl: z.string().url().nullable(),
  status: z.enum(['ready', 'provider_not_configured', 'provider_not_implemented']),
});

export type OAuthStartResponse = z.infer<typeof oauthStartResponseSchema>;

export const modelProviderSchema = z.enum(['openai']);

export type ModelProvider = z.infer<typeof modelProviderSchema>;

export const providerCredentialStatusSchema = z.enum(['active', 'invalid']);

export type ProviderCredentialStatus = z.infer<typeof providerCredentialStatusSchema>;

export const providerCredentialSchema = z.object({
  id: z.string(),
  provider: modelProviderSchema,
  label: z.string(),
  maskedKeyPreview: z.string(),
  last4: z.string(),
  status: providerCredentialStatusSchema,
  linkedBotCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastValidatedAt: z.string().datetime().nullable(),
});

export type ProviderCredential = z.infer<typeof providerCredentialSchema>;

export const providerCredentialsResponseSchema = z.object({
  credentials: z.array(providerCredentialSchema),
});

export type ProviderCredentialsResponse = z.infer<typeof providerCredentialsResponseSchema>;

export const upsertProviderCredentialSchema = z.object({
  provider: modelProviderSchema,
  label: z.string().trim().min(1).max(80),
  apiKey: z.string().trim().min(1),
});

export type UpsertProviderCredentialInput = z.infer<typeof upsertProviderCredentialSchema>;

export const botStatusSchema = z.enum(['draft', 'published', 'archived']);

export type BotStatus = z.infer<typeof botStatusSchema>;

export const botResponseLengthSchema = z.enum(['brief', 'balanced', 'detailed']);

export type BotResponseLength = z.infer<typeof botResponseLengthSchema>;

export const botRetrievalModeSchema = z.enum(['hybrid', 'semantic', 'keyword']);

export type BotRetrievalMode = z.infer<typeof botRetrievalModeSchema>;

export const botCitationStyleSchema = z.enum([
  'inline_source_chips',
  'footer_source_list',
  'hidden',
]);

export type BotCitationStyle = z.infer<typeof botCitationStyleSchema>;

export const botModelConfigSchema = z.object({
  providerCredentialId: z.string().nullable(),
  provider: modelProviderSchema.nullable(),
  credentialLabel: z.string().nullable(),
  model: z.string().min(1).max(120),
  temperature: z.number().min(0).max(1),
  responseLength: botResponseLengthSchema,
  retrievalMode: botRetrievalModeSchema,
  maxSources: z.number().int().min(1).max(12),
  citationStyle: botCitationStyleSchema,
});

export type BotModelConfig = z.infer<typeof botModelConfigSchema>;

export const botBehaviorConfigSchema = z.object({
  initials: z.string().trim().max(3),
  welcomeMessage: z.string().max(1000),
  instructions: z.string().max(8000),
  tone: z.string().max(120),
  handoffBehavior: z.string().max(160),
  widgetTheme: z.string().max(120),
  widgetPosition: z.string().max(80),
  strictKnowledge: z.boolean(),
  promptInjectionProtection: z.boolean(),
  piiRedaction: z.boolean(),
  collectFeedback: z.boolean(),
  humanHandoff: z.boolean(),
});

export type BotBehaviorConfig = z.infer<typeof botBehaviorConfigSchema>;

export const botSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: botStatusSchema,
  modelConfig: botModelConfigSchema,
  behaviorConfig: botBehaviorConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Bot = z.infer<typeof botSchema>;

export const botsResponseSchema = z.object({
  bots: z.array(botSchema),
});

export type BotsResponse = z.infer<typeof botsResponseSchema>;

export const updateBotSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  behaviorConfig: botBehaviorConfigSchema.optional(),
  modelConfig: z
    .object({
      providerCredentialId: z.string().nullable(),
      model: z.string().trim().min(1).max(120),
      temperature: z.number().min(0).max(1),
      responseLength: botResponseLengthSchema,
      retrievalMode: botRetrievalModeSchema,
      maxSources: z.number().int().min(1).max(12),
      citationStyle: botCitationStyleSchema,
    })
    .optional(),
});

export type UpdateBotInput = z.infer<typeof updateBotSchema>;

export const knowledgeSourceTypeSchema = z.enum(['file', 'text', 'faq']);

export type KnowledgeSourceType = z.infer<typeof knowledgeSourceTypeSchema>;

export const knowledgeSourceStatusSchema = z.enum(['processing', 'ready', 'failed']);

export type KnowledgeSourceStatus = z.infer<typeof knowledgeSourceStatusSchema>;

export const knowledgeSourceSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  botId: z.string(),
  type: knowledgeSourceTypeSchema,
  name: z.string(),
  status: knowledgeSourceStatusSchema,
  embeddingProvider: modelProviderSchema,
  embeddingModel: z.string(),
  chunkCount: z.number().int().min(0),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

export const knowledgeSourcesResponseSchema = z.object({
  sources: z.array(knowledgeSourceSchema),
});

export type KnowledgeSourcesResponse = z.infer<typeof knowledgeSourcesResponseSchema>;

export const createKnowledgeSourceSchema = z.object({
  type: knowledgeSourceTypeSchema,
  name: z.string().trim().min(1).max(160),
  content: z.string().max(200_000).optional(),
});

export type CreateKnowledgeSourceInput = z.infer<typeof createKnowledgeSourceSchema>;

export const chatConversationSourceSchema = z.enum(['PLAYGROUND', 'WIDGET', 'API']);

export type ChatConversationSource = z.infer<typeof chatConversationSourceSchema>;

export const chatCitationSourceSchema = z.object({
  label: z.string(),
  location: z.string().nullable(),
  score: z.number(),
  knowledgeSourceId: z.string().nullable(),
});

export type ChatCitationSource = z.infer<typeof chatCitationSourceSchema>;

export const chatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('token'), delta: z.string() }),
  z.object({ type: z.literal('citation'), sources: z.array(chatCitationSourceSchema) }),
  z.object({
    type: z.literal('trace'),
    requestId: z.string(),
    model: z.string(),
    contextTokens: z.number().int().min(0),
    retrievedChunks: z.array(z.object({ label: z.string(), score: z.number() })),
    promptPreview: z.string(),
  }),
  z.object({
    type: z.literal('usage'),
    promptTokens: z.number().int().min(0),
    completionTokens: z.number().int().min(0),
    latencyMs: z.number().min(0),
    estCostUsd: z.number().min(0),
  }),
  z.object({ type: z.literal('done'), conversationId: z.string(), messageId: z.string() }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export const playgroundMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1).max(8000),
});

export type PlaygroundMessageInput = z.infer<typeof playgroundMessageSchema>;

export const allowedDomainSchema = z.object({
  id: z.string(),
  botId: z.string(),
  pattern: z.string(),
  createdAt: z.string().datetime(),
});

export type AllowedDomain = z.infer<typeof allowedDomainSchema>;

export const allowedDomainsResponseSchema = z.object({
  domains: z.array(allowedDomainSchema),
});

export type AllowedDomainsResponse = z.infer<typeof allowedDomainsResponseSchema>;

export const createAllowedDomainSchema = z.object({
  pattern: z.string().trim().min(1).max(253),
});

export type CreateAllowedDomainInput = z.infer<typeof createAllowedDomainSchema>;

export const deploymentStatusSchema = z.enum(['active', 'disabled']);

export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;

export const deploymentInfoSchema = z.object({
  deploymentId: z.string().nullable(),
  environment: z.literal('production'),
  status: deploymentStatusSchema.nullable(),
  currentVersionNumber: z.number().int().nullable(),
  publishedAt: z.string().datetime().nullable(),
  embedSnippet: z.string().nullable(),
});

export type DeploymentInfo = z.infer<typeof deploymentInfoSchema>;

export const widgetMessageSchema = z.object({
  conversationId: z.string().optional(),
  visitorId: z.string().max(200).optional(),
  message: z.string().trim().min(1).max(8000),
});

export type WidgetMessageInput = z.infer<typeof widgetMessageSchema>;

export const messageRoleSchema = z.enum(['SYSTEM', 'USER', 'ASSISTANT']);

export type MessageRole = z.infer<typeof messageRoleSchema>;

export const conversationUsageSummarySchema = z.object({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  estCostUsd: z.number().min(0),
});

export type ConversationUsageSummary = z.infer<typeof conversationUsageSummarySchema>;

export const conversationSummarySchema = z.object({
  id: z.string(),
  botId: z.string(),
  botName: z.string(),
  source: chatConversationSourceSchema,
  visitorId: z.string().nullable(),
  messageCount: z.number().int().min(0),
  lastMessagePreview: z.string().nullable(),
  lastMessageAt: z.string().datetime(),
  usage: conversationUsageSummarySchema,
});

export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationsListResponseSchema = z.object({
  conversations: z.array(conversationSummarySchema),
  nextCursor: z.string().nullable(),
});

export type ConversationsListResponse = z.infer<typeof conversationsListResponseSchema>;

export const conversationMessageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime(),
  model: z.string().nullable(),
  promptTokens: z.number().int().min(0).nullable(),
  completionTokens: z.number().int().min(0).nullable(),
  latencyMs: z.number().min(0).nullable(),
  estCostUsd: z.number().min(0).nullable(),
  citations: z.array(chatCitationSourceSchema),
});

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const conversationDetailResponseSchema = z.object({
  id: z.string(),
  botId: z.string(),
  botName: z.string(),
  source: chatConversationSourceSchema,
  visitorId: z.string().nullable(),
  startedAt: z.string().datetime(),
  lastMessageAt: z.string().datetime(),
  messages: z.array(conversationMessageSchema),
});

export type ConversationDetailResponse = z.infer<typeof conversationDetailResponseSchema>;
